import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { currentSigner, relyingParty } from '../../../../../lib/webauthn';
import { db } from '../../../../../lib/db';
import { getPdf } from '../../../../../lib/r2';
import { makeEvidence, sealEvidence, sha256 } from '../../../../../lib/evidence';
export const runtime = 'nodejs';
const consent = 'Declaro que li o documento selecionado e concordo em registrar minha assinatura eletrônica e as evidências desta operação.';
export async function POST(request: Request) {
 const signer = await currentSigner();
 if (!signer) return NextResponse.json({error:'authentication_required'}, {status:401});
 let rp: ReturnType<typeof relyingParty>;
 try { rp = relyingParty(); } catch { return NextResponse.json({error:'webauthn_unavailable'}, {status:503}); }
 if (request.headers.get('origin') !== rp.origin) return NextResponse.json({error:'invalid_origin'}, {status:403});
 let body: {intentId?:string; response?:any};
 try { body = await request.json(); } catch { return NextResponse.json({error:'invalid_request'}, {status:400}); }
 if (typeof body.intentId !== 'string' || typeof body.response?.id !== 'string') return NextResponse.json({error:'invalid_request'}, {status:400});
 try {
  const client = db(), now = new Date().toISOString();
  const result = await client.execute({sql:"SELECT * FROM signing_intents WHERE id = ? AND signer_id = ? AND signer_email = ? AND status = 'pending' AND consumed_at IS NULL AND expires_at > ?",args:[body.intentId,signer.id,signer.email,now]});
  const intent = result.rows[0];
  if (!intent) return NextResponse.json({error:'intent_expired'}, {status:409});
  const challenges = await client.execute({sql:"SELECT * FROM webauthn_challenges WHERE id = ? AND signer_id = ? AND purpose = 'sign' AND consumed_at IS NULL AND expires_at > ?",args:[body.intentId,signer.id,now]});
  const challenge = challenges.rows[0];
  if (!challenge || challenge.document_sha256 !== intent.document_sha256 || challenge.consent_sha256 !== intent.consent_sha256) return NextResponse.json({error:'challenge_invalid'}, {status:409});
  const creds = await client.execute({sql:'SELECT * FROM webauthn_credentials WHERE credential_id = ? AND signer_id = ?',args:[body.response.id,signer.id]});
  const credential = creds.rows[0];
  if (!credential) return NextResponse.json({error:'credential_unknown'}, {status:403});
  const consumed = await client.execute({sql:"UPDATE webauthn_challenges SET consumed_at = ? WHERE id = ? AND signer_id = ? AND consumed_at IS NULL AND expires_at > ? RETURNING id",args:[now,body.intentId,signer.id,now]});
  if (!consumed.rows.length) return NextResponse.json({error:'challenge_used'}, {status:409});
  const verified = await verifyAuthenticationResponse({
   response: body.response, expectedChallenge: String(challenge.challenge),
   expectedOrigin: rp.origin, expectedRPID: rp.rpID, requireUserVerification:true,
   authenticator: {
    credentialID: Buffer.from(String(credential.credential_id),'base64url'),
    credentialPublicKey: new Uint8Array(credential.public_key as Uint8Array),
    counter: Number(credential.counter),
    transports: JSON.parse(String(credential.transports_json))
   }
  });
  if (!verified.verified) return NextResponse.json({error:'verification_failed'}, {status:403});
  const pdf = await getPdf(String(intent.object_key));
  if (sha256(pdf) !== intent.document_sha256 || sha256(new TextEncoder().encode(consent)) !== intent.consent_sha256) return NextResponse.json({error:'integrity_failed'}, {status:422});
  const evidence = makeEvidence({documentSha256:String(intent.document_sha256),signerId:signer.id,signerEmail:signer.email,consentText:consent,consentAt:now});
  const batch = await client.batch([
   {sql:"UPDATE signing_intents SET status = 'completed', consumed_at = ?, document_id = ? WHERE id = ? AND signer_id = ? AND status = 'pending' AND consumed_at IS NULL AND expires_at > ? RETURNING id",args:[now,evidence.id,body.intentId,signer.id,now]},
   {sql:"INSERT INTO documents (id,sha256,object_key,signer_id,signer_email,consent_text,consent_at,created_at,evidence_json,evidence_mac,status) SELECT ?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM signing_intents WHERE id = ? AND document_id = ? AND status = 'completed')",args:[evidence.id,evidence.documentSha256,String(intent.object_key),signer.id,signer.email,consent,now,evidence.createdAt,JSON.stringify(evidence),sealEvidence(evidence),'signed',body.intentId,evidence.id]},
   {sql:"INSERT INTO audit_events (id,document_id,event_type,actor_id,created_at,details_json) SELECT ?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM documents WHERE id = ?)",args:[randomUUID(),evidence.id,'signed_webauthn',signer.id,now,JSON.stringify({intentId:body.intentId,credentialId:String(credential.credential_id),challengeId:body.intentId,documentSha256:evidence.documentSha256,consentSha256:String(intent.consent_sha256),counter:verified.authenticationInfo.newCounter}),evidence.id]},
   {sql:'UPDATE webauthn_credentials SET counter = ?, last_used_at = ? WHERE credential_id = ? AND signer_id = ?',args:[verified.authenticationInfo.newCounter,now,String(credential.credential_id),signer.id]}
  ],'write');
  if (batch[0].rows.length !== 1 || Number(batch[1].rowsAffected) !== 1 || Number(batch[2].rowsAffected) !== 1) return NextResponse.json({error:'signing_conflict'}, {status:409});
  return NextResponse.json({id:evidence.id,sha256:evidence.documentSha256,verifyUrl:'/verify/'+evidence.id},{status:201,headers:{'Cache-Control':'no-store'}});
 } catch { return NextResponse.json({error:'signing_unavailable'}, {status:503}); }
}

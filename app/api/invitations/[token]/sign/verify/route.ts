import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { currentSigner, relyingParty } from '../../../../../../lib/webauthn';
import { db } from '../../../../../../lib/db';
import { getPdf } from '../../../../../../lib/r2';
import { makeEvidence, sealEvidence, sha256 } from '../../../../../../lib/evidence';
export const runtime = 'nodejs';
const consent = 'Declaro que li o documento selecionado e concordo em registrar minha assinatura eletrônica e as evidências desta operação.';
export async function POST(request: Request, {params}:{params:Promise<{token:string}>}) {
 const {token}=await params;
 if(!/^[A-Za-z0-9_-]{43}$/.test(token))return NextResponse.json({error:'invalid_invitation'},{status:404});
 const signer = await currentSigner();
 if (!signer) return NextResponse.json({error:'authentication_required'}, {status:401});
 let rp: ReturnType<typeof relyingParty>;
 try { rp = relyingParty(); } catch { return NextResponse.json({error:'webauthn_unavailable'}, {status:503}); }
 if (request.headers.get('origin') !== rp.origin) return NextResponse.json({error:'invalid_origin'}, {status:403});
 let body: {response?:any};
 try { body = await request.json(); } catch { return NextResponse.json({error:'invalid_request'}, {status:400}); }
 if (typeof body.response?.id !== 'string') return NextResponse.json({error:'invalid_request'}, {status:400});
 try {
  const client = db(), now = new Date().toISOString();
  const result=await client.execute({sql:"SELECT r.id AS recipient_id,r.email,r.expires_at,r.status,r.envelope_id,e.object_key,e.document_sha256,e.status AS envelope_status FROM envelope_recipients r JOIN signing_envelopes e ON e.id=r.envelope_id WHERE r.token_sha256=? LIMIT 1",args:[sha256(new TextEncoder().encode(token))]});
  const invite=result.rows[0];
  if(!invite||invite.status!=='pending'||invite.envelope_status!=='pending'||String(invite.expires_at)<=now)return NextResponse.json({error:'invitation_unavailable'},{status:409});
  if(String(invite.email).toLowerCase()!==signer.email.toLowerCase())return NextResponse.json({error:'recipient_mismatch'},{status:403});
  const challenges=await client.execute({sql:"SELECT * FROM webauthn_challenges WHERE id=? AND signer_id=? AND purpose='sign' AND consumed_at IS NULL AND expires_at>?",args:[String(invite.recipient_id),signer.id,now]});
  const challenge=challenges.rows[0];
  const consentSha256=sha256(new TextEncoder().encode(consent));
  if(!challenge||challenge.document_sha256!==invite.document_sha256||challenge.consent_sha256!==consentSha256)return NextResponse.json({error:'challenge_invalid'},{status:409});
  const creds = await client.execute({sql:'SELECT * FROM webauthn_credentials WHERE credential_id = ? AND signer_id = ?',args:[body.response.id,signer.id]});
  const credential = creds.rows[0];
  if (!credential) return NextResponse.json({error:'credential_unknown'}, {status:403});
  const consumed = await client.execute({sql:"UPDATE webauthn_challenges SET consumed_at = ? WHERE id = ? AND signer_id = ? AND consumed_at IS NULL AND expires_at > ? RETURNING id",args:[now,String(invite.recipient_id),signer.id,now]});
  if (!consumed.rows.length) return NextResponse.json({error:'challenge_used'}, {status:409});
  const verified = await verifyAuthenticationResponse({
   response: body.response, expectedChallenge: String(challenge.challenge),
   expectedOrigin: rp.origin, expectedRPID: rp.rpID, requireUserVerification:true,
   authenticator: {
    credentialID: Buffer.from(String(credential.credential_id),'base64url'),
    credentialPublicKey: new Uint8Array(credential.public_key as ArrayBuffer),
    counter: Number(credential.counter),
    transports: JSON.parse(String(credential.transports_json))
   }
  });
  if (!verified.verified) return NextResponse.json({error:'verification_failed'}, {status:403});
  const pdf = await getPdf(String(invite.object_key));
  if (sha256(pdf) !== invite.document_sha256 || sha256(new TextEncoder().encode(consent)) !== consentSha256) return NextResponse.json({error:'integrity_failed'}, {status:422});
  const evidence = makeEvidence({documentSha256:String(invite.document_sha256),signerId:signer.id,signerEmail:signer.email,consentText:consent,consentAt:now});
  // Seal the assertion transcript together with the PDF and consent.
  evidence.version = 2;
  evidence.webauthn = {
   intentId: String(invite.recipient_id),
   credentialId: String(credential.credential_id),
   challenge: String(challenge.challenge),
   assertionSha256: sha256(new TextEncoder().encode(JSON.stringify(body.response))),
   consentSha256: String(consentSha256),
   rpId: rp.rpID, origin: rp.origin, counter: verified.authenticationInfo.newCounter
  };
  const existing=await client.execute({sql:'SELECT COUNT(*) AS n FROM envelope_signatures WHERE envelope_id=?',args:[String(invite.envelope_id)]});
  const firstSignature=Number(existing.rows[0]?.n??0)===0;
  // Keep the legacy documents row for the first signer only: object_key is unique.
  // Later signers own independent ledger evidence and share the same immutable R2 PDF.
  const operations=[
   {sql:"UPDATE envelope_recipients SET status='signed',signed_at=? WHERE id=? AND email=? AND status='pending' AND expires_at>? AND EXISTS (SELECT 1 FROM signing_envelopes WHERE id=envelope_recipients.envelope_id AND status='pending') RETURNING id",args:[now,String(invite.recipient_id),String(invite.email),now]},
   ...(firstSignature?[{sql:"INSERT INTO documents (id,sha256,object_key,signer_id,signer_email,consent_text,consent_at,created_at,evidence_json,evidence_mac,status) SELECT ?,?,?,?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM envelope_recipients WHERE id=? AND status='signed' AND document_id IS NULL)",args:[evidence.id,evidence.documentSha256,String(invite.object_key),signer.id,signer.email,consent,now,evidence.createdAt,JSON.stringify(evidence),sealEvidence(evidence),'signed',String(invite.recipient_id)]}]:[]),
   {sql:"INSERT INTO envelope_signatures (id,envelope_id,recipient_id,signer_id,signer_email,document_sha256,evidence_json,evidence_mac,signed_at) SELECT ?,?,?,?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM envelope_recipients WHERE id=? AND status='signed')",args:[evidence.id,String(invite.envelope_id),String(invite.recipient_id),signer.id,signer.email,evidence.documentSha256,JSON.stringify(evidence),sealEvidence(evidence),now,String(invite.recipient_id)]},
   ...(firstSignature?[
    {sql:"UPDATE envelope_recipients SET document_id=? WHERE id=? AND status='signed' AND document_id IS NULL AND EXISTS (SELECT 1 FROM documents WHERE id=?)",args:[evidence.id,String(invite.recipient_id),evidence.id]},
    {sql:"INSERT INTO audit_events (id,document_id,event_type,actor_id,created_at,details_json) SELECT ?,?,?,?,?,? WHERE EXISTS (SELECT 1 FROM documents WHERE id=?)",args:[randomUUID(),evidence.id,'signed_webauthn',signer.id,now,JSON.stringify({intentId:String(invite.recipient_id),credentialId:String(credential.credential_id),challengeId:String(invite.recipient_id),documentSha256:evidence.documentSha256,consentSha256,counter:verified.authenticationInfo.newCounter,envelopeId:String(invite.envelope_id)}),evidence.id]}
   ]:[]),
   {sql:"UPDATE webauthn_credentials SET counter=?,last_used_at=? WHERE credential_id=? AND signer_id=?",args:[verified.authenticationInfo.newCounter,now,String(credential.credential_id),signer.id]},
   {sql:"UPDATE signing_envelopes SET status='completed' WHERE id=? AND status='pending' AND NOT EXISTS (SELECT 1 FROM envelope_recipients WHERE envelope_id=? AND status='pending')",args:[String(invite.envelope_id),String(invite.envelope_id)]}
  ];
  const batch=await client.batch(operations,'write');
  if(batch[0].rows.length!==1||Number(batch[firstSignature?2:1].rowsAffected)!==1)
   return NextResponse.json({error:'signing_conflict'},{status:409});
  return NextResponse.json({id:evidence.id,sha256:evidence.documentSha256,verifyUrl:'/verify/'+evidence.id},{status:201,headers:{'Cache-Control':'no-store'}});
 } catch (error) { console.error('Invitation signature verification failed',error); return NextResponse.json({error:'signing_unavailable'}, {status:503}); }
}

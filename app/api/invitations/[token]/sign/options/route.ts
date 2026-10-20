import { NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { currentSigner, relyingParty } from '../../../../../../lib/webauthn';
import { db } from '../../../../../../lib/db';
import { sha256 } from '../../../../../../lib/evidence';
export const runtime='nodejs';
const consent='Declaro que li o documento selecionado e concordo em registrar minha assinatura eletrônica e as evidências desta operação.';
export async function POST(request:Request,{params}:{params:Promise<{token:string}>}){
 const {token}=await params;
 const signer=await currentSigner();
 if(!signer)return NextResponse.json({error:'authentication_required'},{status:401});
 if(!/^[A-Za-z0-9_-]{43}$/.test(token))return NextResponse.json({error:'invalid_invitation'},{status:404});
 let rp:ReturnType<typeof relyingParty>;
 try{rp=relyingParty();}catch{return NextResponse.json({error:'webauthn_unavailable'},{status:503});}
 if(request.headers.get('origin')!==rp.origin)return NextResponse.json({error:'invalid_origin'},{status:403});
 try{
 const client=db(),now=new Date();
 const res=await client.execute({sql:"SELECT r.id,r.email,r.expires_at,r.status,e.status AS envelope_status,e.document_sha256 FROM envelope_recipients r JOIN signing_envelopes e ON e.id=r.envelope_id WHERE r.token_sha256=? LIMIT 1",args:[sha256(new TextEncoder().encode(token))]});
 const row=res.rows[0];
 if(!row||row.status!=='pending'||row.envelope_status!=='pending'||String(row.expires_at)<=now.toISOString())return NextResponse.json({error:'invitation_unavailable'},{status:409});
 if(String(row.email).toLowerCase()!==signer.email.toLowerCase())return NextResponse.json({error:'recipient_mismatch'},{status:403});
 const credentials=await client.execute({sql:'SELECT credential_id,transports_json FROM webauthn_credentials WHERE signer_id=?',args:[signer.id]});
 if(!credentials.rows.length)return NextResponse.json({error:'passkey_required'},{status:409});
 const options=await generateAuthenticationOptions({rpID:rp.rpID,userVerification:'required',allowCredentials:credentials.rows.map(x=>({id:Buffer.from(String(x.credential_id),'base64url'),type:'public-key' as const,transports:JSON.parse(String(x.transports_json))}))});
 const id=String(row.id),consentHash=sha256(new TextEncoder().encode(consent));
 await client.execute({sql:"INSERT INTO webauthn_challenges (id,signer_id,challenge,purpose,document_sha256,consent_sha256,expires_at,created_at) VALUES (?,?,?,'sign',?,?,?,?) ON CONFLICT(id) DO UPDATE SET challenge=excluded.challenge,expires_at=excluded.expires_at,consumed_at=NULL WHERE webauthn_challenges.signer_id=excluded.signer_id AND webauthn_challenges.consumed_at IS NULL",args:[id,signer.id,options.challenge,String(row.document_sha256),consentHash,new Date(Math.min(now.getTime()+120000,Date.parse(String(row.expires_at)))).toISOString(),now.toISOString()]});
 return NextResponse.json({options},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'challenge_unavailable'},{status:503});}
}

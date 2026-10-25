import { db } from './db';
import { verifySeal, type Evidence } from './evidence';

export async function contractSummary(signatureId:string,viewerId:string,origin:string){
 const client=db();
 const envelope=await client.execute({sql:`SELECT e.id,e.file_name,e.document_sha256,e.status,e.owner_id FROM signing_envelopes e JOIN envelope_signatures s ON s.envelope_id=e.id WHERE s.id=? AND (e.owner_id=? OR EXISTS(SELECT 1 FROM envelope_signatures mine WHERE mine.envelope_id=e.id AND mine.signer_id=?)) LIMIT 1`,args:[signatureId,viewerId,viewerId]});
 const e=envelope.rows[0];
 if(!e)return null;
 const rows=await client.execute({sql:`SELECT r.email,r.status,s.id AS signature_id,s.signed_at,s.evidence_json,s.evidence_mac,s.signer_id,s.signer_email,s.document_sha256 FROM envelope_recipients r LEFT JOIN envelope_signatures s ON s.recipient_id=r.id WHERE r.envelope_id=? ORDER BY r.created_at,r.id`,args:[String(e.id)]});
 const signers=rows.rows.map(row=>{
  let verified=false;
  if(row.signature_id){
   try{const evidence=JSON.parse(String(row.evidence_json)) as Evidence;
    verified=verifySeal(evidence,String(row.evidence_mac))&&evidence.id===row.signature_id&&evidence.signerId===row.signer_id&&evidence.signerEmail===row.signer_email&&evidence.documentSha256===row.document_sha256&&evidence.documentSha256===e.document_sha256&&evidence.version===2&&!!evidence.webauthn&&row.status==='signed';
   }catch{verified=false;}
  }
  return {email:String(row.email),status:String(row.status),signatureId:row.signature_id?String(row.signature_id):null,signedAt:row.signed_at?String(row.signed_at):null,evidenceValid:row.signature_id?verified:null,verificationUrl:row.signature_id?new URL('/verify/'+String(row.signature_id),origin).toString():null};
 });
 const signed=signers.filter(s=>s.status==='signed'&&s.evidenceValid).length;
 return {envelopeId:String(e.id),fileName:String(e.file_name),documentSha256:String(e.document_sha256),totalSigners:signers.length,verifiedSignatures:signed,completed:signed===signers.length&&signers.length>0,signers};
}

/** Public summary: available only for a verified signature; mask participant emails. */
export async function publicContractSummary(signatureId:string){
 const client=db();
 const envelope=await client.execute({sql:"SELECT e.id,e.file_name,e.document_sha256 FROM signing_envelopes e JOIN envelope_signatures s ON s.envelope_id=e.id WHERE s.id=? LIMIT 1",args:[signatureId]});
 const e=envelope.rows[0];if(!e)return null;
 const result=await client.execute({sql:"SELECT r.email,r.status,s.id,s.signed_at,s.evidence_json,s.evidence_mac,s.signer_id,s.signer_email,s.document_sha256 FROM envelope_recipients r LEFT JOIN envelope_signatures s ON s.recipient_id=r.id WHERE r.envelope_id=? ORDER BY r.created_at,r.id",args:[String(e.id)]});
 const mask=(email:string)=>{const [name,domain]=email.split('@');return name&&domain?name.slice(0,2)+'***@'+domain:'Signatário';};
 const signers=result.rows.map(row=>{
  let valid=false;
  if(row.id){try{const evidence=JSON.parse(String(row.evidence_json)) as Evidence;valid=verifySeal(evidence,String(row.evidence_mac))&&evidence.id===row.id&&evidence.version===2&&!!evidence.webauthn&&evidence.signerId===row.signer_id&&evidence.signerEmail===row.signer_email&&evidence.documentSha256===row.document_sha256&&evidence.documentSha256===e.document_sha256&&row.status==='signed';}catch{}}
  return {email:mask(String(row.email)),status:valid?'signed':row.status==='signed'?'unverified':String(row.status),signedAt:valid?String(row.signed_at):null,verified:valid};
 });
 const verifiedSignatures=signers.filter(s=>s.verified).length;
 return {fileName:String(e.file_name),totalSigners:signers.length,verifiedSignatures,completed:signers.length>0&&verifiedSignatures===signers.length,signers};
}

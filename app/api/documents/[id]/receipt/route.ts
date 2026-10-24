import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { db } from '../../../../../lib/db';
import { checkRecordIntegrity, type DocumentRecord, type AuditEvent } from '../../../../../lib/audit-integrity';
import { sha256, verifySeal, type Evidence } from '../../../../../lib/evidence';
import { getPdf } from '../../../../../lib/r2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest, context: {params: Promise<{id:string}>}) {
 const session = await auth();
 if (!session?.user?.id) return NextResponse.json({error:'authentication_required'},{status:401});
 const {id} = await context.params;
 if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))
  return NextResponse.json({error:'invalid_id'},{status:400});
 try {
  const client = db();
  const result = await client.execute({sql:`SELECT d.id, d.sha256, d.signer_id, d.signer_email, d.consent_text, d.consent_at, d.created_at, d.evidence_json, d.evidence_mac, d.status, d.object_key FROM documents d WHERE d.id=? AND (d.signer_id=? OR EXISTS (SELECT 1 FROM envelope_recipients r JOIN signing_envelopes e ON e.id=r.envelope_id WHERE r.document_id=d.id AND r.status='signed' AND e.owner_id=? AND e.document_sha256=d.sha256)) LIMIT 1`,args:[id,session.user.id,session.user.id]});
  const record = result.rows[0];
  if (!record) {
   const rows=await client.execute({sql:`SELECT s.evidence_json,s.evidence_mac,s.signer_id,s.signer_email,s.document_sha256,s.signed_at,e.object_key FROM envelope_signatures s JOIN signing_envelopes e ON e.id=s.envelope_id JOIN envelope_recipients r ON r.id=s.recipient_id WHERE s.id=? AND s.signer_id=? AND r.status='signed' AND s.document_sha256=e.document_sha256 LIMIT 1`,args:[id,session.user.id]});
   const signed=rows.rows[0];
   if(!signed)return NextResponse.json({error:'not_found'},{status:404});
   let evidence:Evidence;
   try{evidence=JSON.parse(String(signed.evidence_json)) as Evidence;}catch{return NextResponse.json({error:'invalid_evidence'},{status:422});}
   if(!verifySeal(evidence,String(signed.evidence_mac))||evidence.id!==id||evidence.signerId!==signed.signer_id||evidence.signerEmail!==signed.signer_email||evidence.documentSha256!==signed.document_sha256||evidence.version!==2||!evidence.webauthn)return NextResponse.json({error:'invalid_evidence'},{status:422});
   const original=await getPdf(String(signed.object_key));
   if(sha256(original)!==String(signed.document_sha256))return NextResponse.json({error:'pdf_hash_mismatch'},{status:422});
   const receipt={type:'selo-signature-receipt',version:1,documentId:id,documentSha256:String(signed.document_sha256),signedAt:String(signed.signed_at),signerEmail:String(signed.signer_email),evidenceVersion:2,authentication:'webauthn-passkey',verificationUrl:new URL('/verify/'+id,request.url).toString(),integrity:{recordSeal:'valid',auditTrail:'ledger',pdfSha256:'matched'},note:'Comprovante informativo de assinatura eletrônica. Não é uma assinatura PAdES nem certificado ICP-Brasil.'};
   return new NextResponse(JSON.stringify(receipt,null,2),{headers:{'Content-Type':'application/json; charset=utf-8','Content-Disposition':`attachment; filename="selo-comprovante-${id}.json"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
  }
  const events = await client.execute({sql:'SELECT event_type, actor_id, details_json FROM audit_events WHERE document_id=?',args:[id]});
  const integrity = checkRecordIntegrity(record as unknown as DocumentRecord,events.rows as unknown as AuditEvent[]);
  if (!integrity.valid) return NextResponse.json({error:'invalid_evidence'},{status:422});
  const pdf = await getPdf(String(record.object_key));
  if (sha256(pdf) !== String(record.sha256)) return NextResponse.json({error:'pdf_hash_mismatch'},{status:422});
  const evidence = JSON.parse(String(record.evidence_json)) as {version:number;webauthn?:{credentialId:string;origin:string;rpId:string}};
  const receipt = {
   type:'selo-signature-receipt',version:1,documentId:id,documentSha256:String(record.sha256),
   signedAt:String(record.created_at),signerEmail:String(record.signer_email),
   evidenceVersion:evidence.version,authentication:evidence.version===2?'webauthn-passkey':'legacy',
   verificationUrl:new URL('/verify/'+id,request.url).toString(),
   integrity:{recordSeal:'valid',auditTrail:'valid',pdfSha256:'matched'},
   note:'Comprovante informativo de assinatura eletrônica. Não é uma assinatura PAdES nem certificado ICP-Brasil.'
  };
  return new NextResponse(JSON.stringify(receipt,null,2),{headers:{
   'Content-Type':'application/json; charset=utf-8',
   'Content-Disposition':`attachment; filename="selo-comprovante-${id}.json"`,
   'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'
  }});
 } catch (error) {
  console.error('receipt_generation_failed',error instanceof Error?error.message:'unknown_error');
  return NextResponse.json({error:'receipt_unavailable'},{status:503});
 }
}

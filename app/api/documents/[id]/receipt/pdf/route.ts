import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../../auth';
import { db } from '../../../../../../lib/db';
import { checkRecordIntegrity, type DocumentRecord, type AuditEvent } from '../../../../../../lib/audit-integrity';
import { sha256 } from '../../../../../../lib/evidence';
import { getPdf } from '../../../../../../lib/r2';
import { createReceiptPdf } from '../../../../../../lib/receipt-pdf';

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
  if (!record) return NextResponse.json({error:'not_found'},{status:404});
  const events = await client.execute({sql:'SELECT event_type, actor_id, details_json FROM audit_events WHERE document_id=?',args:[id]});
  const integrity = checkRecordIntegrity(record as unknown as DocumentRecord,events.rows as unknown as AuditEvent[]);
  if (!integrity.valid) return NextResponse.json({error:'invalid_evidence'},{status:422});
  const pdf = await getPdf(String(record.object_key));
  if (sha256(pdf) !== String(record.sha256)) return NextResponse.json({error:'pdf_hash_mismatch'},{status:422});
  const evidence = JSON.parse(String(record.evidence_json)) as {version:number;webauthn?:{credentialId:string;origin:string;rpId:string}};
  const receiptPdf = await createReceiptPdf({
   documentId:id,documentSha256:String(record.sha256),signedAt:String(record.created_at),
   signerEmail:String(record.signer_email),
   authentication:evidence.version===2?'webauthn-passkey':'legacy',
   verificationUrl:new URL('/verify/'+id,request.url).toString()
  });
  return new NextResponse(Buffer.from(receiptPdf),{headers:{
   'Content-Type':'application/pdf',
   'Content-Disposition':`attachment; filename="selo-comprovante-${id}.pdf"`,
   'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'
  }});
 } catch (error) {
  console.error('receipt_generation_failed',error instanceof Error?error.message:'unknown_error');
  return NextResponse.json({error:'receipt_unavailable'},{status:503});
 }
}

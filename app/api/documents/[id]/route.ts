import { NextRequest,NextResponse } from 'next/server';
import { auth } from '../../../../auth';
import { db } from '../../../../lib/db';
import { getPdf } from '../../../../lib/r2';
import { sha256 } from '../../../../lib/evidence';
export const runtime='nodejs';
export async function GET(_request:NextRequest,context:{params:Promise<{id:string}>}) {
 const session=await auth(); if(!session?.user?.id) return NextResponse.json({error:'authentication_required'},{status:401});
 const {id}=await context.params;
 if(!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({error:'invalid_id'},{status:400});
 try {
  const result=await db().execute({sql:`SELECT d.object_key,d.sha256,(SELECT json_extract(a.details_json,'$.fileName') FROM audit_events a WHERE a.document_id=d.id AND a.event_type IN ('signed','signed_webauthn') ORDER BY a.created_at LIMIT 1) AS file_name, (SELECT e.file_name FROM envelope_recipients r JOIN signing_envelopes e ON e.id=r.envelope_id WHERE r.document_id=d.id LIMIT 1) AS envelope_file_name FROM documents d WHERE d.id=? AND (d.signer_id=? OR EXISTS (SELECT 1 FROM envelope_recipients r JOIN signing_envelopes e ON e.id=r.envelope_id WHERE r.document_id=d.id AND r.status='signed' AND e.owner_id=? AND e.document_sha256=d.sha256)) LIMIT 1`,args:[id,session.user.id,session.user.id]});
  let record=result.rows[0];
  if(!record){
   const ledger=await db().execute({sql:`SELECT e.object_key,e.document_sha256 AS sha256,e.file_name AS envelope_file_name FROM envelope_signatures s JOIN signing_envelopes e ON e.id=s.envelope_id JOIN envelope_recipients r ON r.id=s.recipient_id WHERE s.id=? AND s.signer_id=? AND r.status='signed' AND r.envelope_id=e.id AND s.document_sha256=e.document_sha256 LIMIT 1`,args:[id,session.user.id]});
   record=ledger.rows[0];
  }
  if(!record) return NextResponse.json({error:'not_found'},{status:404});
  const pdf=await getPdf(String(record.object_key));
  if(sha256(pdf)!==String(record.sha256)) return NextResponse.json({error:'integrity_failure'},{status:422});
  const rawName = typeof record.envelope_file_name === 'string' ? record.envelope_file_name : typeof record.file_name === 'string' ? record.file_name : 'documento.pdf';
  const baseName = rawName.replace(/\\/g, '/').split('/').pop() || 'documento.pdf';
  const stem = baseName.replace(/\.pdf$/i, '').replace(/[\x00-\x1f\x7f"<>:|?*\\/]/g, '_').replace(/^\.+/, '').trim().slice(0, 120) || 'documento';
  const fileName = stem + '.pdf';
  const asciiFallback = fileName.normalize('NFKD').replace(/[^\x20-\x7E]/g, '').replace(/["\\]/g, '_') || 'documento.pdf';
  const disposition = 'attachment; filename="' + asciiFallback + '"; filename*=UTF-8\'\'' + encodeURIComponent(fileName);
  return new NextResponse(Buffer.from(pdf),{headers:{'Content-Type':'application/pdf','Content-Disposition':disposition,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 } catch {return NextResponse.json({error:'document_unavailable'},{status:503});}
}

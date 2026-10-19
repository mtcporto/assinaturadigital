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
  const result=await db().execute({sql:`SELECT d.object_key,d.sha256,(SELECT json_extract(a.details_json,'$.fileName') FROM audit_events a WHERE a.document_id=d.id AND a.event_type='signed' ORDER BY a.created_at LIMIT 1) AS file_name FROM documents d WHERE d.id=? AND d.signer_id=? LIMIT 1`,args:[id,session.user.id]});
  const record=result.rows[0]; if(!record) return NextResponse.json({error:'not_found'},{status:404});
  const pdf=await getPdf(String(record.object_key));
  if(sha256(pdf)!==String(record.sha256)) return NextResponse.json({error:'integrity_failure'},{status:422});
  const rawName=typeof record.file_name==='string'?record.file_name:'document-'+id+'.pdf';
  const safeName=rawName.replace(/[^a-zA-Z0-9._ -]/g,'_').replace(/[\\r\\n"]/g,'_').slice(0,120);
  const fileName=safeName.toLowerCase().endsWith('.pdf')?safeName:safeName+'.pdf';
  return new NextResponse(Buffer.from(pdf),{headers:{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="${fileName}"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 } catch {return NextResponse.json({error:'document_unavailable'},{status:503});}
}

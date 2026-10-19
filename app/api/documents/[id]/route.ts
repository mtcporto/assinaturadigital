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
  const result=await db().execute({sql:'SELECT object_key,sha256 FROM documents WHERE id=? AND signer_id=? LIMIT 1',args:[id,session.user.id]});
  const record=result.rows[0]; if(!record) return NextResponse.json({error:'not_found'},{status:404});
  const pdf=await getPdf(String(record.object_key));
  if(sha256(pdf)!==String(record.sha256)) return NextResponse.json({error:'integrity_failure'},{status:422});
  return new NextResponse(Buffer.from(pdf),{headers:{'Content-Type':'application/pdf','Content-Disposition':`attachment; filename="document-${id}.pdf"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 } catch {return NextResponse.json({error:'document_unavailable'},{status:503});}
}

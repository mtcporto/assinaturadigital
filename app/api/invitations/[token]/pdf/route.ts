import { NextResponse } from 'next/server';
import { db } from '../../../../../lib/db';
import { sha256 } from '../../../../../lib/evidence';
import { getPdf } from '../../../../../lib/r2';
export const runtime='nodejs';
export async function GET(_request:Request,{params}:{params:Promise<{token:string}>}){
 const {token}=await params;
 if(!/^[A-Za-z0-9_-]{43}$/.test(token)) return NextResponse.json({error:'invalid_invitation'},{status:404});
 try{
  const result=await db().execute({sql:`SELECT e.object_key,e.document_sha256,r.status,r.expires_at,e.status AS envelope_status
   FROM envelope_recipients r JOIN signing_envelopes e ON e.id=r.envelope_id
   WHERE r.token_sha256=? LIMIT 1`,args:[sha256(new TextEncoder().encode(token))]});
  if(!result.rows.length) return NextResponse.json({error:'invalid_invitation'},{status:404});
  const row=result.rows[0];
  if(row.envelope_status!=='pending'||row.status!=='pending'||String(row.expires_at)<=new Date().toISOString())return NextResponse.json({error:'invitation_unavailable'},{status:410});
  const pdf=await getPdf(String(row.object_key));
  if(sha256(pdf)!==String(row.document_sha256))return NextResponse.json({error:'document_integrity_failed'},{status:409});
  return new NextResponse(Buffer.from(pdf),{headers:{'Content-Type':'application/pdf','Content-Disposition':'inline; filename="documento.pdf"','Cache-Control':'no-store, private','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"}});
 }catch{return NextResponse.json({error:'document_unavailable'},{status:503});}
}

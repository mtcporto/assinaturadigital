import { db } from '../../../lib/db';
import { sha256 } from '../../../lib/evidence';
import { NextResponse } from 'next/server';

export const runtime='nodejs';
export async function GET(_request:Request,{params}:{params:Promise<{token:string}>}){
 const {token}=await params;
 if(!/^[A-Za-z0-9_-]{43}$/.test(token)) return NextResponse.json({error:'invalid_invitation'},{status:404});
 try{
  const result=await db().execute({sql:`SELECT e.file_name,e.document_sha256,r.status,r.expires_at
   FROM envelope_recipients r JOIN signing_envelopes e ON e.id=r.envelope_id
   WHERE r.token_sha256=? AND e.status='pending' LIMIT 1`,args:[sha256(new TextEncoder().encode(token))]});
  if(!result.rows.length) return NextResponse.json({error:'invalid_invitation'},{status:404});
  const row=result.rows[0];
  if(String(row.expires_at)<=new Date().toISOString()) return NextResponse.json({error:'expired_invitation'},{status:410});
  if(row.status!=='pending') return NextResponse.json({error:'invitation_not_pending'},{status:409});
  return NextResponse.json({fileName:String(row.file_name),sha256:String(row.document_sha256),status:'pending',expiresAt:String(row.expires_at)},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'invitation_unavailable'},{status:503});}
}

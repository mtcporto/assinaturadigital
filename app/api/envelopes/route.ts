import { NextResponse } from 'next/server';
import { randomBytes, randomUUID } from 'node:crypto';
import { currentSigner, relyingParty } from '../../../lib/webauthn';
import { db } from '../../../lib/db';
import { sha256 } from '../../../lib/evidence';
import { putPdf, deletePdf } from '../../../lib/r2';
import { sendInvitationEmail } from '../../../lib/resend';

export const runtime = 'nodejs';

export async function POST(request: Request) {
 const owner = await currentSigner();
 if (!owner) return NextResponse.json({error:'authentication_required'},{status:401});
 let origin: string;
 try { origin=relyingParty().origin; } catch { return NextResponse.json({error:'not_configured'},{status:503}); }
 if (request.headers.get('origin')!==origin) return NextResponse.json({error:'invalid_origin'},{status:403});
 if (!(request.headers.get('content-type')??'').includes('multipart/form-data')) return NextResponse.json({error:'multipart_required'},{status:415});
 if (Number(request.headers.get('content-length')||0)>8*1024*1024) return NextResponse.json({error:'file_too_large'},{status:413});
 let form: FormData;
 try {form=await request.formData();}catch{return NextResponse.json({error:'invalid_form'},{status:400});}
 const file=form.get('file'), rawEmail=form.get('email');
 if (!(file instanceof File)||typeof rawEmail!=='string') return NextResponse.json({error:'file_and_email_required'},{status:400});
 const email=rawEmail.trim().toLowerCase();
 if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254) return NextResponse.json({error:'invalid_email'},{status:400});
 if(file.size<8||file.size>5*1024*1024) return NextResponse.json({error:'invalid_file_size'},{status:413});
 const pdf=new Uint8Array(await file.arrayBuffer());
 if(new TextDecoder().decode(pdf.slice(0,5))!=='%PDF-') return NextResponse.json({error:'not_a_pdf'},{status:415});
 const client=db();
 try {
  const pending=await client.execute({sql:"SELECT COUNT(*) AS n FROM signing_envelopes WHERE owner_id=? AND status='pending'",args:[owner.id]});
  if(Number(pending.rows[0]?.n??0)>=30) return NextResponse.json({error:'too_many_pending_envelopes'},{status:429});
 }catch{return NextResponse.json({error:'envelopes_unavailable'},{status:503});}
 const id=randomUUID(),recipientId=randomUUID(),token=randomBytes(32).toString('base64url');
 const objectKey=`envelopes/${id}.pdf`,now=new Date(),expires=new Date(now.getTime()+7*24*60*60*1000);
 try {
  await putPdf(objectKey,pdf);
  try {
   await client.batch([
    {sql:'INSERT INTO signing_envelopes (id,owner_id,owner_email,object_key,document_sha256,file_name,created_at) VALUES (?,?,?,?,?,?,?)',args:[id,owner.id,owner.email,objectKey,sha256(pdf),file.name.slice(0,255),now.toISOString()]},
    {sql:'INSERT INTO envelope_recipients (id,envelope_id,email,token_sha256,created_at,expires_at) VALUES (?,?,?,?,?,?)',args:[recipientId,id,email,sha256(new TextEncoder().encode(token)),now.toISOString(),expires.toISOString()]}
   ],'write');
  }catch(error){await deletePdf(objectKey).catch(()=>{});throw error;}
  const invitationUrl=`${origin}/convite/${token}`;
  const delivery=await sendInvitationEmail({to:email,url:invitationUrl,fileName:file.name.slice(0,255),expiresAt:expires.toISOString()});
  return NextResponse.json({envelopeId:id,recipientEmail:email,invitationUrl,expiresAt:expires.toISOString(),status:'pending',delivery:delivery.status},{status:201,headers:{'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}});
 }catch{return NextResponse.json({error:'envelope_creation_failed'},{status:503});}
}

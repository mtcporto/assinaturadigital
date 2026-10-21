import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { currentSigner, relyingParty } from '../../../../../../lib/webauthn';
import { db } from '../../../../../../lib/db';
import { sha256 } from '../../../../../../lib/evidence';
import { sendInvitationEmail } from '../../../../../../lib/resend';

export const runtime='nodejs';

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 const signer=await currentSigner();
 if(!signer)return NextResponse.json({error:'authentication_required'},{status:401});
 let origin:string;
 try{origin=relyingParty().origin;}catch{return NextResponse.json({error:'not_configured'},{status:503});}
 if(request.headers.get('origin')!==origin)return NextResponse.json({error:'invalid_origin'},{status:403});
 const {id}=await params;
 if(!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id))return NextResponse.json({error:'invalid_id'},{status:400});
 const token=randomBytes(32).toString('base64url');
 const tokenHash=sha256(new TextEncoder().encode(token));
 const expiresAt=new Date(Date.now()+7*24*60*60*1000).toISOString();
 try{
  const result=await db().execute({
   sql:`UPDATE envelope_recipients
        SET token_sha256=?,expires_at=?,status='pending'
        WHERE id=? AND status IN ('pending','expired') AND signed_at IS NULL AND document_id IS NULL
          AND EXISTS (SELECT 1 FROM signing_envelopes e
                      WHERE e.id=envelope_recipients.envelope_id AND e.owner_id=? AND e.status='pending')
        RETURNING id,email`,
   args:[tokenHash,expiresAt,id,signer.id]
  });
  if(result.rows.length!==1)return NextResponse.json({error:'not_eligible_or_not_owned'},{status:409});
  const invitationUrl=origin+'/convite/'+token;
  const recipientEmail=String(result.rows[0].email);
  const file=await db().execute({sql:'SELECT e.file_name FROM signing_envelopes e JOIN envelope_recipients r ON r.envelope_id=e.id WHERE r.id=? AND e.owner_id=? LIMIT 1',args:[id,signer.id]});
  const delivery=await sendInvitationEmail({to:recipientEmail,url:invitationUrl,fileName:String(file.rows[0]?.file_name??'Documento PDF'),expiresAt});
  return NextResponse.json({invitationUrl,expiresAt,recipientEmail,delivery:delivery.status},{headers:{'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}});
 }catch(error){console.error('invitation_renew_failed',error);return NextResponse.json({error:'renew_unavailable'},{status:503});}
}

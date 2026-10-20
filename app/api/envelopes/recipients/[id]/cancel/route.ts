import { NextResponse } from 'next/server';
import { currentSigner, relyingParty } from '../../../../../lib/webauthn';
import { db } from '../../../../../lib/db';

export const runtime='nodejs';

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 const signer=await currentSigner();
 if(!signer)return NextResponse.json({error:'authentication_required'},{status:401});
 let origin:string;
 try{origin=relyingParty().origin;}catch{return NextResponse.json({error:'not_configured'},{status:503});}
 if(request.headers.get('origin')!==origin)return NextResponse.json({error:'invalid_origin'},{status:403});
 const {id}=await params;
 if(!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id))return NextResponse.json({error:'invalid_id'},{status:400});
 try{
  const now=new Date().toISOString();
  const result=await db().execute({
   sql:`UPDATE envelope_recipients SET status='cancelled'
        WHERE id=? AND status='pending' AND signed_at IS NULL
          AND EXISTS(SELECT 1 FROM signing_envelopes e
            WHERE e.id=envelope_recipients.envelope_id AND e.owner_id=? AND e.status='pending')
        RETURNING id`,
   args:[id,signer.id]
  });
  if(result.rows.length!==1)return NextResponse.json({error:'not_pending_or_not_owned'},{status:409});
  await db().execute({sql:`UPDATE signing_envelopes SET status='cancelled'
   WHERE id=(SELECT envelope_id FROM envelope_recipients WHERE id=?)
     AND status='pending'
     AND NOT EXISTS(SELECT 1 FROM envelope_recipients WHERE envelope_id=signing_envelopes.id AND status='pending')`,args:[id]});
  return NextResponse.json({status:'cancelled',at:now},{headers:{'Cache-Control':'no-store'}});
 }catch(error){console.error('invite_cancel_failed',error);return NextResponse.json({error:'cancel_unavailable'},{status:503});}
}

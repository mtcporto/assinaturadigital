import {createHmac,timingSafeEqual} from 'node:crypto';
import {NextResponse} from 'next/server';
import {db} from '../../../../lib/db';
export const runtime='nodejs';
export const dynamic='force-dynamic';
function verified(raw:string,request:Request,secret:string):boolean{
 const id=request.headers.get('svix-id'),ts=request.headers.get('svix-timestamp'),signature=request.headers.get('svix-signature');
 if(!id||!ts||!signature||!secret.startsWith('whsec_')||!/^[0-9]+$/.test(ts))return false;
 if(Math.abs(Date.now()/1000-Number(ts))>300)return false;
 const key=Buffer.from(secret.slice(6),'base64');
 if(!key.length)return false;
 const expected=createHmac('sha256',key).update(id+'.'+ts+'.'+raw).digest();
 return signature.split(' ').some(s=>{
  if(!s.startsWith('v1,'))return false;
  const actual=Buffer.from(s.slice(3),'base64');
  return actual.length===expected.length&&timingSafeEqual(actual,expected);
 });
}
export async function POST(request:Request){
 const secret=process.env.RESEND_WEBHOOK_SECRET;
 if(!secret)return NextResponse.json({error:'not_configured'},{status:503});
 const raw=await request.text();
 if(raw.length>100_000)return NextResponse.json({error:'too_large'},{status:413});
 if(!verified(raw,request,secret))return NextResponse.json({error:'invalid_signature'},{status:401});
 let event:{type?:string;data?:{email_id?:string}};
 try{event=JSON.parse(raw);}catch{return NextResponse.json({error:'invalid_payload'},{status:400});}
 const statusMap:Record<string,string>={'email.delivered':'delivered','email.bounced':'bounced','email.complained':'complained','email.delivery_delayed':'delayed'};
 const status=event.type?statusMap[event.type]:undefined;
 if(!status||!event.data?.email_id)return NextResponse.json({ok:true});
 try{
  await db().execute({sql:`UPDATE invitation_email_deliveries SET status=?,updated_at=?
    WHERE resend_email_id=? AND status NOT IN ('bounced','complained')
      AND (status!='delivered' OR ? IN ('bounced','complained'))`,
   args:[status,new Date().toISOString(),event.data.email_id,status]});
  return NextResponse.json({ok:true});
 }catch(error){console.error('resend_webhook_storage_failed',error instanceof Error?error.message:'unknown');return NextResponse.json({error:'storage_unavailable'},{status:503});}
}

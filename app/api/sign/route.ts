import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { auth } from '../../../auth';
import { db } from '../../../lib/db';
import { makeEvidence, sealEvidence, sha256 } from '../../../lib/evidence';
import { putPdf, deletePdf } from '../../../lib/r2';
export const runtime='nodejs';
const consent='Declaro que li o documento selecionado e concordo em registrar minha assinatura eletrônica e as evidências desta operação.';
export async function POST(request:Request) {
 const session=await auth();
 const email=session?.user?.email, signerId=session?.user?.id;
 if(!email||!signerId) return NextResponse.json({error:'authentication_required'},{status:401});
 const type=request.headers.get('content-type')||'';
 if(!type.includes('multipart/form-data')) return NextResponse.json({error:'multipart_required'},{status:415});
 const declared=Number(request.headers.get('content-length')||0);
 if(declared>8*1024*1024) return NextResponse.json({error:'file_too_large'},{status:413});
 let form:FormData;
 try {form=await request.formData();} catch {return NextResponse.json({error:'invalid_form'},{status:400});}
 const file=form.get('file'), accepted=form.get('consent');
 if(!(file instanceof File)||accepted!=='yes') return NextResponse.json({error:'file_and_consent_required'},{status:400});
 if(file.size<8||file.size>5*1024*1024) return NextResponse.json({error:'invalid_file_size'},{status:413});
 const pdf=new Uint8Array(await file.arrayBuffer());
 if(new TextDecoder().decode(pdf.slice(0,5))!=='%PDF-') return NextResponse.json({error:'not_a_pdf'},{status:415});
 const now=new Date().toISOString();
 const evidence=makeEvidence({documentSha256:sha256(pdf),signerId,signerEmail:email,consentText:consent,consentAt:now});
 const mac=sealEvidence(evidence), objectKey=`documents/${evidence.id}.pdf`;
 let uploaded=false;
 try {
  await putPdf(objectKey,pdf); uploaded=true;
  await db().batch([
   {sql:'INSERT INTO documents (id,sha256,object_key,signer_id,signer_email,consent_text,consent_at,created_at,evidence_json,evidence_mac,status) VALUES (?,?,?,?,?,?,?,?,?,?,?)',args:[evidence.id,evidence.documentSha256,objectKey,signerId,email,consent,now,evidence.createdAt,JSON.stringify(evidence),mac,'signed']},
   {sql:'INSERT INTO audit_events (id,document_id,event_type,actor_id,created_at,details_json) VALUES (?,?,?,?,?,?)',args:[randomUUID(),evidence.id,'signed',signerId,now,JSON.stringify({provider:'google',fileName:file.name,sha256:evidence.documentSha256})]}
  ],'write');
  return NextResponse.json({id:evidence.id,sha256:evidence.documentSha256,verifyUrl:`/verify/${evidence.id}`},{status:201,headers:{'Cache-Control':'no-store'}});
 } catch {
  if(uploaded) {try {await deletePdf(objectKey);} catch { /* cleanup can be retried operationally */}}
  return NextResponse.json({error:'signing_unavailable'},{status:503});
 }
}

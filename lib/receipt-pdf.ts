import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import QRCode from 'qrcode';
import { dateTimeBR } from './datetime';
import type { contractSummary } from './contract-summary';

export type ReceiptData = {
 contract?:NonNullable<Awaited<ReturnType<typeof contractSummary>>>;
 documentId:string; documentSha256:string; signedAt:string; signerEmail:string;
 authentication:'webauthn-passkey'|'legacy'; verificationUrl:string;
};

export async function createReceiptPdf(data:ReceiptData):Promise<Uint8Array> {
 const pdf = await PDFDocument.create();
 pdf.setTitle('Selo | Comprovante de assinatura eletrônica');
 pdf.setSubject('Comprovante de evidências de assinatura eletrônica');
 pdf.setCreator('Selo');
 const page = pdf.addPage([595.28,841.89]);
 const regular = await pdf.embedFont(StandardFonts.Helvetica);
 const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
 const serif = await pdf.embedFont(StandardFonts.TimesRoman);
 const ink=rgb(0.09,0.17,0.18), green=rgb(0.09,0.24,0.22), muted=rgb(0.39,0.45,0.43), terracotta=rgb(0.65,0.34,0.24);
 const text=(value:string,x:number,y:number,size=11,heavy=false,color=ink)=>page.drawText(value,{x,y,size,font:heavy?bold:regular,color});
 page.drawRectangle({x:0,y:0,width:595.28,height:841.89,color:rgb(.977,.973,.956)});
 page.drawRectangle({x:0,y:754,width:595.28,height:87,color:green});
 page.drawText('Selo.',{x:47,y:783,font:serif,size:36,color:rgb(1,1,1)});
 page.drawText('COMPROVANTE DE ASSINATURA ELETRÔNICA',{x:47,y:720,size:12,font:bold,color:terracotta});
 page.drawLine({start:{x:47,y:702},end:{x:548,y:702},thickness:1,color:rgb(.84,.83,.79)});
 text('Documento',47,668,11,true,muted);
 text(data.documentId,47,644,12,true);
 text('Signatário',47,602,11,true,muted);
 text(data.signerEmail,47,580,12);
 text('Data registrada (Brasília)',47,540,11,true,muted);
 text(dateTimeBR(data.signedAt),47,518,12);
 text('Confirmação da assinatura',47,477,11,true,muted);
 text(data.authentication==='webauthn-passkey'?'Passkey (WebAuthn)':'Registro eletrônico legado',47,455,12);
 text('SHA-256 do documento original',47,414,11,true,muted);
 text(data.documentSha256.slice(0,32),47,392,11);
 text(data.documentSha256.slice(32),47,376,11);
 page.drawLine({start:{x:47,y:345},end:{x:548,y:345},thickness:1,color:rgb(.84,.83,.79)});
 const qr=await QRCode.toDataURL(data.verificationUrl,{margin:1,width:320,errorCorrectionLevel:'M'});
 const bytes=Buffer.from(qr.split(',')[1],'base64');
 const image=await pdf.embedPng(bytes);
 page.drawImage(image,{x:45,y:177,width:145,height:145});
 text('VERIFICAÇÃO PÚBLICA',210,298,11,true,terracotta);
 text('Leia o QR Code para consultar o registro',210,272,11);
 text('e conferir o hash do PDF original.',210,254,11);
 text('A verificação do registro não substitui',210,229,10,false,muted);
 text('a comparação do SHA-256 do arquivo.',210,213,10,false,muted);
 page.drawLine({start:{x:47,y:150},end:{x:548,y:150},thickness:1,color:rgb(.84,.83,.79)});
 text('Emitido após validação do registro, trilha de auditoria e PDF armazenado.',47,126,9,false,muted);
 text('Este comprovante não é assinatura PAdES nem certificado ICP-Brasil.',47,110,9,false,muted);
 text('O documento original permanece preservado separadamente.',47,94,9,false,muted);
 if(data.contract){
  const contract=data.contract;
  const page2=pdf.addPage([595.28,841.89]);
  page2.drawRectangle({x:0,y:0,width:595.28,height:841.89,color:rgb(.977,.973,.956)});
  page2.drawRectangle({x:0,y:754,width:595.28,height:87,color:green});
  page2.drawText('Selo.',{x:47,y:783,font:serif,size:36,color:rgb(1,1,1)});
  const draw=(value:string,x:number,y:number,size=10,heavy=false)=>page2.drawText(value,{x,y,size,font:heavy?bold:regular,color:ink});
  draw('RESUMO CONSOLIDADO DO CONTRATO',47,718,14,true);
  draw('Documento: '+contract.fileName.slice(0,65),47,681,10,true);
  draw('Contrato: '+contract.envelopeId,47,659,9);
  draw('SHA-256 do PDF original:',47,631,10,true);
  draw(contract.documentSha256.slice(0,32),47,613,10);
  draw(contract.documentSha256.slice(32),47,597,10);
  draw('Assinaturas verificadas: '+contract.verifiedSignatures+' de '+contract.totalSigners,47,563,11,true);
  draw(contract.completed?'Situação: assinado por todos':'Situação: aguardando outras assinaturas',47,541,11,true);
  let y=506;
  for(const [index,signer] of contract.signers.entries()){
   if(y<115)break;
   page2.drawLine({start:{x:47,y:y+12},end:{x:548,y:y+12},thickness:.5,color:rgb(.84,.83,.79)});
   draw('Signatário '+(index+1)+': '+signer.email.slice(0,65),47,y,10,true);
   draw('Estado: '+(signer.evidenceValid?'Assinatura verificada':signer.status==='signed'?'Verificação pendente':'Aguardando assinatura'),47,y-19,9);
   if(signer.signedAt)draw('Data: '+dateTimeBR(signer.signedAt),47,y-37,9);
   if(signer.signatureId)draw('ID: '+signer.signatureId,47,y-55,9);
   y-=91;
  }
  draw('Cada assinatura possui registro individual e link próprio de verificação.',47,75,9);
  draw('O PDF original é preservado; este relatório não é assinatura PAdES.',47,57,9);
 }
 return pdf.save();
}

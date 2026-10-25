import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument } from 'pdf-lib';
import { GET as getOriginal } from '../route';
import { GET as getReceipt } from '../receipt/pdf/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Downloadable presentation copy: original PDF pages followed by the Selo
 * evidence receipt. This is not PAdES and does not alter the original bytes
 * or the SHA-256 that the signatures refer to.
 *
 * Reuse both protected routes so authentication, ownership, evidence
 * verification and original-file integrity checks cannot diverge.
 */
export async function GET(request: NextRequest, context: {params: Promise<{id:string}>}) {
 const originalResponse = await getOriginal(request,context);
 if (!originalResponse.ok) return originalResponse;
 const receiptResponse = await getReceipt(request,context);
 if (!receiptResponse.ok) return receiptResponse;
 try {
  const original = await PDFDocument.load(await originalResponse.arrayBuffer());
  const receipt = await PDFDocument.load(await receiptResponse.arrayBuffer());
  const combined = await PDFDocument.create();
  const originalPages = await combined.copyPages(original,original.getPageIndices());
  for (const page of originalPages) combined.addPage(page);
  const evidencePages = await combined.copyPages(receipt,receipt.getPageIndices());
  for (const page of evidencePages) combined.addPage(page);
  combined.setTitle('Selo | Documento com comprovante de assinaturas');
  combined.setSubject('Cópia de apresentação: PDF original acompanhado de comprovantes de assinatura eletrônica. Não é PAdES.');
  combined.setCreator('Selo');
  const bytes = await combined.save();
  const {id} = await context.params;
  return new NextResponse(Buffer.from(bytes),{headers:{
   'Content-Type':'application/pdf',
   'Content-Disposition':`attachment; filename="selo-documento-com-comprovante-${id}.pdf"`,
   'Cache-Control':'private, no-store',
   'X-Content-Type-Options':'nosniff'
  }});
 } catch (error) {
  const reason = error instanceof Error ? error.message : 'unknown_error';
  console.error('combined_pdf_generation_failed', reason);
  // pdf-lib does not support encrypted PDFs. ignoreEncryption is not a
  // decryption mechanism and can produce incomplete presentation copies.
  if (/encrypted|encryption/i.test(reason)) {
   return NextResponse.json({
    error: 'encrypted_pdf_not_supported',
    message: 'Este PDF possui proteção ou criptografia. O Selo preservou o documento original e as assinaturas, mas não consegue anexar o comprovante ao mesmo arquivo com segurança. Baixe o PDF original e os comprovantes técnicos separadamente.'
   }, {status:422});
  }
  return NextResponse.json({error:'combined_pdf_unavailable',message:'Não foi possível preparar o PDF com comprovante. O documento original e os comprovantes continuam disponíveis separadamente.'},{status:422});
 }
}

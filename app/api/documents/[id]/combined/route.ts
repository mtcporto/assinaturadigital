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
  // A browser download should show a useful human-readable fallback, not JSON.
  // Preserve the protected original and offer the separately verified receipt.
  const {id} = await context.params;
  const protectedPdf = /encrypted|encryption/i.test(reason);
  const heading = protectedPdf ? 'Este PDF possui proteção' : 'Não foi possível preparar o PDF com comprovante';
  const explanation = protectedPdf
   ? 'As assinaturas foram registradas normalmente, mas este arquivo possui proteção ou criptografia que impede anexar o comprovante com segurança.'
   : 'Não foi possível reunir o documento e o comprovante neste momento. Os arquivos originais e as evidências continuam disponíveis.';
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${heading} | Selo</title><style>body{margin:0;background:#f8f7f4;color:#20312e;font:16px/1.6 system-ui,sans-serif}main{max-width:640px;margin:8vh auto;padding:36px;background:white;border:1px solid #ddd8d0;border-radius:14px}h1{font-size:1.7rem;line-height:1.3}a{display:inline-block;margin:8px 12px 0 0;padding:10px 14px;border:1px solid #1c403b;border-radius:6px;color:#1c403b;text-decoration:none}a.primary{background:#1c403b;color:white}p{color:#455b55}</style></head><body><main><strong>Selo.</strong><h1>${heading}</h1><p>${explanation}</p><p>Você ainda pode baixar o PDF original e o comprovante de assinatura separadamente. Nenhuma assinatura foi perdida.</p><a class="primary" href="/api/documents/${encodeURIComponent(id)}">Baixar PDF original</a><a href="/api/documents/${encodeURIComponent(id)}/receipt/pdf">Baixar comprovante</a><a href="/verify/${encodeURIComponent(id)}">Verificar assinaturas</a></main></body></html>`;
  return new NextResponse(html,{status:422,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
 }
}

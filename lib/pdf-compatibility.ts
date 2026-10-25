import { PDFDocument } from 'pdf-lib';

export const INCOMPATIBLE_PDF_MESSAGE = 'Este PDF não é compatível com o Selo. O arquivo possui proteção ou criptografia que impede a geração do documento com comprovantes de assinatura. Exporte uma cópia em PDF sem essa proteção e tente novamente.';

/** Validate the same PDF operation used to produce the combined download. */
export async function validatePdfForSigning(bytes: Uint8Array): Promise<'ok'|'protected'|'invalid'> {
 try {
  const pdf = await PDFDocument.load(bytes);
  // Some PDFs can be read but cannot be copied into a new document.
  const destination = await PDFDocument.create();
  const pages = await destination.copyPages(pdf, pdf.getPageIndices());
  for (const page of pages) destination.addPage(page);
  await destination.save();
  return 'ok';
 } catch (error) {
  const reason = error instanceof Error ? error.message : '';
  return /encrypted|encryption|password|security handler/i.test(reason) ? 'protected' : 'invalid';
 }
}

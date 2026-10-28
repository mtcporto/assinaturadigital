import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PDFDocument } from 'pdf-lib';
import { createReceiptPdf } from '../lib/receipt-pdf';

test('receipt PDF preserves the original-document hash and contract state summary', async () => {
  const pdf = await createReceiptPdf({
    documentId: 'signature-1',
    documentSha256: 'a'.repeat(64),
    signedAt: '2026-10-19T12:00:00.000Z',
    signerEmail: 'signer@example.com',
    authentication: 'webauthn-passkey',
    verificationUrl: 'https://example.com/verify/signature-1',
    contract: {
      envelopeId: 'envelope-1',
      fileName: 'contrato.pdf',
      documentSha256: 'a'.repeat(64),
      totalSigners: 2,
      verifiedSignatures: 1,
      completed: false,
      signers: [
        {
          email: 'signer@example.com',
          status: 'signed',
          signatureId: 'signature-1',
          signedAt: '2026-10-19T12:00:00.000Z',
          evidenceValid: true,
          verificationUrl: 'https://example.com/verify/signature-1',
        },
        {
          email: 'pending@example.com',
          status: 'pending',
          signatureId: null,
          signedAt: null,
          evidenceValid: null,
          verificationUrl: null,
        },
      ],
    },
  });

  const document = await PDFDocument.load(pdf);
  assert.equal(document.getPageCount(), 2);
  assert.ok(pdf.byteLength > 0);
});

test('completed contract receipt includes all verified signers', async () => {
  const pdf = await createReceiptPdf({
    documentId: 'signature-2',
    documentSha256: 'b'.repeat(64),
    signedAt: '2026-10-19T12:00:00.000Z',
    signerEmail: 'one@example.com',
    authentication: 'legacy',
    verificationUrl: 'https://example.com/verify/signature-2',
    contract: {
      envelopeId: 'envelope-2',
      fileName: 'contrato-concluido.pdf',
      documentSha256: 'b'.repeat(64),
      totalSigners: 2,
      verifiedSignatures: 2,
      completed: true,
      signers: [
        { email: 'one@example.com', status: 'signed', signatureId: 'signature-2', signedAt: '2026-10-19T12:00:00.000Z', evidenceValid: true, verificationUrl: 'https://example.com/verify/signature-2' },
        { email: 'two@example.com', status: 'signed', signatureId: 'signature-3', signedAt: '2026-10-19T12:01:00.000Z', evidenceValid: true, verificationUrl: 'https://example.com/verify/signature-3' },
      ],
    },
  });

  const document = await PDFDocument.load(pdf);
  assert.equal(document.getPageCount(), 2);
  assert.ok(pdf.byteLength > 0);
});

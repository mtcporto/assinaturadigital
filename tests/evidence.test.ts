import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { makeEvidence, sealEvidence, verifyDocument, verifySeal, sha256 } from '../lib/evidence';

test('tampering with document or evidence invalidates proof', () => {
  process.env.EVIDENCE_HMAC_KEY = 'ab'.repeat(32);
  const pdf = new TextEncoder().encode('%PDF-1.7 original');
  const e = makeEvidence({ documentSha256: sha256(pdf), signerId: 'user-1', signerEmail: 'user@example.com', consentText: 'Aceito assinar', consentAt: new Date().toISOString() });
  const mac = sealEvidence(e);
  assert.equal(verifyDocument(e, mac, pdf), true);
  assert.equal(verifyDocument(e, mac, new TextEncoder().encode('%PDF-1.7 altered')), false);
  assert.equal(verifySeal({ ...e, signerEmail: 'other@example.com' }, mac), false);
  assert.equal(verifySeal(e, '0'.repeat(64)), false);
});

import { createHash, createHmac, timingSafeEqual, randomUUID } from 'node:crypto';

export type Evidence = {
  version: 1;
  id: string;
  documentSha256: string;
  signerId: string;
  signerEmail: string;
  consentText: string;
  consentAt: string;
  createdAt: string;
};

export function sha256(data: Uint8Array): string {
  return createHash('sha256').update(data).digest('hex');
}

export function makeEvidence(input: Omit<Evidence, 'version' | 'id' | 'createdAt'>): Evidence {
  return { version: 1, id: randomUUID(), createdAt: new Date().toISOString(), ...input };
}

// Explicit canonical serialization: avoid dependence on object key insertion order.
export function canonicalEvidence(e: Evidence): string {
  return JSON.stringify([e.version,e.id,e.documentSha256,e.signerId,e.signerEmail,e.consentText,e.consentAt,e.createdAt]);
}

function key(): Buffer {
  const raw = process.env.EVIDENCE_HMAC_KEY;
  if (!raw || !/^[0-9a-fA-F]{64,}$/.test(raw) || raw.length % 2 !== 0) {
    throw new Error('EVIDENCE_HMAC_KEY must contain at least 32 random bytes as hex');
  }
  return Buffer.from(raw, 'hex');
}

export function sealEvidence(e: Evidence): string {
  return createHmac('sha256', key()).update(canonicalEvidence(e)).digest('hex');
}

export function verifySeal(e: Evidence, mac: string): boolean {
  if (!/^[a-f0-9]{64}$/i.test(mac)) return false;
  const actual = Buffer.from(sealEvidence(e), 'hex');
  return timingSafeEqual(actual, Buffer.from(mac, 'hex'));
}

export function verifyDocument(e: Evidence, mac: string, pdf: Uint8Array): boolean {
  return verifySeal(e, mac) && sha256(pdf) === e.documentSha256;
}

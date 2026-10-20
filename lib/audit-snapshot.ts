import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export type AuditSnapshotRow = {
 id: string; document_id: string; event_type: string; actor_id: string;
 created_at: string; details_json: string;
};
export type AuditSnapshot = {
 version: 1; createdAt: string; eventCount: number; digest: string; mac: string;
};

// Sort by stable identifiers: the snapshot must not depend on SQL row order.
export function auditDigest(rows: AuditSnapshotRow[]): string {
 const ordered = [...rows].sort((a, b) => a.id.localeCompare(b.id));
 const canonical = JSON.stringify(ordered.map(r => [
  r.id, r.document_id, r.event_type, r.actor_id, r.created_at, r.details_json
 ]));
 return createHash('sha256').update(canonical).digest('hex');
}

function secret(): Buffer {
 const value = process.env.EVIDENCE_HMAC_KEY;
 if (!value || !/^[0-9a-f]{64,}$/i.test(value) || value.length % 2 !== 0)
  throw new Error('EVIDENCE_HMAC_KEY is required');
 return Buffer.from(value, 'hex');
}

function macPayload(snapshot: Omit<AuditSnapshot, 'mac'>): string {
 return JSON.stringify([snapshot.version, snapshot.createdAt, snapshot.eventCount, snapshot.digest]);
}

export function createAuditSnapshot(rows: AuditSnapshotRow[], createdAt: string): AuditSnapshot {
 const body = { version: 1 as const, createdAt, eventCount: rows.length, digest: auditDigest(rows) };
 const mac = createHmac('sha256', secret()).update(macPayload(body)).digest('hex');
 return { ...body, mac };
}

export function verifyAuditSnapshot(snapshot: AuditSnapshot, rows: AuditSnapshotRow[]): boolean {
 if (snapshot.version !== 1 || !/^[a-f0-9]{64}$/i.test(snapshot.mac) ||
     !/^[a-f0-9]{64}$/i.test(snapshot.digest)) return false;
 const expected = createHmac('sha256', secret()).update(macPayload(snapshot)).digest();
 if (!timingSafeEqual(expected, Buffer.from(snapshot.mac, 'hex'))) return false;
 return snapshot.eventCount === rows.length && snapshot.digest === auditDigest(rows);
}

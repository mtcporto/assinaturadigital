-- Phase 6: multi-party signing foundation. Additive: existing documents stay unchanged.
-- Apply manually in Turso only when the new multi-signer endpoints are ready.
CREATE TABLE IF NOT EXISTS envelope_signatures (
 id TEXT PRIMARY KEY,
 envelope_id TEXT NOT NULL REFERENCES signing_envelopes(id),
 recipient_id TEXT REFERENCES envelope_recipients(id),
 signer_id TEXT NOT NULL,
 signer_email TEXT NOT NULL,
 document_sha256 TEXT NOT NULL CHECK(length(document_sha256)=64),
 evidence_json TEXT NOT NULL,
 evidence_mac TEXT NOT NULL,
 signed_at TEXT NOT NULL,
 UNIQUE(envelope_id, signer_id),
 UNIQUE(recipient_id)
);
CREATE INDEX IF NOT EXISTS envelope_signatures_envelope_idx ON envelope_signatures(envelope_id, signed_at);
CREATE INDEX IF NOT EXISTS envelope_signatures_signer_idx ON envelope_signatures(signer_id, signed_at);
-- A single envelope is the document/process; each signature is an independently verifiable record.
-- A signature references the immutable PDF hash, not a second R2 object.

-- Phase 5: envelopes for invitations to third-party signers.
-- Apply manually in Turso before enabling the invitation endpoint.
-- Existing signed documents and evidence remain unchanged.
CREATE TABLE IF NOT EXISTS signing_envelopes (
 id TEXT PRIMARY KEY,
 owner_id TEXT NOT NULL,
 owner_email TEXT NOT NULL,
 object_key TEXT NOT NULL UNIQUE,
 document_sha256 TEXT NOT NULL CHECK(length(document_sha256)=64),
 file_name TEXT NOT NULL,
 created_at TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','completed','cancelled'))
);
CREATE TABLE IF NOT EXISTS envelope_recipients (
 id TEXT PRIMARY KEY,
 envelope_id TEXT NOT NULL REFERENCES signing_envelopes(id),
 email TEXT NOT NULL,
 token_sha256 TEXT NOT NULL UNIQUE CHECK(length(token_sha256)=64),
 created_at TEXT NOT NULL,
 expires_at TEXT NOT NULL,
 signed_at TEXT,
 document_id TEXT UNIQUE REFERENCES documents(id),
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','signed','cancelled','expired'))
);
CREATE INDEX IF NOT EXISTS envelope_recipients_envelope_idx ON envelope_recipients(envelope_id,status);
CREATE INDEX IF NOT EXISTS signing_envelopes_owner_idx ON signing_envelopes(owner_id,created_at);

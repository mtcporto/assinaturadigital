-- Apply once with Turso CLI; avoid destructive automatic migrations.
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  sha256 TEXT NOT NULL CHECK(length(sha256) = 64),
  object_key TEXT NOT NULL UNIQUE,
  signer_id TEXT NOT NULL,
  signer_email TEXT NOT NULL,
  consent_text TEXT NOT NULL,
  consent_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  evidence_json TEXT NOT NULL,
  evidence_mac TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'signed' CHECK(status IN ('signed', 'revoked'))
);
CREATE TABLE IF NOT EXISTS audit_events (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id),
  event_type TEXT NOT NULL,
  actor_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  details_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS audit_events_document_idx ON audit_events(document_id, created_at);

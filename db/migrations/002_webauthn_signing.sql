-- Selo v2 — phase 2.2: document-bound WebAuthn signing intentions.
-- Apply manually. Existing documents and signing route are unchanged.
CREATE TABLE IF NOT EXISTS signing_intents (
  id TEXT PRIMARY KEY,
  signer_id TEXT NOT NULL,
  signer_email TEXT NOT NULL,
  document_sha256 TEXT NOT NULL CHECK(length(document_sha256) = 64),
  consent_sha256 TEXT NOT NULL CHECK(length(consent_sha256) = 64),
  object_key TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  document_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','completed','expired'))
);
CREATE INDEX IF NOT EXISTS signing_intents_signer_idx
 ON signing_intents(signer_id, status, expires_at);
CREATE INDEX IF NOT EXISTS signing_intents_expiry_idx
 ON signing_intents(status, expires_at);
-- Do not make passkey mandatory until the new end-to-end flow has been tested.

-- Selo v2: WebAuthn/passkeys groundwork. Apply manually to Turso before enabling routes.
-- Store only public-key credential material; never biometric templates.
CREATE TABLE IF NOT EXISTS webauthn_credentials (
  credential_id TEXT PRIMARY KEY,
  signer_id TEXT NOT NULL,
  public_key BLOB NOT NULL,
  counter INTEGER NOT NULL DEFAULT 0 CHECK(counter >= 0),
  transports_json TEXT NOT NULL DEFAULT '[]',
  device_type TEXT,
  backed_up INTEGER NOT NULL DEFAULT 0 CHECK(backed_up IN (0, 1)),
  created_at TEXT NOT NULL,
  last_used_at TEXT
);
CREATE INDEX IF NOT EXISTS webauthn_credentials_signer_idx ON webauthn_credentials(signer_id);

-- Challenges must be short-lived, single-use, and tied to the authenticated account.
-- For signing, document_sha256 and consent_sha256 bind the assertion to this operation.
CREATE TABLE IF NOT EXISTS webauthn_challenges (
  id TEXT PRIMARY KEY,
  signer_id TEXT NOT NULL,
  challenge TEXT NOT NULL UNIQUE,
  purpose TEXT NOT NULL CHECK(purpose IN ('register', 'sign')),
  document_sha256 TEXT,
  consent_sha256 TEXT,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  created_at TEXT NOT NULL,
  CHECK (
    (purpose = 'register' AND document_sha256 IS NULL AND consent_sha256 IS NULL)
    OR (purpose = 'sign' AND length(document_sha256) = 64 AND length(consent_sha256) = 64)
  )
);
CREATE INDEX IF NOT EXISTS webauthn_challenges_signer_idx ON webauthn_challenges(signer_id, purpose, expires_at);

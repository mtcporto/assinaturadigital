CREATE TABLE IF NOT EXISTS invitation_email_deliveries (
 recipient_id TEXT PRIMARY KEY REFERENCES envelope_recipients(id),
 resend_email_id TEXT UNIQUE,
 status TEXT NOT NULL CHECK(status IN ('accepted','delivered','bounced','complained','delayed','failed')),
 updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_invitation_email_resend_id ON invitation_email_deliveries(resend_email_id);

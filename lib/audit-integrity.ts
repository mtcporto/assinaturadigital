import { type Evidence, verifySeal } from './evidence';

export type DocumentRecord = {
 id: string; sha256: string; signer_id: string; signer_email: string;
 consent_text: string; consent_at: string; created_at: string;
 evidence_json: string; evidence_mac: string; status: string;
};

export type AuditEvent = {
 event_type: string; actor_id: string; details_json: string;
};

export type IntegrityResult = { valid: boolean; issues: string[]; evidenceVersion: number | null };

export function checkRecordIntegrity(record: DocumentRecord, events: AuditEvent[]): IntegrityResult {
 const issues: string[] = [];
 let evidence: Evidence;
 try {
  evidence = JSON.parse(record.evidence_json) as Evidence;
  if (!evidence || (evidence.version !== 1 && evidence.version !== 2)) throw new Error('version');
  if (!verifySeal(evidence, record.evidence_mac)) issues.push('invalid_evidence_seal');
 } catch {
  return { valid: false, issues: ['invalid_evidence'], evidenceVersion: null };
 }
 const fields: Array<[keyof DocumentRecord, string]> = [
  ['id', evidence.id], ['sha256', evidence.documentSha256],
  ['signer_id', evidence.signerId], ['signer_email', evidence.signerEmail],
  ['consent_text', evidence.consentText], ['consent_at', evidence.consentAt],
  ['created_at', evidence.createdAt]
 ];
 for (const [column, expected] of fields) {
  if (record[column] !== expected) issues.push('mismatch_' + column);
 }
 if (record.status !== 'signed') issues.push('unexpected_status');
 const expectedType = evidence.version === 2 ? 'signed_webauthn' : 'signed';
 const signingEvents = events.filter(event => event.event_type === expectedType && event.actor_id === evidence.signerId);
 if (signingEvents.length !== 1) issues.push('missing_or_duplicate_signing_event');
 if (evidence.version === 2) {
  const proof = evidence.webauthn;
  if (!proof) issues.push('missing_webauthn_proof');
  for (const event of signingEvents) {
   try {
    const details = JSON.parse(event.details_json);
    if (!proof || details.intentId !== proof.intentId ||
     details.credentialId !== proof.credentialId ||
     details.documentSha256 !== evidence.documentSha256 ||
     details.consentSha256 !== proof.consentSha256 ||
     details.counter !== proof.counter) issues.push('webauthn_audit_mismatch');
   } catch { issues.push('invalid_audit_json'); }
  }
 }
 return { valid: issues.length === 0, issues, evidenceVersion: evidence.version };
}

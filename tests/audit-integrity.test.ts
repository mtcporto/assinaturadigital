import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEvidence, sealEvidence } from '../lib/evidence';
import { checkRecordIntegrity } from '../lib/audit-integrity';

test('sealed version 2 evidence matches Turso columns and audit event', () => {
 process.env.EVIDENCE_HMAC_KEY = 'a'.repeat(64);
 const evidence = makeEvidence({documentSha256:'b'.repeat(64),signerId:'google:123',signerEmail:'test@example.com',consentText:'Aceito',consentAt:'2026-10-19T00:00:00.000Z'});
 evidence.version=2;
 evidence.webauthn={intentId:'intent-1',credentialId:'credential-1',challenge:'challenge',assertionSha256:'c'.repeat(64),consentSha256:'d'.repeat(64),rpId:'example.com',origin:'https://example.com',counter:0};
 const record={id:evidence.id,sha256:evidence.documentSha256,signer_id:evidence.signerId,signer_email:evidence.signerEmail,consent_text:evidence.consentText,consent_at:evidence.consentAt,created_at:evidence.createdAt,evidence_json:JSON.stringify(evidence),evidence_mac:sealEvidence(evidence),status:'signed'};
 const event={event_type:'signed_webauthn',actor_id:evidence.signerId,details_json:JSON.stringify({intentId:'intent-1',credentialId:'credential-1',documentSha256:evidence.documentSha256,consentSha256:'d'.repeat(64),counter:0})};
 assert.equal(checkRecordIntegrity(record,[event]).valid,true);
 assert.ok(checkRecordIntegrity({...record,sha256:'0'.repeat(64)},[event]).issues.includes('mismatch_sha256'));
 assert.ok(checkRecordIntegrity(record,[{...event,details_json:JSON.stringify({intentId:'wrong'})}]).issues.includes('webauthn_audit_mismatch'));
 assert.ok(checkRecordIntegrity(record,[]).issues.includes('missing_or_duplicate_signing_event'));
});

test('historical v1 evidence with signed_webauthn event remains verifiable', () => {
 process.env.EVIDENCE_HMAC_KEY = 'a'.repeat(64);
 const evidence = makeEvidence({documentSha256:'b'.repeat(64),signerId:'google:123',signerEmail:'test@example.com',consentText:'Aceito',consentAt:'2026-10-19T00:00:00.000Z'});
 const record={id:evidence.id,sha256:evidence.documentSha256,signer_id:evidence.signerId,signer_email:evidence.signerEmail,consent_text:evidence.consentText,consent_at:evidence.consentAt,created_at:evidence.createdAt,evidence_json:JSON.stringify(evidence),evidence_mac:sealEvidence(evidence),status:'signed'};
 const historical={event_type:'signed_webauthn',actor_id:evidence.signerId,details_json:'{}'};
 assert.equal(checkRecordIntegrity(record,[historical]).valid,true);
 assert.equal(checkRecordIntegrity(record,[{...historical,actor_id:'other'}]).valid,false);
 assert.equal(checkRecordIntegrity({...record,evidence_mac:'0'.repeat(64)},[historical]).valid,false);
 assert.equal(checkRecordIntegrity(record,[historical,{...historical,event_type:'signed'}]).valid,false);
 assert.equal(checkRecordIntegrity(record,[{...historical,event_type:'signed'}]).valid,true);
});

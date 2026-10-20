import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAuditSnapshot, verifyAuditSnapshot } from '../lib/audit-snapshot';

test('audit snapshot detects edits, removals and insertions regardless of ordering', () => {
 process.env.EVIDENCE_HMAC_KEY = 'a'.repeat(64);
 const a = {id:'a',document_id:'doc-1',event_type:'signed_webauthn',actor_id:'user-1',created_at:'2026-10-19T00:00:00Z',details_json:'{"counter":0}'};
 const b = {...a,id:'b',event_type:'viewed'};
 const snapshot=createAuditSnapshot([a,b],'2026-10-19T01:00:00Z');
 assert.equal(verifyAuditSnapshot(snapshot,[b,a]),true);
 assert.equal(verifyAuditSnapshot(snapshot,[a]),false);
 assert.equal(verifyAuditSnapshot(snapshot,[a,b,{...a,id:'c'}]),false);
 assert.equal(verifyAuditSnapshot(snapshot,[{...a,details_json:'{"counter":1}'},b]),false);
 assert.equal(verifyAuditSnapshot({...snapshot,eventCount:3},[a,b]),false);
});

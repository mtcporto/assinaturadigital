import { NextRequest, NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { db } from '../../../../../lib/db';
import { getPdf } from '../../../../../lib/r2';
import { sha256 } from '../../../../../lib/evidence';
import { checkRecordIntegrity, type DocumentRecord, type AuditEvent } from '../../../../../lib/audit-integrity';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest, context: { params: Promise<{ id: string }> }) {
 const session = await auth();
 if (!session?.user?.id) return NextResponse.json({ error: 'authentication_required' }, { status: 401 });
 const { id } = await context.params;
 if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))
  return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
 try {
  const client = db();
  const result = await client.execute({
   sql: 'SELECT id, sha256, object_key, signer_id, signer_email, consent_text, consent_at, created_at, evidence_json, evidence_mac, status FROM documents WHERE id = ? AND signer_id = ? LIMIT 1',
   args: [id, session.user.id]
  });
  const record = result.rows[0];
  if (!record) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const events = await client.execute({
   sql: 'SELECT event_type, actor_id, details_json FROM audit_events WHERE document_id = ?',
   args: [id]
  });
  const integrity = checkRecordIntegrity(record as unknown as DocumentRecord, events.rows as unknown as AuditEvent[]);
  if (!integrity.valid) return NextResponse.json({ valid: false, evidenceValid: false, pdfMatchesEvidence: null, issues: integrity.issues }, { status: 422, headers: { 'Cache-Control': 'no-store' } });
  const evidence = JSON.parse(String(record.evidence_json)) as { documentSha256: string };
  let pdf: Uint8Array;
  try { pdf = await getPdf(String(record.object_key)); }
  catch { return NextResponse.json({ valid: false, evidenceValid: true, pdfMatchesEvidence: null, issues: ['pdf_unavailable'] }, { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
  const matches = sha256(pdf) === evidence.documentSha256;
  return NextResponse.json({
   valid: matches, evidenceValid: true, pdfMatchesEvidence: matches,
   issues: matches ? [] : ['pdf_hash_mismatch'],
   evidenceVersion: integrity.evidenceVersion
  }, { status: matches ? 200 : 422, headers: { 'Cache-Control': 'no-store' } });
 } catch {
  return NextResponse.json({ error: 'integrity_check_unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } });
 }
}

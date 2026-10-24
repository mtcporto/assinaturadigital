import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../lib/db';
import { checkRecordIntegrity, type DocumentRecord, type AuditEvent } from '../../../../lib/audit-integrity';
import { verifySeal, type Evidence } from '../../../../lib/evidence';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ valid: false, reason: 'invalid_id' }, { status: 400 });
  }
  try {
    const result = await db().execute({
      sql: 'SELECT id, sha256, signer_id, signer_email, consent_text, consent_at, created_at, evidence_json, evidence_mac, status FROM documents WHERE id = ? LIMIT 1',
      args: [id],
    });
    const record = result.rows[0];
    if (!record) {
      const ledger = await db().execute({sql:`SELECT s.evidence_json,s.evidence_mac,s.document_sha256,s.signer_id,s.signer_email,s.signed_at,e.document_sha256 AS envelope_sha256,r.status AS recipient_status FROM envelope_signatures s JOIN signing_envelopes e ON e.id=s.envelope_id JOIN envelope_recipients r ON r.id=s.recipient_id WHERE s.id=? LIMIT 1`,args:[id]});
      const signature=ledger.rows[0];
      if(!signature)return NextResponse.json({valid:false,reason:'not_found'},{status:404});
      try{
        const evidence=JSON.parse(String(signature.evidence_json)) as Evidence;
        const valid=verifySeal(evidence,String(signature.evidence_mac))&&evidence.id===id&&evidence.version===2&&!!evidence.webauthn&&evidence.signerId===signature.signer_id&&evidence.signerEmail===signature.signer_email&&evidence.documentSha256===signature.document_sha256&&evidence.documentSha256===signature.envelope_sha256&&signature.recipient_status==='signed';
        return NextResponse.json({valid,reason:valid?'record_seal_valid':'invalid_evidence',documentSha256:valid?evidence.documentSha256:undefined,createdAt:valid?evidence.createdAt:undefined,authentication:valid?'webauthn-passkey':undefined,note:valid?'Registro autenticado. Para validar um PDF específico, compare seu SHA-256 ao documentSha256 retornado.':undefined},{status:valid?200:422,headers:{'Cache-Control':'no-store'}});
      }catch{return NextResponse.json({valid:false,reason:'invalid_evidence'},{status:422});}
    }
    const eventResult = await db().execute({
      sql: 'SELECT event_type, actor_id, details_json FROM audit_events WHERE document_id = ?',
      args: [id],
    });
    const integrity = checkRecordIntegrity(record as unknown as DocumentRecord, eventResult.rows as unknown as AuditEvent[]);
    const valid = integrity.valid;
    const evidence = valid ? JSON.parse(String(record.evidence_json)) as { documentSha256: string; createdAt: string; version: number } : null;
    return NextResponse.json(
      { valid, reason: valid ? 'record_seal_valid' : 'invalid_evidence', documentSha256: valid ? evidence?.documentSha256 : undefined, createdAt: valid ? evidence?.createdAt : undefined, authentication: valid ? (evidence?.version === 2 ? 'webauthn-passkey' : 'legacy') : undefined,
        note: valid ? 'Registro autenticado. Para validar um PDF específico, compare seu SHA-256 ao documentSha256 retornado.' : undefined },
      { status: valid ? 200 : 422, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json({ valid: false, reason: 'verification_unavailable' }, { status: 503 });
  }
}

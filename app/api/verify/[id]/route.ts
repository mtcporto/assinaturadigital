import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../lib/db';
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
      sql: 'SELECT evidence_json, evidence_mac, status FROM documents WHERE id = ? LIMIT 1',
      args: [id],
    });
    const record = result.rows[0];
    if (!record) return NextResponse.json({ valid: false, reason: 'not_found' }, { status: 404 });
    const evidence = JSON.parse(String(record.evidence_json)) as Evidence;
    const valid = evidence.id === id && record.status === 'signed' && verifySeal(evidence, String(record.evidence_mac));
    return NextResponse.json(
      { valid, reason: valid ? 'record_seal_valid' : 'invalid_evidence', documentSha256: valid ? evidence.documentSha256 : undefined, createdAt: valid ? evidence.createdAt : undefined,
        note: valid ? 'Registro autenticado. Para validar um PDF específico, compare seu SHA-256 ao documentSha256 retornado.' : undefined },
      { status: valid ? 200 : 422, headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return NextResponse.json({ valid: false, reason: 'verification_unavailable' }, { status: 503 });
  }
}

import { NextResponse } from 'next/server';
import { currentSigner } from '../../../../lib/webauthn';
import { db } from '../../../../lib/db';
export const runtime = 'nodejs';
export async function GET() {
 const signer = await currentSigner();
 if (!signer) return NextResponse.json({ error: 'authentication_required' }, { status: 401 });
 try {
  const rows = await db().execute({ sql: 'SELECT credential_id, created_at, last_used_at FROM webauthn_credentials WHERE signer_id = ? ORDER BY created_at DESC', args: [signer.id] });
  return NextResponse.json({ credentials: rows.rows.map(r => ({ id: String(r.credential_id), createdAt: String(r.created_at), lastUsedAt: r.last_used_at ? String(r.last_used_at) : null })) }, { headers: { 'Cache-Control': 'no-store' } });
 } catch { return NextResponse.json({ error: 'credentials_unavailable' }, { status: 503 }); }
}

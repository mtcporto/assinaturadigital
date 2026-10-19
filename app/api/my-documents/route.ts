import { NextResponse } from 'next/server';
import { auth } from '../../../auth';
import { db } from '../../../lib/db';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET() {
 const session = await auth();
 if (!session?.user?.id) return NextResponse.json({ error: 'authentication_required' }, { status: 401 });
 try {
  const result = await db().execute({
   sql: `SELECT d.id,d.sha256,d.created_at,d.status,
      (SELECT json_extract(a.details_json,'$.fileName') FROM audit_events a
       WHERE a.document_id=d.id AND a.event_type='signed' ORDER BY a.created_at LIMIT 1) AS file_name
      FROM documents d WHERE d.signer_id=? ORDER BY d.created_at DESC LIMIT 100`,
   args: [session.user.id]
  });
  return NextResponse.json({ documents: result.rows.map(r => ({
   id: String(r.id), sha256: String(r.sha256), createdAt: String(r.created_at),
   status: String(r.status), fileName: typeof r.file_name === 'string' ? r.file_name : 'Documento PDF'
  })) }, { headers: { 'Cache-Control': 'private, no-store' } });
 } catch { return NextResponse.json({ error: 'documents_unavailable' }, { status: 503 }); }
}

import { NextRequest, NextResponse } from 'next/server';
import { checkAuditSnapshot } from '../../../../../lib/audit-archive';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
 const secret = process.env.AUDIT_CRON_SECRET;
 if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`)
  return NextResponse.json({error:'unauthorized'}, {status:401});
 let key: unknown;
 try {
  const body: unknown = await request.json();
  key = body && typeof body === 'object' && 'key' in body ? body.key : undefined;
 } catch {
  return NextResponse.json({error:'invalid_json'}, {status:400});
 }
 if (typeof key !== 'string' || !/^audit\/v1\/\d{4}-\d{2}-\d{2}\/[0-9a-f-]{36}\.json$/.test(key))
  return NextResponse.json({error:'invalid_key'}, {status:400});
 try {
  const result = await checkAuditSnapshot(key);
  return NextResponse.json({
   valid: result.valid,
   key,
   eventCount: result.snapshot.eventCount,
   currentEventCount: result.currentEventCount,
   digest: result.snapshot.digest,
   checkedAt: new Date().toISOString()
  }, {headers:{'Cache-Control':'no-store'}});
 } catch (error) {
  console.error('audit_snapshot_verify_failed', error instanceof Error ? error.message : 'unknown_error');
  return NextResponse.json({error:'verification_unavailable'}, {status:503,headers:{'Cache-Control':'no-store'}});
 }
}

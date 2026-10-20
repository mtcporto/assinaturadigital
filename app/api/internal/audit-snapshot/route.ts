import { NextRequest, NextResponse } from 'next/server';
import { archiveAuditSnapshot } from '../../../../lib/audit-archive';

export const runtime='nodejs';
export const dynamic='force-dynamic';

export async function POST(request: NextRequest) {
 const secret=process.env.AUDIT_CRON_SECRET;
 if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`)
  return NextResponse.json({error:'unauthorized'},{status:401});
 try {
  const {key,snapshot}=await archiveAuditSnapshot();
  return NextResponse.json({archived:true,key,eventCount:snapshot.eventCount,digest:snapshot.digest},
   {headers:{'Cache-Control':'no-store'}});
 } catch {
  return NextResponse.json({error:'archive_unavailable'},{status:503,headers:{'Cache-Control':'no-store'}});
 }
}

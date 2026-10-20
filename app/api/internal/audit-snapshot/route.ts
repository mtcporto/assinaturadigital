import { NextRequest, NextResponse } from 'next/server';
import { archiveAuditSnapshot } from '../../../../lib/audit-archive';

export const runtime='nodejs';
export const dynamic='force-dynamic';

async function execute(request: NextRequest) {
 const secret = request.method === 'GET' ? process.env.CRON_SECRET : process.env.AUDIT_CRON_SECRET;
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

// Vercel Cron uses GET and automatically sends Authorization: Bearer CRON_SECRET.
export async function GET(request: NextRequest) { return execute(request); }
export async function POST(request: NextRequest) { return execute(request); }

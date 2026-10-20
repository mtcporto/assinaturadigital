import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
// Legacy signing must not bypass the passkey confirmation requirement.
export async function POST() {
 return NextResponse.json({ error: 'use_passkey_signing_flow' }, { status: 410, headers: { 'Cache-Control': 'no-store' } });
}

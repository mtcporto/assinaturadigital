import { NextResponse } from 'next/server';

// Fail closed until verified sign-in, explicit consent, R2 upload and an atomic
// evidence+audit persistence flow are implemented. Never accept signer identity
// directly from untrusted request JSON.
export async function POST() {
  return NextResponse.json({ error: 'Signing is not enabled yet' }, { status: 503 });
}

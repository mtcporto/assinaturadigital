import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { currentSigner, relyingParty } from '../../../../../lib/webauthn';
import { db } from '../../../../../lib/db';
export const runtime = 'nodejs';
export async function POST(request: Request) {
 const signer = await currentSigner();
 if (!signer) return NextResponse.json({ error: 'authentication_required' }, { status: 401 });
 if (request.headers.get('origin') !== relyingParty().origin) return NextResponse.json({ error: 'invalid_origin' }, { status: 403 });
 try {
  const { rpID } = relyingParty();
  const credentials = await db().execute({ sql: 'SELECT credential_id, transports_json FROM webauthn_credentials WHERE signer_id = ?', args: [signer.id] });
  if (credentials.rows.length >= 10) return NextResponse.json({ error: 'credential_limit' }, { status: 429 });
  const options = await generateRegistrationOptions({
   rpName: 'Selo', rpID, userName: signer.email,
   userID: signer.id,
   attestationType: 'none',
   authenticatorSelection: { residentKey: 'preferred', userVerification: 'required' },
   excludeCredentials: credentials.rows.map(row => ({ id: String(row.credential_id), type: 'public-key' as const, transports: JSON.parse(String(row.transports_json)) }))
  });
  const id = randomUUID(), now = new Date(), expires = new Date(now.getTime() + 300000);
  await db().execute({
   sql: "INSERT INTO webauthn_challenges (id, signer_id, challenge, purpose, expires_at, created_at) VALUES (?, ?, ?, 'register', ?, ?)",
   args: [id, signer.id, options.challenge, expires.toISOString(), now.toISOString()]
  });
  return NextResponse.json({ options, challengeId: id }, { headers: { 'Cache-Control': 'no-store' } });
 } catch { return NextResponse.json({ error: 'registration_unavailable' }, { status: 503 }); }
}

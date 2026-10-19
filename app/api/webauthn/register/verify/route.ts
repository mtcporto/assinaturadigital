import { NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { currentSigner, consumeChallenge, relyingParty } from '../../../../../lib/webauthn';
import { db } from '../../../../../lib/db';
export const runtime = 'nodejs';
export async function POST(request: Request) {
 const signer = await currentSigner();
 if (!signer) return NextResponse.json({ error: 'authentication_required' }, { status: 401 });
 let rp: ReturnType<typeof relyingParty>;
 try { rp = relyingParty(); } catch { return NextResponse.json({ error: 'registration_unavailable' }, { status: 503 }); }
 if (request.headers.get('origin') !== rp.origin) return NextResponse.json({ error: 'invalid_origin' }, { status: 403 });
 let payload: { challengeId?: string; response?: any };
 try { payload = await request.json(); } catch { return NextResponse.json({ error: 'invalid_request' }, { status: 400 }); }
 if (typeof payload.challengeId !== 'string' || !payload.response || typeof payload.response !== 'object') return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
 try {
  const challenge = await db().execute({
   sql: "SELECT challenge FROM webauthn_challenges WHERE id = ? AND signer_id = ? AND purpose = 'register' AND consumed_at IS NULL AND expires_at > ? LIMIT 1",
   args: [payload.challengeId, signer.id, new Date().toISOString()]
  });
  if (!challenge.rows[0]) return NextResponse.json({ error: 'challenge_expired' }, { status: 400 });
  const expectedChallenge = String(challenge.rows[0].challenge);
  if (!await consumeChallenge(payload.challengeId, signer.id, expectedChallenge)) return NextResponse.json({ error: 'challenge_used' }, { status: 400 });
  const result = await verifyRegistrationResponse({
   response: payload.response, expectedChallenge, expectedOrigin: rp.origin, expectedRPID: rp.rpID, requireUserVerification: true
  });
  if (!result.verified || !result.registrationInfo) return NextResponse.json({ error: 'verification_failed' }, { status: 400 });
  const { credential, credentialDeviceType, credentialBackedUp } = result.registrationInfo;
  await db().execute({
   sql: 'INSERT INTO webauthn_credentials (credential_id, signer_id, public_key, counter, transports_json, device_type, backed_up, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
   args: [credential.id, signer.id, Buffer.from(credential.publicKey), credential.counter, JSON.stringify(credential.transports ?? []), credentialDeviceType, credentialBackedUp ? 1 : 0, new Date().toISOString()]
  });
  return NextResponse.json({ registered: true }, { headers: { 'Cache-Control': 'no-store' } });
 } catch { return NextResponse.json({ error: 'verification_failed' }, { status: 400 }); }
}

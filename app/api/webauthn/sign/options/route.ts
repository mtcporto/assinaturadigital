import { NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { currentSigner, relyingParty } from '../../../../../lib/webauthn';
import { db } from '../../../../../lib/db';
export const runtime = 'nodejs';
export async function POST(request: Request) {
 const signer = await currentSigner();
 if (!signer) return NextResponse.json({ error: 'authentication_required' }, { status: 401 });
 let rp: ReturnType<typeof relyingParty>;
 try { rp = relyingParty(); } catch { return NextResponse.json({ error: 'webauthn_not_configured' }, { status: 503 }); }
 if (request.headers.get('origin') !== rp.origin) return NextResponse.json({ error: 'invalid_origin' }, { status: 403 });
 let payload: { intentId?: string };
 try { payload = await request.json(); } catch { return NextResponse.json({ error: 'invalid_request' }, { status: 400 }); }
 if (typeof payload.intentId !== 'string' || !/^[0-9a-f-]{36}$/i.test(payload.intentId)) return NextResponse.json({ error: 'invalid_intent' }, { status: 400 });
 try {
  const client = db(), now = new Date();
  const intent = await client.execute({ sql: "SELECT document_sha256, consent_sha256, expires_at FROM signing_intents WHERE id = ? AND signer_id = ? AND status = 'pending' AND consumed_at IS NULL AND expires_at > ? LIMIT 1", args: [payload.intentId, signer.id, now.toISOString()] });
  if (!intent.rows[0]) return NextResponse.json({ error: 'intent_expired' }, { status: 409 });
  const credentials = await client.execute({ sql: 'SELECT credential_id, transports_json FROM webauthn_credentials WHERE signer_id = ?', args: [signer.id] });
  if (!credentials.rows.length) return NextResponse.json({ error: 'passkey_required' }, { status: 409 });
  const options = await generateAuthenticationOptions({
   rpID: rp.rpID, userVerification: 'required',
   allowCredentials: credentials.rows.map(row => ({ id: Buffer.from(String(row.credential_id), 'base64url'), type: 'public-key' as const, transports: JSON.parse(String(row.transports_json)) }))
  });
  const challengeId = payload.intentId;
  await client.execute({ sql: "INSERT INTO webauthn_challenges (id, signer_id, challenge, purpose, document_sha256, consent_sha256, expires_at, created_at) VALUES (?, ?, ?, 'sign', ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET challenge = excluded.challenge, expires_at = excluded.expires_at, consumed_at = NULL WHERE webauthn_challenges.signer_id = excluded.signer_id AND webauthn_challenges.consumed_at IS NULL",
   args: [challengeId, signer.id, options.challenge, String(intent.rows[0].document_sha256), String(intent.rows[0].consent_sha256), new Date(Math.min(now.getTime()+120000, Date.parse(String(intent.rows[0].expires_at ?? new Date(now.getTime()+120000).toISOString())))).toISOString(), now.toISOString()] });
  return NextResponse.json({ challengeId, options, intentId: payload.intentId }, { headers: { 'Cache-Control': 'no-store' } });
 } catch { return NextResponse.json({ error: 'challenge_unavailable' }, { status: 503 }); }
}

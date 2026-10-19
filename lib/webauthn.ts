import { auth } from '../auth';
import { db } from './db';

export async function currentSigner() {
 const session = await auth();
 return session?.user?.id && session.user.email ? { id: session.user.id, email: session.user.email } : null;
}
export function relyingParty() {
 const rpID = process.env.WEBAUTHN_RP_ID;
 const origin = process.env.WEBAUTHN_ORIGIN;
 if (!rpID || !origin) throw new Error('WebAuthn origin/RP ID not configured');
 const url = new URL(origin);
 if (url.hostname !== rpID || (url.protocol !== 'https:' && url.hostname !== 'localhost') || url.pathname !== '/' || url.search || url.hash) throw new Error('Invalid WebAuthn configuration');
 return { rpID, origin: url.origin };
}
export async function consumeChallenge(id: string, signerId: string, challenge: string) {
 const result = await db().execute({
  sql: "UPDATE webauthn_challenges SET consumed_at = ? WHERE id = ? AND signer_id = ? AND challenge = ? AND purpose = 'register' AND consumed_at IS NULL AND expires_at > ? RETURNING id",
  args: [new Date().toISOString(), id, signerId, challenge, new Date().toISOString()]
 });
 return result.rows.length === 1;
}

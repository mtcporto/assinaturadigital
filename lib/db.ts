import { createClient } from '@libsql/client';

export function db() {
  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  if (!url || !authToken) throw new Error('Turso not configured');
  return createClient({ url, authToken });
}

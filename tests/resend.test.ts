import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { sendInvitationEmail } from '../lib/resend';

const originalEnv = { ...process.env };
const originalFetch = globalThis.fetch;

afterEach(() => {
  process.env = { ...originalEnv };
  globalThis.fetch = originalFetch;
});

const input = { to: 'recipient@example.com', url: 'https://example.test/invite/token', fileName: 'test.pdf', expiresAt: '2026-10-30T00:00:00.000Z' };

test('disabled mode does not call Resend', async () => {
  process.env.RESEND_MODE = 'disabled';
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error('must not call network'); };
  assert.deepEqual(await sendInvitationEmail(input), { status: 'disabled' });
  assert.equal(calls, 0);
});

test('sandbox mode simulates delivery without calling Resend', async () => {
  process.env.RESEND_MODE = 'sandbox';
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error('must not call network'); };
  assert.deepEqual(await sendInvitationEmail(input), { status: 'sandbox' });
  assert.equal(calls, 0);
});

test('live mode sends through the API and returns the provider id', async () => {
  process.env.RESEND_MODE = 'live';
  process.env.VERCEL_ENV = 'production';
  process.env.RESEND_API_KEY = 'test-key';
  process.env.RESEND_FROM_EMAIL = 'test@example.com';
  let request: Request | undefined;
  globalThis.fetch = async (input) => {
    request = input instanceof Request ? input : new Request(String(input));
    return new Response(JSON.stringify({ id: 'resend-test-id' }), { status: 200 });
  };
  assert.deepEqual(await sendInvitationEmail(input), { status: 'sent', id: 'resend-test-id' });
  assert.equal(request?.url, 'https://api.resend.com/emails');
});

test('live mode is blocked in Preview', async () => {
  process.env.RESEND_MODE = 'live';
  process.env.VERCEL_ENV = 'preview';
  process.env.RESEND_API_KEY = 'test-key';
  process.env.RESEND_FROM_EMAIL = 'test@example.com';
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error('must not call network'); };
  assert.deepEqual(await sendInvitationEmail(input), { status: 'disabled' });
  assert.equal(calls, 0);
});

test('live mode is allowed only in explicitly supported local or production environments', async () => {
  process.env.RESEND_MODE = 'live';
  process.env.RESEND_API_KEY = 'test-key';
  process.env.RESEND_FROM_EMAIL = 'test@example.com';
  for (const vercelEnv of ['development', undefined]) {
    if (vercelEnv === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = vercelEnv;
    globalThis.fetch = async () => new Response(JSON.stringify({ id: 'resend-test-id' }), { status: 200 });
    assert.deepEqual(await sendInvitationEmail(input), { status: 'sent', id: 'resend-test-id' });
  }
});

test('live mode fails closed for an unexpected Vercel environment', async () => {
  process.env.RESEND_MODE = 'live';
  process.env.VERCEL_ENV = 'qa';
  process.env.RESEND_API_KEY = 'test-key';
  process.env.RESEND_FROM_EMAIL = 'test@example.com';
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error('must not call network'); };
  assert.deepEqual(await sendInvitationEmail(input), { status: 'disabled' });
  assert.equal(calls, 0);
});

test('missing mode defaults to disabled', async () => {
  delete process.env.RESEND_MODE;
  process.env.RESEND_API_KEY = 'test-key';
  process.env.RESEND_FROM_EMAIL = 'test@example.com';
  let calls = 0;
  globalThis.fetch = async () => { calls++; throw new Error('must not call network'); };
  assert.deepEqual(await sendInvitationEmail(input), { status: 'disabled' });
  assert.equal(calls, 0);
});

import assert from 'node:assert/strict';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { Session, readCookie, seal, setCookie, unseal } from './session.js';

// Run with: npx tsx api/_lib/session.check.ts
// The session cookie is the only thing standing between a public URL and the
// user's calendar, so its sealing has to be checked by something runnable.

process.env.SESSION_SECRET = 'check-secret';

const session: Session = {
  refreshToken: '1//refresh-token-value',
  sub: '1234567890',
  email: 'someone@example.com',
  name: '홍길동',
  picture: 'https://example.com/a.png',
};

const sealed = seal(session);
assert.deepEqual(unseal(sealed), session, 'a sealed session must survive the round trip');
assert.ok(!sealed.includes('refresh-token-value'), 'the refresh token must not be readable');
assert.notEqual(seal(session), sealed, 'each seal must use a fresh IV');

// Flipping one character of the ciphertext must invalidate the whole cookie.
const tail = sealed.at(-1) === 'A' ? 'B' : 'A';
assert.equal(unseal(sealed.slice(0, -1) + tail), null, 'a tampered cookie must not unseal');

process.env.SESSION_SECRET = 'a-different-secret';
assert.equal(unseal(sealed), null, 'a cookie from another key must not unseal');
process.env.SESSION_SECRET = 'check-secret';

const req = {
  headers: { cookie: 'other=1; gtc_session=abc%20def; trailing=2' },
} as unknown as IncomingMessage;
assert.equal(readCookie(req, 'gtc_session'), 'abc def');
assert.equal(readCookie(req, 'missing'), null);
assert.equal(readCookie({ headers: {} } as IncomingMessage, 'gtc_session'), null);

// Two cookies set on one response must both survive.
const headers: Record<string, string | string[]> = {};
const res = {
  getHeader: (name: string) => headers[name],
  setHeader: (name: string, value: string | string[]) => {
    headers[name] = value;
  },
} as unknown as ServerResponse;
setCookie(req, res, 'a', '1', 60);
setCookie(req, res, 'b', '2', 60);
assert.equal((headers['Set-Cookie'] as string[]).length, 2, 'Set-Cookie must append, not replace');

console.log('session checks passed');

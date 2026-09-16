import type { IncomingMessage, ServerResponse } from 'node:http';
import { exchange, isAllowed, readIdToken } from '../_lib/google.js';
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  STATE_COOKIE,
  baseUrl,
  clearCookie,
  readCookie,
  redirect,
  seal,
  setCookie,
} from '../_lib/session.js';

const fail = (req: IncomingMessage, res: ServerResponse, reason: string) => {
  clearCookie(req, res, STATE_COOKIE);
  redirect(res, `/?auth_error=${encodeURIComponent(reason)}`);
};

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const base = baseUrl(req);
  const query = new URL(req.url ?? '/', base).searchParams;

  if (query.get('error')) return fail(req, res, query.get('error') as string);

  const state = query.get('state');
  const expectedState = readCookie(req, STATE_COOKIE);
  if (!state || !expectedState || state !== expectedState) {
    return fail(req, res, 'state_mismatch');
  }

  const code = query.get('code');
  if (!code) return fail(req, res, 'missing_code');

  const tokens = await exchange({
    code,
    grant_type: 'authorization_code',
    redirect_uri: `${base}/api/auth/callback`,
  });

  if (!tokens.refresh_token || !tokens.id_token) {
    return fail(req, res, tokens.error ?? 'no_refresh_token');
  }

  const claims = readIdToken(tokens.id_token);
  if (!claims?.email) return fail(req, res, 'no_email');
  if (!isAllowed(claims.email)) return fail(req, res, 'not_allowed');

  setCookie(
    req,
    res,
    SESSION_COOKIE,
    seal({
      refreshToken: tokens.refresh_token,
      sub: claims.sub,
      email: claims.email,
      name: claims.name ?? null,
      picture: claims.picture ?? null,
    }),
    SESSION_MAX_AGE
  );
  clearCookie(req, res, STATE_COOKIE);
  redirect(res, '/');
}

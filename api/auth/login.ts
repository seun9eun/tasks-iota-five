import crypto from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { AUTH_ENDPOINT, SCOPES } from '../_lib/google.js';
import { STATE_COOKIE, baseUrl, redirect, requireEnv, setCookie } from '../_lib/session.js';

export default function handler(req: IncomingMessage, res: ServerResponse) {
  const state = crypto.randomBytes(16).toString('base64url');
  setCookie(req, res, STATE_COOKIE, state, 600);

  const url = new URL(AUTH_ENDPOINT);
  url.searchParams.set('client_id', requireEnv('GOOGLE_CLIENT_ID'));
  url.searchParams.set('redirect_uri', `${baseUrl(req)}/api/auth/callback`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', SCOPES.join(' '));
  url.searchParams.set('state', state);
  // offline + consent is what makes Google hand back a refresh token; without
  // the forced consent it omits one on every sign-in after the first.
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'consent');

  redirect(res, url.toString());
}

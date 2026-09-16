import type { IncomingMessage, ServerResponse } from 'node:http';
import { exchange } from './_lib/google.js';
import { SESSION_COOKIE, clearCookie, readSession, sendJson } from './_lib/session.js';

/**
 * Hands the browser a short-lived Google API access token. The refresh token
 * that produces it stays server-side, so the page can come back an hour or a
 * week later and still be signed in.
 */
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const session = readSession(req);
  if (!session) return sendJson(res, 401, { error: 'unauthenticated' });

  const tokens = await exchange({
    grant_type: 'refresh_token',
    refresh_token: session.refreshToken,
  });

  if (!tokens.access_token) {
    // The user revoked access or changed their password: the stored refresh
    // token is dead, so drop the session instead of retrying forever.
    clearCookie(req, res, SESSION_COOKIE);
    return sendJson(res, 401, { error: tokens.error ?? 'refresh_failed' });
  }

  sendJson(res, 200, {
    user: {
      uid: session.sub,
      displayName: session.name,
      email: session.email,
      photoURL: session.picture,
    },
    accessToken: tokens.access_token,
    expiresIn: tokens.expires_in ?? 3600,
  });
}

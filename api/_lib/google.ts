import { requireEnv } from './session';

export const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/tasks',
];

export const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
export const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

export type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  id_token?: string;
  error?: string;
  error_description?: string;
};

export const exchange = async (params: Record<string, string>): Promise<TokenResponse> => {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: requireEnv('GOOGLE_CLIENT_ID'),
      client_secret: requireEnv('GOOGLE_CLIENT_SECRET'),
      ...params,
    }),
  });
  return (await res.json()) as TokenResponse;
};

export type IdTokenClaims = {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
};

/**
 * Reads the claims out of an ID token. Google just handed this token to us
 * over TLS in exchange for our client secret, so the payload is trustworthy
 * without a signature check — do NOT reuse this on a token from a client.
 */
export const readIdToken = (idToken: string): IdTokenClaims | null => {
  const payload = idToken.split('.')[1];
  if (!payload) return null;
  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as IdTokenClaims;
  } catch {
    return null;
  }
};

/**
 * This dashboard shows one person's calendar and tasks, and it sits on a public
 * URL. Fail closed: with no allowlist configured, nobody gets in.
 */
export const isAllowed = (email: string): boolean => {
  const allowed = (process.env.ALLOWED_EMAILS ?? '')
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.trim().toLowerCase());
};

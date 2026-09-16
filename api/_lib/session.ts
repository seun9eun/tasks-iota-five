import crypto from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

// The refresh token lives inside an encrypted cookie instead of a database.
// It is the only long-lived credential in the system, so it never reaches the
// browser in readable form and never leaves the server unencrypted.

export type Session = {
  refreshToken: string;
  sub: string;
  email: string;
  name: string | null;
  picture: string | null;
};

export const SESSION_COOKIE = 'gtc_session';
export const STATE_COOKIE = 'gtc_oauth_state';

// Google refresh tokens for a published app do not expire on a timer, so keep
// the cookie around for half a year and let Google decide when it is done.
export const SESSION_MAX_AGE = 180 * 24 * 60 * 60;

export const requireEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set.`);
  return value;
};

const encryptionKey = (): Buffer =>
  crypto.createHash('sha256').update(requireEnv('SESSION_SECRET')).digest();

export const seal = (session: Session): string => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(session), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64url');
};

export const unseal = (raw: string): Session | null => {
  try {
    const buf = Buffer.from(raw, 'base64url');
    const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), buf.subarray(0, 12));
    decipher.setAuthTag(buf.subarray(12, 28));
    const out = Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]);
    return JSON.parse(out.toString('utf8')) as Session;
  } catch {
    // A tampered, truncated or re-keyed cookie is simply not a session.
    return null;
  }
};

export const readCookie = (req: IncomingMessage, name: string): string | null => {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() === name) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return null;
};

export const readSession = (req: IncomingMessage): Session | null => {
  const raw = readCookie(req, SESSION_COOKIE);
  return raw ? unseal(raw) : null;
};

export const baseUrl = (req: IncomingMessage): string => {
  const first = (value: string | string[] | undefined, fallback: string) =>
    String(Array.isArray(value) ? value[0] : (value ?? fallback)).split(',')[0].trim();
  const proto = first(req.headers['x-forwarded-proto'], 'http');
  const host = first(req.headers['x-forwarded-host'] ?? req.headers.host, 'localhost:3000');
  return `${proto}://${host}`;
};

export const setCookie = (
  req: IncomingMessage,
  res: ServerResponse,
  name: string,
  value: string,
  maxAge: number
) => {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAge}`,
  ];
  // Secure would make the cookie unusable over plain http://localhost.
  if (baseUrl(req).startsWith('https://')) parts.push('Secure');

  const previous = res.getHeader('Set-Cookie');
  const existing = Array.isArray(previous) ? previous : previous ? [String(previous)] : [];
  res.setHeader('Set-Cookie', [...existing, parts.join('; ')]);
};

export const clearCookie = (req: IncomingMessage, res: ServerResponse, name: string) =>
  setCookie(req, res, name, '', 0);

export const sendJson = (res: ServerResponse, status: number, body: unknown) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
};

export const redirect = (res: ServerResponse, location: string) => {
  res.statusCode = 302;
  res.setHeader('Location', location);
  res.end();
};

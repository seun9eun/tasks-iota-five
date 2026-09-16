import type { IncomingMessage, ServerResponse } from 'node:http';
import { SESSION_COOKIE, clearCookie, sendJson } from './_lib/session';

export default function handler(req: IncomingMessage, res: ServerResponse) {
  clearCookie(req, res, SESSION_COOKIE);
  sendJson(res, 200, { ok: true });
}

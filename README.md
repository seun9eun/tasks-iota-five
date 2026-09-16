# Google Tasks & Calendar Dashboard

A single-page dashboard over Google Tasks and Google Calendar. Without a signed-in
Google account it runs in demo mode against local sample data.

Originally exported from AI Studio: https://ai.studio/apps/35469fc6-e9fb-44b3-92b7-9958aa8bb99f

## How sign-in works

Google API access tokens last an hour, and a browser-only app cannot renew one
without either a popup or a user gesture — Google removed the silent iframe
flow. So the OAuth exchange happens server-side instead:

- `/api/auth/login` sends the user to Google's consent screen.
- `/api/auth/callback` trades the code for a refresh token, checks the account
  against `ALLOWED_EMAILS`, and stores the refresh token inside an encrypted,
  HttpOnly session cookie. There is no database.
- `/api/token` turns that cookie into a fresh access token. The page calls it on
  load and again whenever a Google request comes back 401.
- `/api/logout` clears the cookie.

The browser never holds a long-lived credential, and the session survives
reloads, restarts and other devices.

In production Vercel serves everything under `api/` as serverless functions. In
development the same files run inside Vite through the `dev-api` plugin in
[vite.config.ts](vite.config.ts), so there is one implementation of each
endpoint rather than two.

## Setup

### 1. Google Cloud Console

In the project you want to own this app:

1. Enable the **Google Calendar API** and the **Google Tasks API**.
2. Configure the OAuth consent screen and **publish it to production**. While it
   is in testing, refresh tokens expire after 7 days and you will be signed out
   every week. An unverified published app shows a warning screen on first
   consent, which you can accept for personal use.
3. Create an OAuth client of type **Web application** and add these
   **authorized redirect URIs**:
   - `http://localhost:3000/api/auth/callback`
   - `https://<your-app>.vercel.app/api/auth/callback`

   A desktop-type client will not work — it has no redirect URI for the web.

### 2. Environment variables

Copy [.env.example](.env.example) to `.env` and fill in all four values. Set the
same four in Vercel under Project Settings → Environment Variables.

`ALLOWED_EMAILS` is the access control for the whole deployment. The dashboard
sits on a public URL, so an empty list lets nobody in — that is deliberate.

### 3. Run

```
npm install
npm run dev      # http://localhost:3000
```

The port is pinned with `--strictPort`. If Vite fell back to another port the
redirect URI would no longer match and sign-in would break.

Changing `.env` needs a dev server restart; it is read once at startup.

## Commands

| Command | Does |
| --- | --- |
| `npm run dev` | Vite dev server plus the API endpoints on port 3000 |
| `npm run build` | Production build into `dist/` |
| `npm run lint` | `tsc --noEmit` |
| `npm run check` | Session cookie sealing self-check |

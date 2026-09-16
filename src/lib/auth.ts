import { AuthUser } from '../types';

// Auth lives on the server. The browser never holds a long-lived credential:
// it asks /api/token for a fresh access token, and the encrypted session
// cookie backing that call is what survives reloads, restarts and new devices.

let accessToken: string | null = null;
let refreshInFlight: Promise<string | null> | null = null;

type TokenResponse = {
  user: AuthUser;
  accessToken: string;
  expiresIn: number;
};

const requestToken = async (): Promise<TokenResponse | null> => {
  const res = await fetch('/api/token', { credentials: 'same-origin' });
  if (!res.ok) return null;
  return (await res.json()) as TokenResponse;
};

export const getAccessToken = (): string | null => accessToken;

export const refreshAccessToken = async (): Promise<string | null> => {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    try {
      const data = await requestToken();
      accessToken = data?.accessToken ?? null;
      if (!accessToken) console.warn('Token refresh failed: the session is gone.');
      return accessToken;
    } catch (err) {
      console.warn('Token refresh failed:', err);
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
};

export const initAuth = (
  onAuthSuccess?: (user: AuthUser, token: string) => void,
  onAuthFailure?: () => void
) => {
  let cancelled = false;

  requestToken()
    .then((data) => {
      if (cancelled) return;
      if (data) {
        accessToken = data.accessToken;
        onAuthSuccess?.(data.user, data.accessToken);
      } else {
        onAuthFailure?.();
      }
    })
    .catch((err) => {
      if (cancelled) return;
      console.warn('Auth check failed:', err);
      onAuthFailure?.();
    });

  return () => {
    cancelled = true;
  };
};

export const googleSignIn = () => {
  window.location.href = '/api/auth/login';
};

export const clearStoredAuth = () => {
  accessToken = null;
};

export const logout = async () => {
  try {
    await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
  } catch (err) {
    console.warn('Sign out request failed:', err);
  }
  accessToken = null;
};

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { AuthUser } from '../types';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

const SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/tasks',
];

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));

let isSigningIn = false;
let cachedAccessToken: string | null = null;

const TOKEN_KEY = 'g_access_token';
const USER_KEY = 'g_user_info';
const TOKEN_TIME_KEY = 'g_token_saved_at';

export const isSavedTokenExpired = (): boolean => {
  const savedTokenTime = localStorage.getItem(TOKEN_TIME_KEY);
  if (!savedTokenTime) return true;
  const elapsed = Date.now() - parseInt(savedTokenTime, 10);
  // Expire after 55 minutes (Google tokens expire at 60 mins)
  return isNaN(elapsed) || elapsed > 55 * 60 * 1000;
};

// ==========================================
// Silent Access Token Refresh (Google Identity Services)
//
// Firebase issues the Google API access token once at sign-in and never renews
// it, so the dashboard used to drop out of Google mode after ~55 minutes. GIS
// can mint a fresh token for the same OAuth client without a popup, as long as
// the user still has a live Google session and has already granted the scopes.
// ==========================================

const saveToken = (token: string) => {
  cachedAccessToken = token;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(TOKEN_TIME_KEY, Date.now().toString());
};

const getSavedUser = (): AuthUser | null => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
};

let gisLoader: Promise<void> | null = null;

const loadGis = (): Promise<void> => {
  if ((window as any).google?.accounts?.oauth2) return Promise.resolve();
  if (gisLoader) return gisLoader;
  gisLoader = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      gisLoader = null;
      reject(new Error('Google 인증 스크립트를 불러오지 못했습니다.'));
    };
    document.head.appendChild(script);
  });
  return gisLoader;
};

let tokenClient: any = null;
let refreshInFlight: Promise<string | null> | null = null;

/**
 * Requests a new access token without showing a popup.
 * Returns null when Google declines (session gone, consent revoked) — the
 * caller is then responsible for asking the user to sign in again.
 */
export const refreshAccessToken = async (): Promise<string | null> => {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async (): Promise<string | null> => {
    try {
      await loadGis();

      if (!tokenClient) {
        tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: (firebaseConfig as any).oAuthClientId,
          scope: SCOPES.join(' '),
          callback: () => {},
        });
      }

      const token = await new Promise<string | null>((resolve) => {
        // GIS can stay silent on some failures, so never wait forever.
        const timer = setTimeout(() => resolve(null), 15000);
        const finish = (value: string | null) => {
          clearTimeout(timer);
          resolve(value);
        };
        tokenClient.callback = (res: any) => finish(res?.access_token ?? null);
        tokenClient.error_callback = () => finish(null);
        tokenClient.requestAccessToken({
          prompt: '',
          hint: getSavedUser()?.email ?? undefined,
        });
      });

      if (!token) return null;
      saveToken(token);
      return token;
    } catch (err) {
      console.warn('Silent token refresh failed:', err);
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
  // The restore path and onAuthStateChanged can both resolve to the same token;
  // only report it once so the app does not load Google data twice.
  let notifiedToken: string | null = null;
  const succeed = (user: AuthUser, token: string) => {
    if (notifiedToken === token) return;
    notifiedToken = token;
    onAuthSuccess?.(user, token);
  };

  // Restore the previous session. A stale token is renewed silently instead of
  // signing the user out.
  const savedUser = getSavedUser();
  if (savedUser) {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    if (savedToken && !isSavedTokenExpired()) {
      cachedAccessToken = savedToken;
      succeed(savedUser, savedToken);
    } else {
      refreshAccessToken().then((token) => {
        if (token) {
          succeed(savedUser, token);
        } else {
          clearStoredAuth();
          onAuthFailure?.();
        }
      });
    }
  }

  return onAuthStateChanged(auth, async (firebaseUser: User | null) => {
    if (!firebaseUser) {
      if (!getSavedUser()) {
        cachedAccessToken = null;
        onAuthFailure?.();
      }
      return;
    }

    const userObj: AuthUser = {
      uid: firebaseUser.uid,
      displayName: firebaseUser.displayName,
      email: firebaseUser.email,
      photoURL: firebaseUser.photoURL,
    };
    localStorage.setItem(USER_KEY, JSON.stringify(userObj));

    // googleSignIn() stores its own token right after the popup resolves; don't
    // race it with a refresh here.
    if (isSigningIn) return;

    const token = getAccessToken() ?? (await refreshAccessToken());
    if (token) {
      saveToken(token);
      succeed(userObj, token);
    } else {
      clearStoredAuth();
      onAuthFailure?.();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: AuthUser; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Google OAuth 액세스 토큰을 가져오지 못했습니다.');
    }

    const user: AuthUser = {
      uid: result.user.uid,
      displayName: result.user.displayName,
      email: result.user.email,
      photoURL: result.user.photoURL,
    };

    saveToken(credential.accessToken);
    localStorage.setItem(USER_KEY, JSON.stringify(user));

    return { user, accessToken: credential.accessToken };
  } catch (error: any) {
    console.warn('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  // A stale token is not a sign-out: refreshAccessToken() can replace it.
  if (isSavedTokenExpired()) return null;
  return cachedAccessToken || localStorage.getItem(TOKEN_KEY);
};

export const clearStoredAuth = () => {
  cachedAccessToken = null;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TOKEN_TIME_KEY);
};

export const logout = async () => {
  try {
    await signOut(auth);
  } catch (e) {
    console.warn('Sign out error:', e);
  }
  clearStoredAuth();
};

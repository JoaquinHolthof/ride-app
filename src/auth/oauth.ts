import type { SupabaseClient } from '@supabase/supabase-js';
import { AUTH_CALLBACK_URL, parseAuthCallback, type AuthCallback } from './redirects';
import type { CallbackResult } from './callbacks';

export const googleUnavailable = 'Google sign-in needs an iOS or Android RIDE development build. Use email and password in Expo Go or web preview.';
type BrowserResult = { type: string; url?: string };
type Auth = Pick<SupabaseClient['auth'], 'signInWithOAuth'>;
export function createGoogleSignIn({ auth, supported, projectUrl, openBrowser, complete }: {
  auth: Auth;
  supported: boolean;
  projectUrl: string;
  openBrowser: (url: string, redirect: string) => Promise<BrowserResult>;
  complete: (callback: AuthCallback) => Promise<CallbackResult>;
}) {
  let pending: Promise<CallbackResult | { status: 'cancelled'; message: string }> | null = null;
  return () => {
    if (pending) return pending;
    pending = (async (): Promise<CallbackResult | { status: 'cancelled'; message: string }> => {
      if (!supported) return { status: 'error', message: googleUnavailable };
      try {
        const { data, error } = await auth.signInWithOAuth({ provider: 'google', options: {
          redirectTo: AUTH_CALLBACK_URL, skipBrowserRedirect: true,
        } });
        if (error || !data.url) throw new Error();
        const url = new URL(data.url);
        if (url.origin !== new URL(projectUrl).origin || url.pathname !== '/auth/v1/authorize'
          || url.protocol !== 'https:' || url.username || url.password) throw new Error();
        const result = await openBrowser(data.url, AUTH_CALLBACK_URL);
        if (result.type === 'cancel' || result.type === 'dismiss') return {
          status: 'cancelled', message: 'Sign-in was cancelled. You can try again or use email and password.',
        };
        if (result.type !== 'success' || !result.url) throw new Error();
        return await complete(parseAuthCallback(result.url));
      } catch { return { status: 'error', message: 'Google sign-in could not complete. Check your connection and try again. If it keeps failing, ask the project owner to check the Google provider and redirect settings.' }; }
    })().finally(() => { pending = null; });
    return pending;
  };
}

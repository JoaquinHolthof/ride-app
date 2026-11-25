export const AUTH_CALLBACK_URL = 'rideapp://auth/callback';
export const AUTH_CALLBACK_ROUTE = '/auth/callback' as const;

export function mobileAuthSupported(platform: string, executionEnvironment: string) {
  return platform !== 'web' && executionEnvironment !== 'storeClient';
}

export function emailRedirect(mobile: boolean, landingUrl?: string) {
  if (mobile) return { url: AUTH_CALLBACK_URL, error: null };
  // Preserve existing email signup: an omitted override uses the dashboard Site URL.
  // The owner must replace its localhost default with the hosted confirmation page.
  if (!landingUrl?.trim()) return { url: undefined, error: null };
  // Expo Go cannot register RIDE's scheme. No exp:// or LAN fallback.
  try {
    const url = new URL(landingUrl ?? '');
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash
      || !url.hostname.includes('.') || /^localhost$|\.localhost$|\.local$/.test(url.hostname)
      || /^[\d.]+$/.test(url.hostname) || url.hostname.includes(':')) throw new Error();
    return { url: url.href, error: null };
  } catch {
    return { url: undefined, error: 'The email confirmation redirect is misconfigured. Ask the project owner to use a valid hosted HTTPS URL or remove the override to use the Supabase Site URL. Existing accounts can still log in.' };
  }
}

export type AuthCallback = { kind: 'code'; code: string } | { kind: 'error'; message: string };
export const callbackRecovery = 'This sign-in link could not be completed. It may be expired, already used, or opened on a different installation. If your email is confirmed, log in with your password. Otherwise use the latest confirmation email or try signing up again.';

export function parseAuthCallback(raw: string): AuthCallback {
  const invalid = (): AuthCallback => ({ kind: 'error', message: callbackRecovery });
  try {
    if (raw.length > 8192) return invalid();
    const url = new URL(raw);
    if (url.protocol !== 'rideapp:' || url.host !== 'auth' || url.pathname !== '/callback'
      || url.username || url.password) return invalid();
    const fragment = new URLSearchParams(url.hash.slice(1));
    const query = url.searchParams;
    // Do not ingest implicit tokens, token hashes, reset links or arbitrary return destinations.
    if (url.hash && [...fragment.keys()].some(key => key !== 'error' && key !== 'error_code' && key !== 'error_description')) return invalid();
    if ([...query.keys()].some(key => !['code', 'error', 'error_code', 'error_description', 'type'].includes(key))) return invalid();
    if (query.has('type') && query.get('type') !== 'signup') return invalid();
    if (query.has('error') || query.has('error_code') || fragment.has('error') || fragment.has('error_code')) {
      const errorCode = query.get('error_code') ?? fragment.get('error_code');
      const cancelled = (!errorCode || errorCode === 'access_denied')
        && (query.get('error') === 'access_denied' || fragment.get('error') === 'access_denied');
      return { kind: 'error', message: cancelled ? 'Sign-in was cancelled. You can try again or use email and password.' : callbackRecovery };
    }
    const codes = query.getAll('code');
    if (codes.length !== 1 || !/^[A-Za-z0-9_-]{1,2048}$/.test(codes[0])) return invalid();
    return { kind: 'code', code: codes[0] };
  } catch { return invalid(); }
}

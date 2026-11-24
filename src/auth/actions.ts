import type { SupabaseClient } from '@supabase/supabase-js';

export function credentialsError(email: string, password: string, signup: boolean) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Enter a valid email address.';
  if (!password) return 'Enter your password.';
  if (signup && password.length < 8) return 'Use at least 8 characters for your password.';
  return null;
}
export function authError(error: unknown): string {
  // Never reflect raw server/native error messages (which may contain sensitive input).
  const code = error && typeof error === 'object' && 'code' in error ? error.code : null;
  switch (code) {
    case 'invalid_credentials': return 'Email or password is incorrect. Please try again.';
    case 'email_not_confirmed': return 'Confirm your email before logging in. Check your inbox and spam folder.';
    case 'weak_password': return 'Choose a stronger password that meets the project password policy.';
    case 'over_request_rate_limit': case 'over_email_send_rate_limit': return 'Too many attempts. Wait a few minutes before trying again.';
    case 'signup_disabled': return 'Sign up is currently unavailable. Please try again later.';
    default: return 'Authentication did not complete. Check your connection and try again.';
  }
}
type Auth = Pick<SupabaseClient['auth'], 'signUp' | 'signInWithPassword' | 'signOut'>;
export async function submitCredentials(auth: Auth, mode: 'login' | 'signup', email: string, password: string) {
  const invalid = credentialsError(email, password, mode === 'signup');
  if (invalid) return { error: invalid, confirmation: false };
  try {
    const input = { email: email.trim(), password }; // Passwords are never trimmed or stored by RIDE.
    const { data, error } = mode === 'signup' ? await auth.signUp(input) : await auth.signInWithPassword(input);
    if (error) return { error: authError(error), confirmation: false };
    return { error: null, confirmation: mode === 'signup' && !data.session };
  } catch { return { error: authError(null), confirmation: false }; }
}
export async function signOutLocally(auth: Auth): Promise<string | null> {
  try {
    const { error } = await auth.signOut({ scope: 'local' });
    return error ? 'Could not sign out. Check your connection and try again.' : null;
  } catch { return 'Could not sign out securely. Unlock your device and try again.'; }
}

import type { SupabaseClient } from '@supabase/supabase-js';
import { callbackRecovery, type AuthCallback } from './redirects';

export type CallbackResult = { status: 'success' | 'error'; message: string };
type Auth = Pick<SupabaseClient['auth'], 'exchangeCodeForSession' | 'getSession'>;

export function createCallbackProcessor(auth: Auth) {
  // Shared by the browser result and Router, including Strict Mode remounts.
  // Codes stay only in bounded process memory, never logs, disk or navigation state.
  const completed = new Map<string, Promise<CallbackResult>>();
  let exchanging = false;
  return (callback: AuthCallback): Promise<CallbackResult> => {
    if (callback.kind === 'error') return Promise.resolve({ status: 'error', message: callback.message });
    const previous = completed.get(callback.code);
    if (previous) return previous;
    if (exchanging) return Promise.resolve({ status: 'error', message: 'Another sign-in is finishing. Wait, then try again.' });
    exchanging = true;
    const work = (async (): Promise<CallbackResult> => {
      try {
        const current = await auth.getSession();
        if (current.error) throw new Error();
        // A stray link must not replace an existing account's session.
        if (current.data.session) return { status: 'success', message: 'You are already signed in. Continue to RIDE.' };
        const { data, error } = await auth.exchangeCodeForSession(callback.code);
        if (error || !data.session) throw new Error();
        return { status: 'success', message: 'Sign-in complete. Continue to RIDE.' };
      } catch { return { status: 'error', message: callbackRecovery }; }
      finally { exchanging = false; }
    })();
    if (completed.size >= 16) completed.delete(completed.keys().next().value!);
    completed.set(callback.code, work);
    return work;
  };
}

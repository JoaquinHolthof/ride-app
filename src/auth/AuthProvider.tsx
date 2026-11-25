import { createContext, useContext, useEffect, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { AppState, Platform } from 'react-native';
import { configurationError, supabase } from './client';
import { initialAuthState, observeAuth } from './lifecycle';
import type { AuthState } from './lifecycle';
import { signOutLocally, submitCredentials } from './actions';
import { googleAvailabilityMessage, signInWithGoogle, signupRedirect } from './runtime';
import { ensurePkceCrypto } from './pkce-crypto';

interface AuthContextValue {
  state: AuthState;
  configurationError: string | null;
  retry: () => void;
  submit: (mode: 'login' | 'signup', email: string, password: string) => Promise<{ error: string | null; confirmation: boolean }>;
  signOut: () => Promise<string | null>;
  google: typeof signInWithGoogle;
  googleAvailabilityMessage: string | null;
}
const AuthContext = createContext<AuthContextValue | null>(null);
export function AuthProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<AuthState>(initialAuthState);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!supabase) return;
    return observeAuth(supabase.auth, setState, Platform.OS === 'web' ? undefined : AppState);
  }, [attempt]);
  const value: AuthContextValue = {
    state, configurationError,
    retry: () => { setState(initialAuthState); setAttempt(value => value + 1); },
    submit: async (mode, email, password) => {
      if (!supabase) return { error: 'Authentication is not configured.', confirmation: false };
      if (mode === 'signup') {
        if (signupRedirect.error) return { error: signupRedirect.error, confirmation: false };
        try { ensurePkceCrypto(); }
        catch { return { error: 'Secure authentication is unavailable. Restart RIDE and try again.', confirmation: false }; }
      }
      return submitCredentials(supabase.auth, mode, email, password, signupRedirect.url);
    },
    google: signInWithGoogle,
    googleAvailabilityMessage,
    signOut: () => supabase ? signOutLocally(supabase.auth) : Promise.resolve('Authentication is not configured.'),
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('AuthProvider is required.');
  return context;
}

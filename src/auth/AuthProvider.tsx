import { createContext, useContext, useEffect, useState } from 'react';
import type { PropsWithChildren } from 'react';
import { AppState, Platform } from 'react-native';
import { configurationError, supabase } from './client';
import { initialAuthState, observeAuth } from './lifecycle';
import type { AuthState } from './lifecycle';
import { signOutLocally, submitCredentials } from './actions';

interface AuthContextValue {
  state: AuthState;
  configurationError: string | null;
  retry: () => void;
  submit: (mode: 'login' | 'signup', email: string, password: string) => Promise<{ error: string | null; confirmation: boolean }>;
  signOut: () => Promise<string | null>;
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
    submit: (mode, email, password) => supabase ? submitCredentials(supabase.auth, mode, email, password)
      : Promise.resolve({ error: 'Authentication is not configured.', confirmation: false }),
    signOut: () => supabase ? signOutLocally(supabase.auth) : Promise.resolve('Authentication is not configured.'),
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('AuthProvider is required.');
  return context;
}

import 'react-native-url-polyfill/auto';
import { createClient, processLock } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { authConfig } from './config';
import { sessionStorage } from './session-storage';

// Explicit property access is required for Expo's public environment substitution.
const config = authConfig(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_KEY);
export const configurationError = config.error ?? null;
export const supabase = config.error ? null : createClient(config.url!, config.key!, {
  auth: {
    storage: sessionStorage,
    persistSession: true,
    // Native refresh is owned by the provider's AppState lifecycle, including initial state.
    autoRefreshToken: Platform.OS === 'web',
    detectSessionInUrl: false,
    lock: processLock,
    debug: false,
  },
});

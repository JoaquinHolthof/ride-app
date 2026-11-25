import Constants from 'expo-constants';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from './client';
import { createCallbackProcessor } from './callbacks';
import { createGoogleSignIn, googleUnavailable } from './oauth';
import { emailRedirect, mobileAuthSupported, type AuthCallback } from './redirects';
import { ensurePkceCrypto } from './pkce-crypto';

export const supportsMobileAuth = mobileAuthSupported(Platform.OS, Constants.executionEnvironment);
export const googleAvailabilityMessage = supportsMobileAuth ? null : googleUnavailable;
export const signupRedirect = emailRedirect(supportsMobileAuth, process.env.EXPO_PUBLIC_AUTH_EMAIL_REDIRECT_URL);
const processCallback = supabase ? createCallbackProcessor(supabase.auth) : null;
export const completeAuthCallback = (callback: AuthCallback) => {
  if (!supportsMobileAuth || !processCallback) return Promise.resolve({ status: 'error' as const,
    message: 'Open this link in a configured RIDE development or production build, or log in with email and password.' });
  return processCallback(callback);
};
const google = supabase ? createGoogleSignIn({
  auth: supabase.auth, supported: supportsMobileAuth,
  projectUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  openBrowser: (url, redirect) => WebBrowser.openAuthSessionAsync(url, redirect),
  complete: completeAuthCallback,
}) : null;

export async function signInWithGoogle() {
  try {
    if (!google) throw new Error();
    if (supportsMobileAuth) ensurePkceCrypto();
    return await google();
  } catch { return { status: 'error' as const, message: 'Secure authentication is unavailable. Restart RIDE and try again.' }; }
}

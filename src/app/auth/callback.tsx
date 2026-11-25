import { useEffect, useState, useSyncExternalStore } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, Text } from 'react-native';
import { useAuth } from '@/auth/AuthProvider';
import { callbackInbox } from '@/auth/callback-inbox';
import { completeAuthCallback } from '@/auth/runtime';
import { callbackRecovery } from '@/auth/redirects';
import type { CallbackResult } from '@/auth/callbacks';
import { AuthShell, authStyles } from '@/components/AuthScreen';
import { ActionButton } from '@/components/ActionButton';
import { Colors } from '@/constants/theme';

export default function AuthCallbackScreen() {
  const incoming = useSyncExternalStore(callbackInbox.subscribe, callbackInbox.getSnapshot, () => null);
  const [result, setResult] = useState<CallbackResult | null>(null);
  const { state } = useAuth();
  useEffect(() => {
    if (!incoming) return;
    let active = true;
    setResult(null);
    void completeAuthCallback(incoming.callback).then(value => { if (active) setResult(value); });
    return () => { active = false; };
  }, [incoming]);
  const busy = Boolean(incoming) && !result;
  const signedIn = Boolean(state.session);
  return <AuthShell title={busy ? 'Finishing sign-in' : result?.status === 'success' ? 'Ready to ride' : 'Check your sign-in link'}
    description={busy ? 'Securely completing your sign-in…' : result?.message ?? callbackRecovery}>
    {busy ? <ActivityIndicator accessibilityLabel="Completing sign-in" color={Colors.accent} /> : <>
      {result?.status === 'error' && <Text accessibilityRole="alert" style={authStyles.muted}>You can safely return to login and try again.</Text>}
      <ActionButton label={signedIn ? 'Continue to RIDE' : 'Back to Log In'} onPress={() => {
        callbackInbox.clear();
        router.replace(signedIn ? '/' : '/login');
      }} />
    </>}
  </AuthShell>;
}

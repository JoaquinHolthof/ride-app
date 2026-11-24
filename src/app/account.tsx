import { useRef, useState } from 'react';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { useAuth } from '@/auth/AuthProvider';
import { AuthShell, authStyles } from '@/components/AuthScreen';
import { ActionButton } from '@/components/ActionButton';

export default function AccountScreen() {
  const { state, signOut } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);
  const leave = async () => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError(null);
    try { setError(await signOut()); }
    finally { pending.current = false; setBusy(false); }
  };
  return <AuthShell title="Your account" description="Signed in to RIDE.">
    <View style={authStyles.panel}>
      <Text style={authStyles.text}>{state.session?.user.email}</Text>
      <Text style={authStyles.muted}>Signing out removes this device’s session. Other signed-in devices are unaffected.</Text>
    </View>
    {error && <Text accessibilityRole="alert" style={authStyles.text}>{error}</Text>}
    <ActionButton label={busy ? 'Signing out…' : 'Sign Out'} disabled={busy} onPress={() => { void leave(); }} />
    <ActionButton label="Back to Explore" variant="secondary" disabled={busy}
      onPress={() => router.canGoBack() ? router.back() : router.replace('/')} />
  </AuthShell>;
}

import { useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useAuth } from '@/auth/AuthProvider';
import { authStyles } from '@/components/AuthScreen';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Layout, Typography } from '@/constants/theme';
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
  return <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: Colors.background }}>
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16, width: '100%', maxWidth: Layout.contentMaxWidth, alignSelf: 'center' }}>
    <Text style={{ ...Typography.label, color: Colors.accent }}>RIDE · YOUR ACCOUNT</Text>
    <Text accessibilityRole="header" style={{ ...Typography.heading, color: Colors.text }}>Account</Text>
    <View style={authStyles.panel}>
      <Text style={authStyles.text}>{state.session?.user.email}</Text>
      <Text style={authStyles.muted}>Signing out removes this device’s session. Other signed-in devices are unaffected.</Text>
    </View>
    {error && <Text accessibilityRole="alert" style={authStyles.text}>{error}</Text>}
    <ActionButton label={busy ? 'Signing out…' : 'Sign Out'} disabled={busy} onPress={() => { void leave(); }} />
    </ScrollView>
  </SafeAreaView>;
}

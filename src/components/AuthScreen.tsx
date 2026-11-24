import { useRef, useState } from 'react';
import type { ComponentRef, PropsWithChildren } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Layout, Radius, Spacing, Typography } from '@/constants/theme';
import { useAuth } from '@/auth/AuthProvider';
import { ActionButton } from './ActionButton';

export function AuthShell({ title, description, children }: PropsWithChildren<{ title: string; description: string }>) {
  return <SafeAreaView style={styles.safeArea}>
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.content}>
        <View style={styles.identity}>
          <Text style={styles.brand}>RIDE</Text>
          <Text style={styles.muted}>Your city. Your ride.</Text>
        </View>
        <View style={styles.headingBlock}>
          <Text accessibilityRole="header" style={styles.heading}>{title}</Text>
          <Text style={styles.muted}>{description}</Text>
        </View>
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  </SafeAreaView>;
}

export function AuthStartup({ error, onRetry }: { error?: string | null; onRetry?: () => void }) {
  return <AuthShell title={error ? 'Let’s try again' : 'Getting ready'}
    description={error ? 'Authentication is unavailable right now.' : 'Restoring your secure session…'}>
    {!error && <ActivityIndicator accessibilityLabel="Restoring session" size="large" color={Colors.accent} />}
    {error && <Text accessibilityRole="alert" style={styles.text}>{error}</Text>}
    {error && onRetry && <ActionButton label="Try again" onPress={onRetry} />}
  </AuthShell>;
}

export function CredentialForm({ mode }: { mode: 'login' | 'signup' }) {
  const { submit } = useAuth();
  const signup = mode === 'signup';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const passwordInput = useRef<ComponentRef<typeof TextInput>>(null);
  const send = async () => {
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await submit(mode, email, password);
      setPassword('');
      if (result.error) setError(result.error);
      else if (result.confirmation) router.replace('/confirm-email');
      // A successful session changes the root route guard; do not race it with navigation.
    } finally { submitting.current = false; setBusy(false); }
  };
  return <AuthShell title={signup ? 'Create your account' : 'Welcome back'}
    description={signup ? 'Sign up to start exploring Antwerp.' : 'Log in to find your next bike or free dock.'}>
    <View style={styles.form}>
      <Text style={styles.label}>Email</Text>
      <TextInput accessibilityLabel="Email address" placeholder="you@example.com" placeholderTextColor={Colors.textSecondary}
        style={styles.input} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none"
        autoCorrect={false} autoComplete="email" textContentType="emailAddress" editable={!busy}
        returnKeyType="next" onSubmitEditing={() => passwordInput.current?.focus()} />
      <Text style={styles.label}>Password</Text>
      <TextInput ref={passwordInput} accessibilityLabel="Password" style={styles.input} value={password} onChangeText={setPassword}
        secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete={signup ? 'new-password' : 'current-password'}
        textContentType={signup ? 'newPassword' : 'password'} editable={!busy} returnKeyType="go"
        onSubmitEditing={() => { void send(); }} />
      {signup && <Text style={styles.muted}>Use at least 8 characters. Your project may require a stronger password.</Text>}
      {error && <Text accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.text}>{error}</Text>}
      {busy && <ActivityIndicator accessibilityLabel={signup ? 'Creating account' : 'Logging in'} color={Colors.accent} />}
      <ActionButton label={busy ? 'Please wait…' : signup ? 'Sign Up' : 'Log In'} disabled={busy} onPress={() => { void send(); }} />
      <ActionButton label={signup ? 'Already registered? Log In' : 'New to RIDE? Sign Up'} variant="secondary" disabled={busy}
        onPress={() => router.replace(signup ? '/login' : '/signup')} />
      {!signup && <ActionButton label="Need to confirm your email?" variant="secondary" disabled={busy}
        onPress={() => router.push('/confirm-email')} />}
    </View>
  </AuthShell>;
}

export const authStyles = StyleSheet.create({
  text: { ...Typography.label, color: Colors.text },
  muted: { ...Typography.label, color: Colors.textSecondary },
  panel: { backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, gap: Spacing.md },
});
const styles = StyleSheet.create({
  ...authStyles,
  safeArea: { flex: 1, backgroundColor: Colors.background },
  fill: { flex: 1 },
  content: { flexGrow: 1, padding: Spacing.lg, gap: Spacing.lg, width: '100%', maxWidth: Layout.contentMaxWidth, alignSelf: 'center' },
  identity: { gap: Spacing.xs, paddingVertical: Spacing.md },
  brand: { ...Typography.display, fontSize: 64, lineHeight: 68, color: Colors.accent, fontStyle: 'italic' },
  heading: { ...Typography.heading, color: Colors.text },
  headingBlock: { gap: Spacing.sm },
  form: { gap: Spacing.sm },
  label: { ...Typography.label, color: Colors.text, marginTop: Spacing.sm },
  input: { ...Typography.body, minHeight: Layout.minTouchTarget, padding: Spacing.sm, color: Colors.text,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.textSecondary, borderRadius: Radius.sm },
});

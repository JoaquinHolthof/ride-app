import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { Colors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/auth/AuthProvider';
import { authAccess } from '@/auth/lifecycle';
import { AuthStartup } from '@/components/AuthScreen';
import { FavouritesProvider } from '@/favourites/FavouritesProvider';

const rideTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: Colors.accent,
    background: Colors.background,
    card: Colors.surface,
    text: Colors.text,
    border: Colors.surface,
  },
};

export default function RootLayout() {
  return (
    <ThemeProvider value={rideTheme}>
      <StatusBar style="light" />
      <AuthProvider><FavouritesProvider><AuthNavigator /></FavouritesProvider></AuthProvider>
    </ThemeProvider>
  );
}

export function AuthNavigator() {
  const { state, configurationError, retry } = useAuth();
  if (configurationError) return <AuthStartup error={configurationError} />;
  if (state.status !== 'ready') return <AuthStartup error={state.error} onRetry={retry} />;
  const access = authAccess(state);
  return <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
        }}
      >
        <Stack.Protected guard={access.public}>
          <Stack.Screen name="login" options={{ title: 'Log In' }} />
          <Stack.Screen name="signup" options={{ title: 'Sign Up' }} />
          <Stack.Screen name="confirm-email" options={{ title: 'Confirm email' }} />
        </Stack.Protected>
        <Stack.Protected guard={access.protected}>
          <Stack.Screen name="index" options={{ title: 'RIDE' }} />
          <Stack.Screen name="station/[id]" options={{ title: 'Station details' }} />
          <Stack.Screen name="account" options={{ title: 'Account' }} />
          <Stack.Screen name="saved" options={{ title: 'Saved stations' }} />
        </Stack.Protected>
        <Stack.Screen name="auth/callback" options={{ title: 'Complete sign-in' }} />
      </Stack>;
}

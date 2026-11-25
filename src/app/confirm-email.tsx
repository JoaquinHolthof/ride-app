import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { AuthShell, authStyles } from '@/components/AuthScreen';
import { ActionButton } from '@/components/ActionButton';

export default function ConfirmEmailScreen() {
  return <AuthShell title="Check your inbox" description="Confirm your email, then come back to RIDE.">
    <View style={authStyles.panel}>
      <Text style={authStyles.text}>If your sign-up is eligible, Supabase will send a confirmation email. Open its link in your browser.</Text>
      <Text style={authStyles.muted}>Check your spam folder too. After confirmation, return here and log in with your email and password.</Text>
      <Text style={authStyles.muted}>In a RIDE development or production build, the latest confirmation link can reopen this app and complete sign-in automatically. Expo Go uses the hosted confirmation page and manual login.</Text>
      <Text style={authStyles.muted}>Already registered? Try Log In. If a link expired or no email arrives, wait a few minutes and try Sign Up again. Contact the project owner if delivery still fails.</Text>
    </View>
    <ActionButton label="Back to Log In" onPress={() => router.replace('/login')} />
    <ActionButton label="Return to Sign Up" variant="secondary" onPress={() => router.replace('/signup')} />
  </AuthShell>;
}

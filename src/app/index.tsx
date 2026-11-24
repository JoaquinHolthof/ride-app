import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors, Layout, Spacing, Typography } from '@/constants/theme';

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.accent} accessible={false} />
          <Text accessibilityRole="header" style={styles.heading}>
            RIDE
          </Text>
          <Text style={styles.description}>Your city. Your ride.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  hero: {
    width: '100%',
    maxWidth: Layout.contentMaxWidth,
    alignSelf: 'center',
    gap: Spacing.md,
  },
  accent: {
    width: Spacing.xxl,
    height: Spacing.xs,
    backgroundColor: Colors.accent,
  },
  heading: {
    ...Typography.display,
    color: Colors.accent,
  },
  description: {
    ...Typography.body,
    color: Colors.text,
  },
});

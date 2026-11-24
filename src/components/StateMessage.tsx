import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Colors, Spacing, Typography } from '@/constants/theme';

export function StateMessage({ title, description, loading = false }: {
  title: string; description: string; loading?: boolean;
}) {
  return (
    <View style={styles.container} accessibilityLiveRegion="polite">
      {loading && <ActivityIndicator size="large" color={Colors.accent} accessibilityLabel="Loading stations" />}
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: Spacing.xl, gap: Spacing.md },
  title: { ...Typography.heading, color: Colors.text },
  description: { ...Typography.body, color: Colors.textSecondary },
});

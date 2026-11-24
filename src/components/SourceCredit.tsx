import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, Layout, Spacing, Typography } from '@/constants/theme';

export function SourceCredit({ compact = false }: { compact?: boolean }) {
  return (
    <View style={[styles.container, compact && styles.compact]}>
      {!compact && <Text style={styles.note}>Availability can change. Bikes and docks cannot be reserved in RIDE.</Text>}
      <Pressable accessibilityRole="link" onPress={() => {
        void Linking.openURL('https://citybik.es').catch(() => Alert.alert('Unable to open link', 'Visit https://citybik.es for the data source.'));
      }} style={styles.link}>
        <Text style={styles.label}>Station data by CityBikes ↗</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.sm, paddingVertical: Spacing.lg },
  compact: { paddingVertical: 0 },
  note: { ...Typography.label, color: Colors.textSecondary },
  link: { minHeight: Layout.minTouchTarget, minWidth: Layout.minTouchTarget, justifyContent: 'center' },
  label: { ...Typography.label, color: Colors.accent, textDecorationLine: 'underline' },
});

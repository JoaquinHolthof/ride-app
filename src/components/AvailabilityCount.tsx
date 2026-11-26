import { StyleSheet, Text, View } from 'react-native';
import { Colors, Spacing, Typography } from '@/constants/theme';

export function AvailabilityCount({ value, label, highlighted = true, prominent = false }: { value: number | null; label: string; highlighted?: boolean; prominent?: boolean }) {
  return (
    <View style={styles.container}>
      <Text style={[styles.number, prominent && { fontSize: 64, lineHeight: 72 }, (!highlighted || value === null || value === 0) && styles.unavailable]}>{value ?? '—'}</Text>
      <Text style={styles.label}>{label}</Text>
      {value === null && <Text style={styles.label}>Unknown</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, minWidth: 110, gap: Spacing.xs },
  number: { ...Typography.count, color: Colors.accent },
  unavailable: { color: Colors.text },
  label: { ...Typography.label, color: Colors.textSecondary },
});

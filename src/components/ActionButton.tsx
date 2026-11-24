import { Pressable, StyleSheet, Text } from 'react-native';
import { Colors, Layout, Radius, Spacing, Typography } from '@/constants/theme';

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}

export function ActionButton({ label, onPress, disabled = false }: Props) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled}
      onPress={onPress} style={({ pressed }) => [styles.button, (pressed || disabled) && styles.dimmed]}>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: Layout.minTouchTarget, minWidth: Layout.minTouchTarget, paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm, borderRadius: Radius.sm, backgroundColor: Colors.accent, justifyContent: 'center', alignItems: 'center' },
  dimmed: { opacity: 0.65 },
  label: { ...Typography.label, color: Colors.onAccent, textAlign: 'center' },
});

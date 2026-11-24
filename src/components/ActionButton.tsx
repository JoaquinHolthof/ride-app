import { Pressable, StyleSheet, Text } from 'react-native';
import { Colors, Layout, Radius, Spacing, Typography } from '@/constants/theme';

interface Props {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
}

export function ActionButton({ label, onPress, disabled = false, variant = 'primary' }: Props) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled}
      onPress={onPress} style={({ pressed }) => [styles.button, variant === 'secondary' && styles.secondary, (pressed || disabled) && styles.dimmed]}>
      <Text style={[styles.label, variant === 'secondary' && styles.secondaryLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: Layout.minTouchTarget, minWidth: Layout.minTouchTarget, paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm, borderRadius: Radius.sm, backgroundColor: Colors.accent, justifyContent: 'center', alignItems: 'center' },
  dimmed: { opacity: 0.65 },
  secondary: { backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.textSecondary },
  secondaryLabel: { color: Colors.text },
  label: { ...Typography.label, color: Colors.onAccent, textAlign: 'center' },
});

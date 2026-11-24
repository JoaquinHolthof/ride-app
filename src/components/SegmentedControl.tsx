import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, Layout, Radius, Spacing, Typography } from '@/constants/theme';

interface Props<T extends string> {
  label: string;
  value: T;
  options: readonly { value: T; label: string; accessibilityLabel?: string }[];
  onChange: (value: T) => void;
}
export function SegmentedControl<T extends string>({ label, value, options, onChange }: Props<T>) {
  return <View accessibilityRole="tablist" accessibilityLabel={label} style={styles.container}>
    {options.map(option => <Pressable key={option.value} accessibilityRole="tab"
      accessibilityLabel={option.accessibilityLabel ?? option.label}
      accessibilityState={{ selected: value === option.value }}
      onPress={() => onChange(option.value)} style={({ pressed }) => [styles.tab,
        value === option.value && styles.active, pressed && styles.pressed]}>
      <Text style={[styles.text, value === option.value && styles.activeText]}>{option.label}</Text>
    </Pressable>)}
  </View>;
}
const styles = StyleSheet.create({
  container: { flexDirection: 'row', padding: 2, gap: 2, backgroundColor: Colors.surface, borderRadius: Radius.sm },
  tab: { flex: 1, minHeight: Layout.minTouchTarget, minWidth: Layout.minTouchTarget, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs,
    justifyContent: 'center', alignItems: 'center', borderRadius: Radius.sm },
  active: { backgroundColor: Colors.accent },
  pressed: { opacity: 0.75 },
  text: { ...Typography.label, fontWeight: '700', color: Colors.textSecondary, textAlign: 'center' },
  activeText: { color: Colors.onAccent },
});

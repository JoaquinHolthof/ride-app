import { useEffect, useState } from 'react';
import { Keyboard, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomTabBarProps } from 'expo-router/js-tabs';
import { Colors } from '@/constants/theme';
import { RideIcon } from './RideIcon';
export function RideTabBar({ state, descriptors, emitter, navigateToTab, insets }: BottomTabBarProps) {
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardVisible(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardVisible(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  if (keyboardVisible) return null;
  return <View accessibilityRole="tablist" style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 8), paddingLeft: insets.left + 8, paddingRight: insets.right + 8 }]}>
    {state.routes.map((route, index) => {
      const selected = index === state.index;
      const label = descriptors[route.key].options.title ?? route.name;
      const icon = route.name === '(explore)' ? 'explore' : route.name === '(saved)' ? (selected ? 'savedFilled' : 'saved') : 'account';
      return <Pressable key={route.key} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected }}
        onPress={() => {
          Keyboard.dismiss();
          const event = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!selected && !event.defaultPrevented) navigateToTab(route.key);
        }} onLongPress={() => emitter.emit({ type: 'tabLongPress', target: route.key })}
        style={({ pressed }) => [styles.tab, selected && styles.selected, pressed && { opacity: 0.65 }]}>
        <RideIcon name={icon} color={selected ? Colors.accent : Colors.textSecondary} />
        <Text style={[styles.label, selected && { color: Colors.accent }]}>{label}</Text>
      </Pressable>;
    })}
  </View>;
}
const styles = StyleSheet.create({
  bar: { flexDirection: 'row', paddingTop: 6, gap: 4, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.surface },
  tab: { flex: 1, minHeight: 56, minWidth: 44, alignItems: 'center', justifyContent: 'center', padding: 4, gap: 2, borderRadius: 8 },
  selected: { backgroundColor: Colors.surface },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '700', color: Colors.textSecondary, textAlign: 'center' },
});

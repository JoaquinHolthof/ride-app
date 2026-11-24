import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Station } from '@/api/citybikes';
import { Colors, Layout, Spacing, Typography } from '@/constants/theme';
import { hasCoordinates } from '@/utils/explore';

export function StationCoordinates({ station }: { station: Station }) {
  return <Text selectable style={styles.coordinates}>{hasCoordinates(station)
    ? `Latitude ${station.latitude.toFixed(5)}\nLongitude ${station.longitude.toFixed(5)}`
    : 'Coordinates unavailable'}</Text>;
}

export function StationTechnicalInfo({ station }: { station: Station }) {
  const [expanded, setExpanded] = useState(false);
  return <View>
    <Pressable accessibilityRole="button" accessibilityLabel="Technical information"
      accessibilityState={{ expanded }} aria-expanded={expanded} onPress={() => setExpanded(value => !value)}
      style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}>
      <Text style={styles.label}>Technical information</Text>
      <Text accessible={false} style={styles.symbol}>{expanded ? '−' : '+'}</Text>
    </Pressable>
    {expanded && <StationCoordinates station={station} />}
  </View>;
}

const styles = StyleSheet.create({
  toggle: { minHeight: Layout.minTouchTarget, minWidth: Layout.minTouchTarget, flexDirection: 'row',
    alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm },
  label: { ...Typography.label, color: Colors.textSecondary, flex: 1 },
  symbol: { ...Typography.label, color: Colors.accent },
  coordinates: { ...Typography.label, color: Colors.textSecondary, paddingBottom: Spacing.sm },
  pressed: { opacity: 0.7 },
});

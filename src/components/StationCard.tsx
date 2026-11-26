import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ReactNode } from 'react';
import type { Station } from '@/api/citybikes';
import { Colors, Layout, Radius, Spacing, Typography } from '@/constants/theme';
import { stationStatus } from '@/utils/station-display';
import { AvailabilityCount } from './AvailabilityCount';
import { modeStatus } from '@/utils/explore';
import type { RideMode } from '@/utils/explore';

export function StationCard({ station, onPress, mode = 'bikes', selected = false, bookmark }: {
  station: Station; onPress: () => void; mode?: RideMode; selected?: boolean; bookmark?: ReactNode;
}) {
  return (
    <View style={[styles.card, selected && styles.selected]}>
      {bookmark && <View style={styles.titleRow}>
        <Pressable accessibilityRole="button" accessibilityLabel={station.name + '. Open station details'} onPress={onPress}
          style={({ pressed }) => [styles.titleLink, pressed && styles.pressed]}><Text style={styles.name}>{station.name}</Text></Pressable>
        {bookmark}
      </View>}
    <Pressable accessibilityRole="button" accessibilityHint="Opens station details"
      accessibilityLabel={`${station.name}. ${station.free_bikes ?? 'Unknown'} bikes, ${station.empty_slots ?? 'unknown'} free docks. ${stationStatus(station)}`}
      accessibilityState={{ selected }}
      onPress={onPress} style={({ pressed }) => [styles.body, pressed && styles.pressed]}>
      {!bookmark && <Text style={styles.name}>{station.name}</Text>}
      <View style={styles.counts}>
        <AvailabilityCount value={station.free_bikes} label="Bikes available" highlighted={mode === 'bikes' && !station.closed} />
        <AvailabilityCount value={station.empty_slots} label="Docks free" highlighted={mode === 'docks' && !station.closed} />
      </View>
      <Text style={styles.status}>{modeStatus(station, mode)}</Text>
      <Text style={styles.link}>View station →</Text>
    </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: Layout.minTouchTarget, backgroundColor: Colors.surface, borderRadius: Radius.md,
    padding: Spacing.md, gap: Spacing.md },
  pressed: { opacity: 0.75 },
  body: { minHeight: 44, gap: Spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  titleLink: { flex: 1, minHeight: 44, justifyContent: 'center' },
  selected: { borderColor: Colors.accent, borderWidth: 2 },
  name: { ...Typography.body, fontWeight: '700', color: Colors.text },
  counts: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  status: { ...Typography.label, color: Colors.textSecondary },
  link: { ...Typography.label, color: Colors.accent },
});

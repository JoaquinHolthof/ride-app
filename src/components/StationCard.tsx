import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Station } from '@/api/citybikes';
import { Colors, Layout, Radius, Spacing, Typography } from '@/constants/theme';
import { stationStatus } from '@/utils/station-display';
import { AvailabilityCount } from './AvailabilityCount';

export function StationCard({ station, onPress }: { station: Station; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityHint="Opens station details"
      accessibilityLabel={`${station.name}. ${station.free_bikes ?? 'Unknown'} bikes, ${station.empty_slots ?? 'unknown'} free docks. ${stationStatus(station)}`}
      onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <Text style={styles.name}>{station.name}</Text>
      <View style={styles.counts}>
        <AvailabilityCount value={station.free_bikes} label="Bikes available" />
        <AvailabilityCount value={station.empty_slots} label="Docks free" />
      </View>
      <Text style={styles.status}>{stationStatus(station)}</Text>
      <Text style={styles.link}>View station →</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: Layout.minTouchTarget, backgroundColor: Colors.surface, borderRadius: Radius.md,
    padding: Spacing.md, gap: Spacing.md },
  pressed: { opacity: 0.75 },
  name: { ...Typography.body, fontWeight: '700', color: Colors.text },
  counts: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  status: { ...Typography.label, color: Colors.textSecondary },
  link: { ...Typography.label, color: Colors.accent },
});

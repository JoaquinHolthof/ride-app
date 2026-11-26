import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Station } from '@/api/citybikes';
import { Colors, Layout, Spacing, Typography } from '@/constants/theme';
import { modeCount, modeStatus } from '@/utils/explore';
import type { RideMode } from '@/utils/explore';
import { ActionButton } from './ActionButton';
import { DirectionsButton } from './DirectionsButton';
import { SaveStationButton, SaveStationFeedback } from './SaveStationButton';

export function StationPreview({ station, mode, onOpen, onClose }: {
  station: Station; mode: RideMode; onOpen: () => void; onClose: () => void;
}) {
  return <View style={styles.container}>
    <View style={styles.row}>
      <Text accessibilityRole="header" style={[styles.name, styles.copy]}>{station.name}</Text>
      <SaveStationButton stationId={station.id} stationName={station.name} />
      <Pressable accessibilityRole="button" accessibilityLabel="Close station preview" onPress={onClose}
        style={({ pressed }) => [styles.close, pressed && styles.pressed]}>
        <Text style={styles.closeText}>×</Text>
      </Pressable>
    </View>
    <View style={styles.row}>
      <View style={styles.copy}>
        <Text style={styles.meta}>{modeStatus(station, mode)}</Text>
        <Text style={styles.meta}>{mode === 'bikes'
          ? `${station.empty_slots ?? 'Unknown'} docks free`
          : `${station.free_bikes ?? 'Unknown'} bikes available`}</Text>
      </View>
      <Text style={[styles.count, (station.closed || !modeCount(station, mode)) && styles.muted]}>{modeCount(station, mode) ?? '—'}</Text>
    </View>
    <View style={styles.row}>
      <View style={styles.copy}><ActionButton label="Station details →" onPress={onOpen} /></View>
      <View style={styles.copy}><DirectionsButton station={station} /></View>
    </View>
    <SaveStationFeedback stationId={station.id} />
  </View>;
}
const styles = StyleSheet.create({
  container: { gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, backgroundColor: Colors.surface },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  close: { minHeight: Layout.minTouchTarget, minWidth: Layout.minTouchTarget, justifyContent: 'center', alignItems: 'center' },
  closeText: { fontSize: 28, color: Colors.text },
  pressed: { opacity: 0.7 },
  copy: { flex: 1 },
  name: { ...Typography.body, fontWeight: '800', color: Colors.text },
  meta: { ...Typography.label, color: Colors.textSecondary },
  count: { ...Typography.count, color: Colors.accent },
  muted: { color: Colors.textSecondary },
});

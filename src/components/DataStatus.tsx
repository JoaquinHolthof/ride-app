import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Colors, Spacing, Typography } from '@/constants/theme';
import type { StationsState } from '@/state/stations';
import { ageLabel } from '@/utils/station-display';
import { dataStatus } from '@/utils/data-status';
import { ActionButton } from './ActionButton';

interface Props extends StationsState {
  compact?: boolean;
  now: number;
  refresh: () => Promise<void>;
}

export function DataStatus({ data, isFetching, error, retryAt, now, refresh, compact = false }: Props) {
  const cooldown = Math.max(0, Math.ceil((retryAt - now) / 1000));
  const status = dataStatus({ data, isFetching, error, retryAt, now });
  const cached = data && (error || status.kind === 'cached');
  const refreshLabel = isFetching ? 'Refreshing…' : cooldown > 0 ? `Refresh in ${cooldown}s` : error ? 'Try again' : 'Refresh';
  return (
    <View style={styles.container}>
      <View style={styles.summary}>
        <View style={[styles.dot, { backgroundColor: status.color }]} />
        <Text style={[styles.meta, { flex: 1 }]}>{status.label}</Text>
        {compact && <Pressable accessibilityRole="button" accessibilityLabel={refreshLabel + ' station data'}
          disabled={isFetching || cooldown > 0} accessibilityState={{ disabled: isFetching || cooldown > 0, busy: isFetching }}
          onPress={() => { void refresh(); }} style={({ pressed }) => [styles.refresh, pressed && { opacity: 0.6 }]}>
          <Text style={styles.meta}>{refreshLabel}</Text>
        </Pressable>}
      </View>
      {data && (!compact || status.kind !== 'fresh') && <Text style={styles.meta}>
        {cached ? 'Cached results' : 'Latest fetch'} · fetched {ageLabel(data.fetchedAt, now)}
      </Text>}
      {cached && !compact && <Text style={styles.meta}>Availability may have changed. Refresh for current counts.</Text>}
      {!!data?.skippedStations && <Text style={styles.meta}>{data.skippedStations} unreadable or duplicate station records omitted.</Text>}
      {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {!compact && <ActionButton
        variant="primary"
        label={isFetching ? 'Refreshing…' : cooldown > 0 ? `Refresh in ${cooldown}s` : error ? 'Try again' : 'Refresh stations'}
        disabled={isFetching || cooldown > 0}
        onPress={() => { void refresh(); }}
      />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.sm },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  refresh: { minWidth: 44, minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  meta: { fontSize: 14, lineHeight: 20, color: Colors.textSecondary },
  error: { ...Typography.body, color: Colors.text },
});

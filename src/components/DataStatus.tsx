import { StyleSheet, Text, View } from 'react-native';
import { Colors, Spacing, Typography } from '@/constants/theme';
import { CACHE_TTL_MS } from '@/state/stations';
import type { StationsState } from '@/state/stations';
import { ageLabel } from '@/utils/station-display';
import { ActionButton } from './ActionButton';

interface Props extends StationsState {
  now: number;
  refresh: () => Promise<void>;
}

export function DataStatus({ data, isFetching, error, retryAt, now, refresh }: Props) {
  const cooldown = Math.max(0, Math.ceil((retryAt - now) / 1000));
  const cached = data && (error || now - data.fetchedAt >= CACHE_TTL_MS);
  return (
    <View style={styles.container}>
      {data && <Text style={styles.meta}>
        {cached ? 'Cached results' : 'Latest fetch'} · fetched {ageLabel(data.fetchedAt, now)}
      </Text>}
      {cached && <Text style={styles.meta}>Availability may have changed. Refresh for current counts.</Text>}
      {!!data?.skippedStations && <Text style={styles.meta}>{data.skippedStations} unreadable or duplicate station records omitted.</Text>}
      {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      <ActionButton
        label={isFetching ? 'Refreshing…' : cooldown > 0 ? `Refresh in ${cooldown}s` : error ? 'Try again' : 'Refresh stations'}
        disabled={isFetching || cooldown > 0}
        onPress={() => { void refresh(); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.sm },
  meta: { ...Typography.label, color: Colors.textSecondary },
  error: { ...Typography.body, color: Colors.text },
});

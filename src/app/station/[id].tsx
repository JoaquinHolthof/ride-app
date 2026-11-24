import { router, useLocalSearchParams } from 'expo-router';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ActionButton } from '@/components/ActionButton';
import { DirectionsButton } from '@/components/DirectionsButton';
import { AvailabilityCount } from '@/components/AvailabilityCount';
import { DataStatus } from '@/components/DataStatus';
import { SourceCredit } from '@/components/SourceCredit';
import { StateMessage } from '@/components/StateMessage';
import { Colors, Layout, Radius, Spacing, Typography } from '@/constants/theme';
import { useStations } from '@/hooks/use-stations';
import { ageLabel, stationStatus } from '@/utils/station-display';

export default function StationDetailScreen() {
  const { id, mode } = useLocalSearchParams<{ id: string | string[]; mode?: string }>();
  const selectedMode = mode === 'docks' ? 'docks' : 'bikes';
  const feed = useStations();
  const station = typeof id === 'string' ? feed.data?.stations.find(item => item.id === id) : undefined;
  const updatedAt = station?.timestamp ? Date.parse(station.timestamp) : null;
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl
        refreshing={feed.isFetching && feed.data !== null} onRefresh={() => { void feed.refresh(); }}
        tintColor={Colors.accent} colors={[Colors.accent]} />}>
        <ActionButton label="← All stations" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} />
        <DataStatus {...feed} />
        {station ? <>
          <Text style={styles.eyebrow}>VELO ANTWERPEN</Text>
          <Text accessibilityRole="header" style={styles.heading}>{station.name}</Text>
          <View style={styles.panel}>
            <View style={styles.counts}>
              <AvailabilityCount value={station.free_bikes} label="Bikes available" highlighted={selectedMode === 'bikes' && !station.closed} />
              <AvailabilityCount value={station.empty_slots} label="Docks free" highlighted={selectedMode === 'docks' && !station.closed} />
            </View>
            <Text style={styles.body}>{stationStatus(station)}</Text>
          </View>
          <View style={styles.panel}>
            <Text accessibilityRole="header" style={styles.label}>Location</Text>
            <Text style={styles.body}>{station.address ?? 'Street address unavailable'}</Text>
            <Text style={styles.secondary}>Antwerp, Belgium</Text>
            <Text selectable style={styles.secondary}>
              {station.latitude !== null && station.longitude !== null
                ? `Latitude ${station.latitude.toFixed(5)}\nLongitude ${station.longitude.toFixed(5)}`
                : 'Coordinates unavailable'}
            </Text>
            <DirectionsButton station={station} />
          </View>
          <View style={styles.panel}>
            <Text accessibilityRole="header" style={styles.label}>Station last updated</Text>
            <Text style={styles.body}>{updatedAt === null ? 'Update time unavailable' : new Date(updatedAt).toLocaleString()}</Text>
            {updatedAt !== null && <Text style={styles.secondary}>{ageLabel(updatedAt, feed.now)}</Text>}
            {updatedAt !== null && feed.now - updatedAt > 5 * 60_000 && <Text style={styles.body}>Source data is over 5 minutes old. Availability may have changed.</Text>}
          </View>
        </> : !feed.data && !feed.error
          ? <StateMessage loading title="Loading station" description="Getting the latest station data…" />
          : feed.error
            ? <StateMessage title="Can’t load this station" description="Check your connection and use the retry button above." />
            : <StateMessage title="Station not found" description="This station is not in the latest list. Refresh or return to all stations." />}
        <SourceCredit />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  content: { flexGrow: 1, width: '100%', maxWidth: Layout.contentMaxWidth, alignSelf: 'center', padding: Spacing.lg, gap: Spacing.lg },
  eyebrow: { ...Typography.label, color: Colors.accent },
  heading: { ...Typography.heading, color: Colors.text },
  panel: { backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, gap: Spacing.md },
  counts: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  label: { ...Typography.label, color: Colors.accent },
  body: { ...Typography.body, color: Colors.text },
  secondary: { ...Typography.label, color: Colors.textSecondary },
});

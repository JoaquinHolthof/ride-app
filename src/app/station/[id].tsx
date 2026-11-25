import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DirectionsButton } from '@/components/DirectionsButton';
import { AvailabilityCount } from '@/components/AvailabilityCount';
import { DataStatus } from '@/components/DataStatus';
import { SourceCredit } from '@/components/SourceCredit';
import { StateMessage } from '@/components/StateMessage';
import { StationTechnicalInfo } from '@/components/StationTechnicalInfo';
import { SaveStationButton } from '@/components/SaveStationButton';
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
        <Pressable accessibilityRole="button" accessibilityLabel="Back to Explore"
          onPress={() => router.canGoBack() ? router.back() : router.replace('/')}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
          <Text style={styles.secondary}>‹ Explore</Text>
        </Pressable>
        {station ? <>
          <View style={styles.title}>
            <Text style={styles.eyebrow}>{selectedMode === 'bikes' ? 'Find a bike' : 'Find a dock'} · Velo Antwerpen</Text>
            <Text accessibilityRole="header" style={styles.heading}>{station.name}</Text>
          </View>
          <View style={styles.panel}>
            <View style={styles.counts}>
              <AvailabilityCount value={station.free_bikes} label="Bikes available" highlighted={selectedMode === 'bikes' && !station.closed} />
              <AvailabilityCount value={station.empty_slots} label="Docks free" highlighted={selectedMode === 'docks' && !station.closed} />
            </View>
            <Text style={styles.status}>{stationStatus(station)}</Text>
          </View>
          <DirectionsButton station={station} prominent />
          <SaveStationButton stationId={station.id} />
          <View style={styles.information}>
            <Text accessibilityRole="header" style={styles.label}>Address</Text>
            <Text style={styles.status}>{station.address ?? 'Street address unavailable'}</Text>
            <Text style={styles.secondary}>Antwerp, Belgium</Text>
          </View>
          <View style={styles.information}>
            <Text accessibilityRole="header" style={styles.label}>Station last updated</Text>
            <Text style={styles.status}>{updatedAt === null ? 'Update time unavailable' : new Date(updatedAt).toLocaleString()}</Text>
            {updatedAt !== null && <Text style={styles.secondary}>{ageLabel(updatedAt, feed.now)}</Text>}
            {updatedAt !== null && feed.now - updatedAt > 5 * 60_000 && <Text style={styles.status}>Source data is over 5 minutes old. Availability may have changed.</Text>}
          </View>
          <StationTechnicalInfo key={station.id} station={station} />
        </> : !feed.data && !feed.error
          ? <StateMessage loading title="Loading station" description="Getting the latest station data…" />
          : feed.error
            ? <StateMessage title="Can’t load this station" description="Check your connection and use the retry button below." />
            : <StateMessage title="Station not found" description="This station is not in the latest list. Refresh or return to all stations." />}
        <DataStatus {...feed} compact />
        <SourceCredit compact />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  content: { flexGrow: 1, width: '100%', maxWidth: Layout.contentMaxWidth, alignSelf: 'center', paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs, paddingBottom: Spacing.md, gap: Spacing.md },
  back: { alignSelf: 'flex-start', minHeight: Layout.minTouchTarget, minWidth: Layout.minTouchTarget, justifyContent: 'center', paddingHorizontal: Spacing.sm },
  pressed: { opacity: 0.7 },
  title: { gap: Spacing.xs },
  eyebrow: { ...Typography.label, color: Colors.accent },
  heading: { ...Typography.heading, fontSize: 26, lineHeight: 30, color: Colors.text },
  panel: { backgroundColor: Colors.surface, borderRadius: Radius.md, padding: Spacing.md, gap: Spacing.sm },
  information: { gap: Spacing.xs },
  counts: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  label: { ...Typography.label, color: Colors.textSecondary },
  status: { ...Typography.label, color: Colors.text },
  secondary: { ...Typography.label, color: Colors.textSecondary },
});

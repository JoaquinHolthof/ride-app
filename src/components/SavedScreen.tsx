import { useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Station } from '@/api/citybikes';
import type { useStations } from '@/hooks/use-stations';
import type { useFavourites } from '@/hooks/use-favourites';
import { Colors, Layout, Radius, Spacing, Typography } from '@/constants/theme';
import type { RideMode } from '@/utils/explore';
import { ActionButton } from './ActionButton';
import { DataStatus } from './DataStatus';
import { SaveStationButton } from './SaveStationButton';
import { SourceCredit } from './SourceCredit';
import { StateMessage } from './StateMessage';
import { StationCard } from './StationCard';

interface Props {
  favourites: ReturnType<typeof useFavourites>;
  feed: ReturnType<typeof useStations>;
  mode: RideMode;
  onExplore: () => void;
  onOpen: (station: Station) => void;
}
const EMPTY_IDS: readonly string[] = [];
export function SavedScreen({ favourites, feed, mode, onExplore, onOpen }: Props) {
  const stations = useMemo(() => new Map(feed.data?.stations.map(station => [station.id, station])), [feed.data]);
  const refresh = async () => { await Promise.all([favourites.refresh(), feed.refresh()]); };
  const empty = favourites.ids === null
    ? <StateMessage loading={!favourites.error} title={favourites.error ? 'Can’t load saved stations' : 'Loading your saved stations'}
      description={favourites.error ? 'Connect to the internet and retry. Your saved list has not been loaded on this device.' : 'Getting the stations saved to your account…'} />
    : <StateMessage title="No saved stations yet" description="Save a station from its preview or details to find it here." />;
  return <SafeAreaView style={styles.safeArea}>
    <FlatList data={favourites.ids ?? EMPTY_IDS} keyExtractor={id => id}
      contentContainerStyle={styles.content} initialNumToRender={8} maxToRenderPerBatch={8} windowSize={7}
      refreshing={favourites.isFetching || feed.isFetching} onRefresh={() => { void refresh(); }}
      ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
      ListHeaderComponent={<View style={styles.header}>
        <ActionButton label="Back to Explore" variant="secondary" onPress={onExplore} />
        <Text style={styles.eyebrow}>RIDE · YOUR STATIONS</Text>
        <Text accessibilityRole="header" style={styles.heading}>Saved</Text>
        <Text style={styles.text}>Your regular stops. Current bikes and free docks.</Text>
        {favourites.ids !== null && <Text style={styles.muted}>{favourites.ids.length} saved stations</Text>}
        {favourites.error && <>
          <Text accessibilityRole="alert" style={styles.text}>{favourites.error}</Text>
          {favourites.ids !== null && <Text style={styles.muted}>Showing your last synced saved list. Reconnect and refresh before changing it.</Text>}
        </>}
        <ActionButton label={favourites.isFetching ? 'Syncing saved stations…' : favourites.error ? 'Retry saved stations' : 'Refresh saved stations'}
          variant="secondary" disabled={favourites.isFetching || favourites.pendingId !== null}
          onPress={() => { void favourites.refresh(); }} />
        <DataStatus {...feed} compact />
      </View>}
      renderItem={({ item: id }) => {
        const station = stations.get(id);
        return <View style={styles.row}>
          {station ? <StationCard station={station} mode={mode} onPress={() => onOpen(station)} />
            : <View style={styles.unavailable}>
              <Text accessibilityRole="header" style={styles.text}>Saved station unavailable</Text>
              <Text style={styles.muted}>{feed.data ? 'This station is not in the current CityBikes list.' : 'Station information has not loaded. Connect and refresh for bike and dock counts.'}</Text>
              <Text style={styles.muted}>Station ID: {id}</Text>
            </View>}
          <SaveStationButton stationId={id} />
        </View>;
      }}
      ListEmptyComponent={empty} ListFooterComponent={<SourceCredit />} />
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  content: { flexGrow: 1, width: '100%', maxWidth: Layout.contentMaxWidth, alignSelf: 'center', padding: Spacing.md },
  header: { gap: Spacing.sm, paddingBottom: Spacing.lg },
  eyebrow: { ...Typography.label, color: Colors.accent },
  heading: { ...Typography.heading, color: Colors.text },
  text: { ...Typography.label, color: Colors.text },
  muted: { ...Typography.label, color: Colors.textSecondary },
  row: { gap: Spacing.sm },
  unavailable: { padding: Spacing.md, gap: Spacing.sm, borderRadius: Radius.md, backgroundColor: Colors.surface },
});

import { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Station } from '@/api/citybikes';
import type { useStations } from '@/hooks/use-stations';
import type { useFavourites } from '@/hooks/use-favourites';
import { Colors, Layout, Radius, Spacing, Typography } from '@/constants/theme';
import type { RideMode } from '@/utils/explore';
import { ActionButton } from './ActionButton';
import { DataStatus } from './DataStatus';
import { SaveStationButton, SaveStationFeedback } from './SaveStationButton';
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
  return <SafeAreaView edges={['top', 'left', 'right']} style={styles.safeArea}>
    <FlatList data={favourites.ids ?? EMPTY_IDS} keyExtractor={id => id}
      contentContainerStyle={styles.content} initialNumToRender={8} maxToRenderPerBatch={8} windowSize={7}
      refreshing={favourites.isFetching || feed.isFetching} onRefresh={() => { void refresh(); }}
      ItemSeparatorComponent={() => <View style={{ height: Spacing.md }} />}
      ListHeaderComponent={<View style={styles.header}>
        <Text style={styles.eyebrow}>RIDE · YOUR STATIONS</Text>
        <Text accessibilityRole="header" style={styles.heading}>Saved</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={[styles.muted, { flex: 1 }]}>{favourites.ids === null ? 'Your regular stops' : favourites.ids.length + ' saved stations'}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={favourites.error ? 'Retry saved stations' : 'Refresh saved stations'}
            disabled={favourites.isFetching || favourites.pendingId !== null}
            accessibilityState={{ disabled: favourites.isFetching || favourites.pendingId !== null, busy: favourites.isFetching }}
            onPress={() => { void favourites.refresh(); }} style={({ pressed }) => [{ minHeight: 44, minWidth: 44, justifyContent: 'center', paddingHorizontal: 8 }, pressed && { opacity: 0.6 }]}>
            <Text style={styles.muted}>{favourites.isFetching ? 'Syncing…' : favourites.error ? 'Retry' : 'Refresh'}</Text>
          </Pressable>
        </View>
        {favourites.error && <>
          <Text accessibilityRole="alert" style={styles.text}>{favourites.error}</Text>
          {favourites.ids !== null && <Text style={styles.muted}>Showing your last synced saved list. Reconnect and refresh before changing it.</Text>}
        </>}
        <DataStatus {...feed} compact />
      </View>}
      renderItem={({ item: id }) => {
        const station = stations.get(id);
        return <View style={styles.row}>
          {station ? <StationCard station={station} mode={mode} bookmark={<SaveStationButton stationId={id} stationName={station.name} />} onPress={() => onOpen(station)} />
            : <View style={styles.unavailable}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}><Text accessibilityRole="header" style={[styles.text, { flex: 1 }]}>Saved station unavailable</Text><SaveStationButton stationId={id} /></View>
              <Text style={styles.muted}>{feed.data ? 'This station is not in the current CityBikes list.' : 'Station information has not loaded. Connect and refresh for bike and dock counts.'}</Text>
              <Text style={styles.muted}>Station ID: {id}</Text>
            </View>}
          <SaveStationFeedback stationId={id} />
        </View>;
      }}
      ListEmptyComponent={<View>{empty}{favourites.ids?.length === 0 && <ActionButton label="Explore stations" onPress={onExplore} />}</View>} ListFooterComponent={<SourceCredit />} />
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

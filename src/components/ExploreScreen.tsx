import { useState } from 'react';
import type { Dispatch } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Station } from '@/api/citybikes';
import { Colors, Layout, Radius, Spacing, Typography } from '@/constants/theme';
import type { useStations } from '@/hooks/use-stations';
import { hasCoordinates } from '@/utils/explore';
import type { ExploreAction, ExploreState, MapRegion } from '@/utils/explore';
import { ActionButton } from './ActionButton';
import { DataStatus } from './DataStatus';
import { SegmentedControl } from './SegmentedControl';
import { SourceCredit } from './SourceCredit';
import { StateMessage } from './StateMessage';
import { StationCard } from './StationCard';
import { StationMap } from './StationMap';
import { StationPreview } from './StationPreview';
import { MapDataPanel } from './MapDataPanel';

interface Props {
  feed: ReturnType<typeof useStations>;
  state: ExploreState;
  stations: Station[];
  selected: Station | null;
  dispatch: Dispatch<ExploreAction>;
  onOpen: (station: Station) => void;
  onAccount: () => void;
  onSaved: () => void;
  onSelect: (id: string) => void;
  region: MapRegion;
  onRegionChange: (region: MapRegion) => void;
  height: number;
}

function EmptyResults({ feed, state, dispatch }: Pick<Props, 'feed' | 'state' | 'dispatch'>) {
  if (!feed.data && !feed.error) return <StateMessage loading title="Finding your next ride" description="Loading Velo Antwerpen stations…" />;
  if (!feed.data && feed.error) return <StateMessage title="Can’t load stations" description="Check your connection and use Try again above." />;
  if (state.query.trim() || state.filter !== 'all') return <View>
    <StateMessage title="No matching stations" description="Try another station name or change your availability filter." />
    <ActionButton label="Clear search & filter" onPress={() => dispatch({ type: 'clear' })} />
  </View>;
  return <StateMessage title="No stations to show" description="CityBikes returned an empty list. Refresh to try again." />;
}

export function ExploreHeader({ state, dispatch, onAccount, onSaved }: Pick<Props, 'state' | 'dispatch' | 'onAccount' | 'onSaved'>) {
  return <View testID="explore-header" style={styles.header}>
    <View style={styles.topline}>
      <Pressable accessibilityRole="button" accessibilityLabel="RIDE account" accessibilityHint="Open your account and sign out"
        onPress={onAccount} style={({ pressed }) => [styles.brandBlock, pressed && styles.pressed]}>
        <Text style={styles.brand}>RIDE</Text>
        <Text style={styles.accountLabel}>Account</Text>
      </Pressable>
      <ActionButton label="Saved" variant="secondary" onPress={onSaved} />
      <View style={styles.viewSwitch}><SegmentedControl label="Explore view" value={state.view} onChange={value => dispatch({ type: 'view', value })}
        options={[{ value: 'map', label: 'Map' }, { value: 'list', label: 'List', accessibilityLabel: 'List and station search' }]} /></View>
    </View>
    <SegmentedControl label="Find a bike or a dock" value={state.mode} onChange={value => dispatch({ type: 'mode', value })}
      options={[{ value: 'bikes', label: 'Find a bike' }, { value: 'docks', label: 'Find a dock' }]} />
  </View>;
}

export function ExploreControls({ feed, state, stations, dispatch }: Pick<Props, 'feed' | 'state' | 'stations' | 'dispatch'>) {
  return <View style={styles.controls}>
    <View style={styles.searchRow}>
      <TextInput accessibilityLabel="Search stations by name" placeholder="Search a station…" placeholderTextColor={Colors.textSecondary}
        value={state.query} onChangeText={value => dispatch({ type: 'query', value })} style={styles.search}
        autoCorrect={false} autoCapitalize="none" returnKeyType="search" />
      {!!state.query && <Pressable accessibilityRole="button" accessibilityLabel="Clear station search"
        onPress={() => dispatch({ type: 'query', value: '' })} style={({ pressed }) => [styles.clear, pressed && styles.pressed]}><Text style={styles.clearText}>×</Text></Pressable>}
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters} keyboardShouldPersistTaps="handled">
      {([{ value: 'all', label: 'All stations' }, { value: 'available', label: 'Available' },
        { value: 'zero', label: state.mode === 'bikes' ? 'No bikes' : 'No docks' }, { value: 'unknown', label: 'Unknown' }] as const).map(option =>
        <Pressable key={option.value} accessibilityRole="button" accessibilityState={{ selected: state.filter === option.value }}
          onPress={() => dispatch({ type: 'filter', value: option.value })} style={({ pressed }) => [styles.filter, state.filter === option.value && styles.activeFilter, pressed && styles.pressed]}>
          <Text style={[styles.filterText, state.filter === option.value && styles.activeFilterText]}>{option.label}</Text>
        </Pressable>)}
    </ScrollView>
    <Text accessibilityLiveRegion="polite" style={styles.meta}>{stations.length} stations · Most {state.mode} first</Text>
    <DataStatus {...feed} compact />
  </View>;
}

export function StationList({ stations, state, feed, onOpen, header, empty }: Pick<Props, 'stations' | 'state' | 'feed' | 'onOpen'> & {
  header: React.ReactElement; empty: React.ReactElement;
}) {
  return <FlatList data={stations} keyExtractor={station => station.id}
    renderItem={({ item }) => <StationCard station={item} mode={state.mode} selected={state.selectedId === item.id} onPress={() => onOpen(item)} />}
    contentContainerStyle={styles.list} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
    initialNumToRender={8} maxToRenderPerBatch={8} windowSize={7}
    ItemSeparatorComponent={() => <View style={styles.separator} />}
    refreshing={feed.isFetching && feed.data !== null} onRefresh={() => { void feed.refresh(); }}
    ListHeaderComponent={header} ListEmptyComponent={empty} ListFooterComponent={<SourceCredit />} />;
}

export function ExploreScreen(props: Props) {
  const { state, stations, feed, dispatch, selected, onOpen, onSelect, region, onRegionChange, height } = props;
  const controls = <ExploreControls {...props} />;
  const empty = <EmptyResults feed={feed} state={state} dispatch={dispatch} />;
  const unmapped = stations.filter(station => !hasCoordinates(station)).length;
  const [mapHeight, setMapHeight] = useState(height * 0.7);
  const [previewHeight, setPreviewHeight] = useState(0);
  const filtered = !!state.query.trim() || state.filter !== 'all';
  return <SafeAreaView style={styles.safeArea}>
    <ExploreHeader state={state} dispatch={dispatch} onAccount={props.onAccount} onSaved={props.onSaved} />
    {state.view === 'list' ? <StationList {...props} header={controls} empty={empty} /> :
      <View testID="explore-map-viewport" style={styles.mapArea} onLayout={event => setMapHeight(event.nativeEvent.layout.height)}>
        {stations.length > 0 ? <StationMap stations={stations} mode={state.mode} selectedId={selected?.id ?? null}
          onSelect={onSelect} initialRegion={region} onRegionChange={onRegionChange}
          focusKey={`${state.filter}|${state.query.trim()}`} fitOnMount={filtered} bottomInset={selected ? previewHeight + Spacing.md : 0} />
          : <ScrollView contentContainerStyle={styles.empty}>{empty}<DataStatus {...feed} /></ScrollView>}
        {stations.length > 0 && <View pointerEvents="box-none" style={styles.mapToolbar}>
          <MapDataPanel feed={feed} unmapped={unmapped} />
          {filtered && <ActionButton label="Filtered · edit" variant="secondary" onPress={() => dispatch({ type: 'view', value: 'list' })} />}
        </View>}
        {selected && <View style={[styles.preview, { maxHeight: Math.max(100, mapHeight * 0.5) }]}
          onLayout={event => setPreviewHeight(event.nativeEvent.layout.height)}>
          <ScrollView bounces={false} keyboardShouldPersistTaps="handled">
            <StationPreview station={selected} mode={state.mode} onOpen={() => onOpen(selected)}
              onClose={() => dispatch({ type: 'select', value: null })} />
          </ScrollView>
        </View>}
      </View>}
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  controls: { gap: Spacing.sm, paddingBottom: Spacing.md },
  header: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, gap: Spacing.xs, backgroundColor: Colors.background, flexShrink: 0 },
  topline: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.sm },
  brandBlock: { flexGrow: 1, flexShrink: 0, minHeight: Layout.minTouchTarget, minWidth: Layout.minTouchTarget,
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  accountLabel: { ...Typography.label, color: Colors.textSecondary },
  brand: { ...Typography.heading, fontSize: 28, lineHeight: 32, color: Colors.accent, fontWeight: '900', fontStyle: 'italic' },
  viewSwitch: { flexGrow: 1, flexShrink: 0, flexBasis: 160, maxWidth: 184 },
  searchRow: { flexDirection: 'row', backgroundColor: Colors.surface, borderRadius: Radius.sm, alignItems: 'center' },
  search: { ...Typography.label, color: Colors.text, minHeight: Layout.minTouchTarget, flex: 1, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  clear: { minHeight: Layout.minTouchTarget, minWidth: Layout.minTouchTarget, justifyContent: 'center', alignItems: 'center' },
  clearText: { color: Colors.text, fontSize: 26 },
  filters: { gap: Spacing.sm },
  filter: { minHeight: Layout.minTouchTarget, paddingHorizontal: Spacing.md, justifyContent: 'center', borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.surface },
  activeFilter: { borderColor: Colors.accent, backgroundColor: Colors.surface },
  filterText: { ...Typography.label, color: Colors.textSecondary },
  activeFilterText: { color: Colors.accent },
  pressed: { opacity: 0.7 },
  meta: { ...Typography.label, color: Colors.textSecondary },
  list: { flexGrow: 1, padding: Spacing.md, width: '100%', maxWidth: Layout.contentMaxWidth, alignSelf: 'center' },
  separator: { height: Spacing.md },
  mapArea: { flex: 1, minHeight: 0, overflow: 'hidden' },
  empty: { padding: Spacing.md },
  mapToolbar: { position: 'absolute', top: Spacing.sm, left: Spacing.sm, right: Spacing.sm,
    flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', gap: Spacing.sm },
  preview: { position: 'absolute', bottom: Spacing.sm, left: Spacing.sm, right: Spacing.sm,
    borderRadius: Radius.md, overflow: 'hidden', backgroundColor: Colors.surface, borderColor: Colors.textSecondary, borderWidth: 1 },
});

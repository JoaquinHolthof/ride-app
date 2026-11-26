import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Keyboard, Modal, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Circle, Marker } from 'react-native-maps';
import { Colors, Layout, Spacing, Typography } from '@/constants/theme';
import { availability, hasCoordinates, modeStatus } from '@/utils/explore';
import type { StationMapProps } from './StationMap.types';
import { clusterAction, clusterStations } from '@/utils/map-clusters';
import type { StationCluster } from '@/utils/map-clusters';
import type { MapRegion } from '@/utils/explore';
import { ActionButton } from './ActionButton';
import { StationCard } from './StationCard';

function ClusterMarker({ cluster, mode, onPress }: { cluster: StationCluster; mode: string; onPress: () => void }) {
  const [tracking, setTracking] = useState(true);
  useEffect(() => {
    // Capture the badge once, rather than continuously snapshotting every cluster.
    const timer = setTimeout(() => setTracking(false), 750);
    return () => clearTimeout(timer);
  }, []);
  const color = cluster.available > 0 ? Colors.accent : cluster.unknown > 0 ? Colors.text : Colors.textSecondary;
  return <Marker identifier={cluster.id} coordinate={{ latitude: cluster.latitude, longitude: cluster.longitude }}
    accessibilityLabel={`${cluster.stations.length} stations. ${cluster.total} known ${mode}${cluster.unknown ? ` · ${cluster.unknown} unknown` : ''}. Zoom in or choose a station.`}
    accessibilityRole="button"
    tracksViewChanges={tracking} stopPropagation onPress={onPress} anchor={{ x: 0.5, y: 0.5 }}>
    <View style={[styles.cluster, { borderColor: color }]} collapsable={false}>
      <Text style={[styles.clusterCount, { color }]}>{cluster.stations.length}</Text>
    </View>
  </Marker>;
}

const darkMap = [
  { elementType: 'geometry', stylers: [{ color: Colors.surface }] },
  { elementType: 'labels.text.fill', stylers: [{ color: Colors.textSecondary }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: Colors.background }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#354239' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: Colors.background }] },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
];

export const StationMap = memo(function StationMap({ stations, mode, selectedId, onSelect,
  initialRegion, onRegionChange, focusKey, fitOnMount = false, bottomInset = 0 }: StationMapProps) {
  const map = useRef<MapView>(null);
  const { fontScale } = useWindowDimensions();
  const [ready, setReady] = useState(false);
  const [slow, setSlow] = useState(false);
  const [region, setRegion] = useState(initialRegion);
  const [width, setWidth] = useState(390);
  const [memberIds, setMemberIds] = useState<string[] | null>(null);
  const previousFocus = useRef<string | null>(null);
  const located = useMemo(() => stations.filter(hasCoordinates), [stations]);
  const selected = located.find(station => station.id === selectedId);
  const items = useMemo(() => clusterStations(located, region, width, mode, selectedId), [located, region, width, mode, selectedId]);
  const members = memberIds ? located.filter(station => memberIds.includes(station.id)) : [];
  const completeRegionChange = (next: MapRegion) => { setRegion(next); onRegionChange(next); };
  const openCluster = (cluster: StationCluster) => {
    Keyboard.dismiss();
    const action = clusterAction(cluster, region, width);
    if (action.kind === 'members') setMemberIds(cluster.stations.map(station => station.id));
    else map.current?.animateToRegion(action.region, 0);
  };

  useEffect(() => {
    if (ready) return;
    const timer = setTimeout(() => setSlow(true), 12_000);
    return () => clearTimeout(timer);
  }, [ready]);
  useEffect(() => {
    // Reframe only after a deliberate mode/search/filter change, never after a fetch or pan.
    if (!ready || previousFocus.current === focusKey) return;
    const initial = previousFocus.current === null;
    previousFocus.current = focusKey;
    if (initial && !fitOnMount) return;
    if (located.length) map.current?.fitToCoordinates(located, {
      edgePadding: { top: 45, right: 40, bottom: 45, left: 40 }, animated: false,
    });
  }, [focusKey, located, ready, fitOnMount]);

  return <View style={styles.container} onLayout={event => setWidth(Math.max(1, event.nativeEvent.layout.width))}>
    <MapView ref={map} style={styles.map} initialRegion={initialRegion}
      mapPadding={{ top: 64, right: 12, bottom: bottomInset + 12, left: 12 }}
      userInterfaceStyle="dark" customMapStyle={darkMap} loadingEnabled
      loadingBackgroundColor={Colors.surface} loadingIndicatorColor={Colors.accent}
      showsUserLocation={false} showsMyLocationButton={false} showsPointsOfInterests={false}
      showsCompass pitchEnabled={false} rotateEnabled={false} moveOnMarkerPress={false}
      onPanDrag={Keyboard.dismiss} onRegionChangeComplete={completeRegionChange}
      onMapReady={() => setReady(true)}>
      {items.map(item => {
        if (item.kind === 'cluster') return <ClusterMarker
          key={`${item.id}:${mode}:${item.stations.length}:${item.available}:${item.unknown}:${item.total}:${fontScale}`}
          cluster={item} mode={mode} onPress={() => openCluster(item)} />;
        const station = item.station;
        const status = availability(station, mode);
        return <Marker key={`${station.id}:${mode}:${status}`} identifier={station.id}
          coordinate={{ latitude: station.latitude, longitude: station.longitude }}
          accessibilityLabel={`${station.name}. ${modeStatus(station, mode)}${station.id === selectedId ? '. Selected' : ''}`}
          accessibilityState={{ selected: station.id === selectedId }}
          pinColor={status === 'available' ? Colors.accent : status === 'unknown' ? Colors.text : Colors.textSecondary}
          zIndex={station.id === selectedId ? 10 : 1} tracksViewChanges={false} stopPropagation
          onPress={() => { Keyboard.dismiss(); onSelect(station.id); }} />;
      })}
      {selected && <Circle center={{ latitude: selected.latitude, longitude: selected.longitude }}
        radius={55} strokeWidth={3} strokeColor={Colors.accent} fillColor="rgba(216,255,106,0.12)" />}
    </MapView>
    <Modal visible={memberIds !== null} animationType="none" onRequestClose={() => setMemberIds(null)}>
      <SafeAreaView style={styles.memberScreen}>
        <View style={styles.memberHeader}><ActionButton label="Back to map" onPress={() => setMemberIds(null)} />
          <Text style={styles.text}>Stations at this location</Text></View>
        <FlatList data={members} keyExtractor={station => station.id} contentContainerStyle={styles.members}
          ItemSeparatorComponent={() => <View style={{ height: Spacing.sm }} />}
          ListEmptyComponent={<Text style={styles.text}>These stations are no longer in the results.</Text>}
          renderItem={({ item }) => <StationCard station={item} mode={mode} onPress={() => { onSelect(item.id); setMemberIds(null); }} />} />
      </SafeAreaView>
    </Modal>
    {slow && !ready && <View style={styles.notice}><Text style={styles.text}>
      Map taking too long? Switch to List above. Station data remains available.
    </Text></View>}
  </View>;
});
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.surface },
  map: { flex: 1 },
  notice: { position: 'absolute', bottom: 12, left: 12, right: 12, padding: Spacing.md, backgroundColor: Colors.background },
  cluster: { minWidth: Layout.minTouchTarget, minHeight: Layout.minTouchTarget, paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs, borderRadius: 22, borderWidth: 2, backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center' },
  clusterCount: { ...Typography.label, fontWeight: '800' },
  memberScreen: { flex: 1, backgroundColor: Colors.background },
  memberHeader: { padding: Spacing.md, gap: Spacing.md },
  members: { padding: Spacing.md },
  text: { ...Typography.label, color: Colors.text },
});

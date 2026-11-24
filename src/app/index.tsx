import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { Platform, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import type { Station } from '@/api/citybikes';
import { ExploreScreen } from '@/components/ExploreScreen';
import { useStations } from '@/hooks/use-stations';
import { ANTWERP_REGION, exploreReducer, exploreStations, initialExploreState, selectedStation } from '@/utils/explore';
import type { MapRegion } from '@/utils/explore';

const EMPTY_STATIONS: Station[] = [];
export default function HomeScreen() {
  const feed = useStations();
  const { height } = useWindowDimensions();
  const [state, dispatch] = useReducer(exploreReducer, {
    ...initialExploreState, view: Platform.OS === 'web' ? 'list' : 'map',
  });
  const region = useRef(ANTWERP_REGION);
  const allStations = feed.data?.stations ?? EMPTY_STATIONS;
  const stations = useMemo(() => exploreStations(allStations, state.mode, state.query, state.filter),
    [allStations, state.mode, state.query, state.filter]);
  const selected = selectedStation(stations, state.selectedId);
  useEffect(() => {
    if (state.selectedId && !selected) dispatch({ type: 'select', value: null });
  }, [state.selectedId, selected]);
  const onSelect = useCallback((id: string) => dispatch({ type: 'select', value: id }), []);
  const onRegionChange = useCallback((next: MapRegion) => { region.current = next; }, []);
  const onOpen = useCallback((station: Station) => {
    dispatch({ type: 'select', value: station.id });
    router.push({ pathname: '/station/[id]', params: { id: station.id, mode: state.mode } });
  }, [state.mode]);
  return <ExploreScreen feed={feed} state={state} stations={stations} selected={selected} dispatch={dispatch}
    onOpen={onOpen} onSelect={onSelect} region={region.current} onRegionChange={onRegionChange} height={height} />;
}

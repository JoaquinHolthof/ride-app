import type { Station } from '../api/citybikes';

export type RideMode = 'bikes' | 'docks';
export type AvailabilityFilter = 'all' | 'available' | 'zero' | 'unknown';
export type ExploreView = 'map' | 'list';
export interface ExploreState {
  mode: RideMode;
  view: ExploreView;
  query: string;
  filter: AvailabilityFilter;
  selectedId: string | null;
}
export const initialExploreState: ExploreState = {
  mode: 'bikes', view: 'map', query: '', filter: 'all', selectedId: null,
};
export type ExploreAction =
  | { type: 'mode'; value: RideMode }
  | { type: 'view'; value: ExploreView }
  | { type: 'query'; value: string }
  | { type: 'filter'; value: AvailabilityFilter }
  | { type: 'select'; value: string | null }
  | { type: 'clear' };

export function exploreReducer(state: ExploreState, action: ExploreAction): ExploreState {
  if (action.type === 'clear') return { ...state, query: '', filter: 'all', selectedId: null };
  if (action.type === 'select') return { ...state, selectedId: action.value };
  return { ...state, [action.type]: action.value };
}

export function modeCount(station: Station, mode: RideMode): number | null {
  return mode === 'bikes' ? station.free_bikes : station.empty_slots;
}

export function availability(station: Station, mode: RideMode) {
  if (station.closed) return 'closed';
  const count = modeCount(station, mode);
  return count === null ? 'unknown' : count === 0 ? 'zero' : 'available';
}

export function modeStatus(station: Station, mode: RideMode): string {
  const status = availability(station, mode);
  if (status === 'closed') return 'Station closed';
  if (status === 'unknown') return `${mode === 'bikes' ? 'Bike' : 'Dock'} count unknown`;
  if (status === 'zero') return mode === 'bikes' ? 'No bikes available' : 'No free docks';
  return `${modeCount(station, mode)} ${mode === 'bikes' ? 'bikes available' : 'docks free'}`;
}

const normalize = (text: string) => text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('nl').trim();
const rank = { available: 0, zero: 1, unknown: 2, closed: 3 };

export function exploreStations(stations: readonly Station[], mode: RideMode, query: string, filter: AvailabilityFilter): Station[] {
  const search = normalize(query);
  return stations.filter(station => normalize(station.name).includes(search)
    && (filter === 'all' || availability(station, mode) === filter))
    .sort((a, b) => rank[availability(a, mode)] - rank[availability(b, mode)]
      || (modeCount(b, mode) ?? -1) - (modeCount(a, mode) ?? -1)
      || a.name.localeCompare(b.name, 'nl', { numeric: true }) || a.id.localeCompare(b.id));
}

export function selectedStation(stations: readonly Station[], id: string | null): Station | null {
  return stations.find(station => station.id === id) ?? null;
}

export type LocatedStation = Station & { latitude: number; longitude: number };
export function hasCoordinates(station: Station): station is LocatedStation {
  return station.latitude !== null && station.longitude !== null
    && Number.isFinite(station.latitude) && Math.abs(station.latitude) <= 90
    && Number.isFinite(station.longitude) && Math.abs(station.longitude) <= 180;
}

export function directionsUrl(station: Station): string | null {
  if (!hasCoordinates(station)) return null;
  // No origin is supplied. The external maps app lets the user choose it.
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${station.latitude},${station.longitude}`)}`;
}

export interface MapRegion { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number }
export const ANTWERP_REGION: MapRegion = { latitude: 51.213, longitude: 4.415, latitudeDelta: 0.11, longitudeDelta: 0.11 };

import type { Station } from '../api/citybikes';
import { availability, hasCoordinates, modeCount } from './explore';
import type { LocatedStation, MapRegion, RideMode } from './explore';

export interface StationPin { kind: 'station'; id: string; station: LocatedStation }
export interface StationCluster {
  kind: 'cluster'; id: string; latitude: number; longitude: number;
  stations: LocatedStation[]; available: number; unknown: number; total: number;
}
export type MapItem = StationPin | StationCluster;

const mercatorY = (latitude: number) => {
  const sin = Math.sin(Math.max(-85.0511, Math.min(85.0511, latitude)) * Math.PI / 180);
  return 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI);
};
const latitudeFromY = (y: number) => Math.atan(Math.sinh(Math.PI * (1 - 2 * y))) * 180 / Math.PI;

export function mapZoom(region: MapRegion, width: number): number {
  return Math.max(0, Math.min(20, Math.floor(Math.log2(360 * Math.max(1, width) / (256 * Math.max(0.000001, region.longitudeDelta))))));
}

/** World-anchored screen grid. No native module, network, or altered station coordinates.
 * Quantized zoom keeps buckets stable while panning; viewport padding avoids edge popping.
 */
export function clusterStations(stations: readonly Station[], region: MapRegion, width: number,
  mode: RideMode, selectedId: string | null = null): MapItem[] {
  const zoom = mapZoom(region, width);
  const world = 256 * 2 ** zoom;
  const cells = new Map<string, LocatedStation[]>();
  const result: MapItem[] = [];
  for (const station of stations) {
    if (!hasCoordinates(station)) continue;
    const longitudeDistance = Math.abs(((station.longitude - region.longitude + 540) % 360) - 180);
    if (Math.abs(station.latitude - region.latitude) > region.latitudeDelta * 0.7
      || longitudeDistance > region.longitudeDelta * 0.7) continue;
    // Never absorb the selected station into a cluster.
    if (station.id === selectedId) {
      result.push({ kind: 'station', id: station.id, station });
      continue;
    }
    const x = (station.longitude + 180) / 360 * world;
    const y = mercatorY(station.latitude) * world;
    const key = `${zoom}:${Math.floor(x / 64)}:${Math.floor(y / 64)}`;
    const cell = cells.get(key);
    if (cell) cell.push(station); else cells.set(key, [station]);
  }
  for (const [key, members] of cells) {
    if (members.length === 1) {
      result.push({ kind: 'station', id: members[0].id, station: members[0] });
      continue;
    }
    members.sort((a, b) => a.id.localeCompare(b.id));
    const available = members.filter(station => availability(station, mode) === 'available');
    result.push({
      kind: 'cluster', id: `cluster:${key}`,
      latitude: latitudeFromY(members.reduce((sum, station) => sum + mercatorY(station.latitude), 0) / members.length),
      longitude: members.reduce((sum, station) => sum + station.longitude, 0) / members.length,
      stations: members, available: available.length,
      unknown: members.filter(station => availability(station, mode) === 'unknown').length,
      total: available.reduce((sum, station) => sum + (modeCount(station, mode) ?? 0), 0),
    });
  }
  return result;
}

export function clusterAction(cluster: StationCluster, region: MapRegion, width: number):
  { kind: 'members' } | { kind: 'zoom'; region: MapRegion } {
  const latitudes = cluster.stations.map(station => station.latitude);
  const longitudes = cluster.stations.map(station => station.longitude);
  const latitudeDelta = Math.max(...latitudes) - Math.min(...latitudes);
  const longitudeDelta = Math.max(...longitudes) - Math.min(...longitudes);
  if (mapZoom(region, width) >= 18 || Math.max(latitudeDelta, longitudeDelta) < 0.00001) return { kind: 'members' };
  return { kind: 'zoom', region: {
    latitude: (Math.min(...latitudes) + Math.max(...latitudes)) / 2,
    longitude: (Math.min(...longitudes) + Math.max(...longitudes)) / 2,
    latitudeDelta: Math.max(latitudeDelta * 1.8, 0.0005),
    longitudeDelta: Math.max(longitudeDelta * 1.8, 0.0005),
  } };
}

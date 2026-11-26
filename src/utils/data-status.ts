import type { StationsState } from '@/state/stations';
import { CACHE_TTL_MS } from '@/state/stations';
import { Colors } from '@/constants/theme';
import { ageLabel } from './station-display';

export function dataStatus({ data, isFetching, error, now }: StationsState & { now: number }) {
  if (isFetching) return { kind: 'loading', label: data ? 'Updating…' : 'Loading…', color: Colors.statusNeutral };
  if (error) {
    const connection = /offline|unable to connect|connection/i.test(error);
    return { kind: connection ? 'offline' : 'error', label: (connection ? 'Connection issue' : 'Refresh failed') + (data ? ' · cached' : ''), color: Colors.warning };
  }
  if (!data) return { kind: 'loading', label: 'Waiting for data', color: Colors.statusNeutral };
  const staleSource = data.stations.some(s => s.timestamp && now - Date.parse(s.timestamp) > 5 * 60_000);
  const unknownSource = !data.stations.length || data.stations.some(s => !s.timestamp || !Number.isFinite(Date.parse(s.timestamp)));
  if (staleSource) return { kind: 'cached', label: 'Older source data', color: Colors.warning };
  if (now - data.fetchedAt >= CACHE_TTL_MS) return { kind: 'cached', label: 'Cached · ' + ageLabel(data.fetchedAt, now), color: Colors.warning };
  if (unknownSource) return { kind: 'cached', label: 'Source time unknown', color: Colors.statusNeutral };
  return { kind: 'fresh', label: 'Updated ' + ageLabel(data.fetchedAt, now), color: Colors.accent };
}

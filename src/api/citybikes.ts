export const NETWORK_URL = 'https://api.citybik.es/v2/networks/velo-antwerpen';

/** API fields are untrusted until parsed; absent/invalid counts are never zero. */
export interface CityBikesStationResponse {
  id?: unknown;
  name?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  free_bikes?: unknown;
  empty_slots?: unknown;
  timestamp?: unknown;
  extra?: unknown;
}

export interface CityBikesResponse {
  network?: { id?: unknown; stations?: unknown };
}

export interface Station {
  id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  free_bikes: number | null;
  empty_slots: number | null;
  timestamp: string | null;
  address: string | null;
  closed: boolean;
}

export interface StationData {
  stations: Station[];
  fetchedAt: number;
  skippedStations: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function count(value: unknown): number | null {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function coordinate(value: unknown, limit: number): number | null {
  return typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= limit
    ? value : null;
}

function timestamp(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  // CityBikes currently emits microseconds and a redundant Z after the UTC offset.
  const normalized = value.replace(/([+-]\d{2}:\d{2})Z$/, '$1').replace(/(\.\d{3})\d+/, '$1');
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/.test(normalized)) return null;
  const parsed = Date.parse(normalized);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

export function parseStations(payload: unknown): Pick<StationData, 'stations' | 'skippedStations'> {
  if (!isRecord(payload) || !isRecord(payload.network)) {
    throw new Error('CityBikes returned an invalid network response.');
  }
  const response: CityBikesResponse = { network: payload.network };
  const network = response.network!;
  if (network.id !== 'velo-antwerpen' || !Array.isArray(network.stations)) {
    throw new Error('CityBikes returned an invalid station list.');
  }
  const seen = new Set<string>();
  const stations: Station[] = [];
  let skippedStations = 0;
  for (const item of network.stations) {
    const raw: CityBikesStationResponse = isRecord(item) ? item : {};
    const id = text(raw.id);
    const name = text(raw.name);
    if (!id || !name || seen.has(id)) {
      skippedStations++;
      continue;
    }
    seen.add(id);
    const extra = isRecord(raw.extra) ? raw.extra : {};
    stations.push({
      id, name,
      latitude: coordinate(raw.latitude, 90),
      longitude: coordinate(raw.longitude, 180),
      free_bikes: count(raw.free_bikes),
      empty_slots: count(raw.empty_slots),
      timestamp: timestamp(raw.timestamp),
      address: text(extra.address),
      closed: extra.status === 'CLS' || extra.status === 'CLOSED',
    });
  }
  if (network.stations.length > 0 && stations.length === 0) {
    throw new Error('CityBikes returned no readable stations. Please try again.');
  }
  stations.sort((a, b) => a.name.localeCompare(b.name, 'nl', { numeric: true }));
  return { stations, skippedStations };
}

export class StationRequestError extends Error {
  constructor(message: string, public retryAfterMs = 15_000) {
    super(message);
  }
}

export async function fetchStations(
  fetcher: typeof fetch = fetch,
  now: () => number = Date.now,
  timeoutMs = 12_000,
): Promise<StationData> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetcher(NETWORK_URL, { signal: controller.signal });
    if (!response.ok) {
      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after');
        const seconds = retryAfter ? Number(retryAfter) : NaN;
        const delay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(retryAfter ?? '') - now();
        throw new StationRequestError('CityBikes is busy. Please wait before trying again.',
          Number.isFinite(delay) ? Math.max(60_000, delay) : 60_000);
      }
      throw new StationRequestError(`CityBikes is unavailable (HTTP ${response.status}). Please try again.`);
    }
    const parsed = parseStations(await response.json());
    return { ...parsed, fetchedAt: now() };
  } catch (error) {
    if (controller.signal.aborted) throw new StationRequestError('The request timed out. Please try again.');
    if (error instanceof TypeError) throw new StationRequestError('Unable to connect. Check your connection and try again.');
    if (error instanceof SyntaxError) throw new StationRequestError('CityBikes returned unreadable data. Please try again.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

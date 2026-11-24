import { fetchStations, StationRequestError } from '../api/citybikes';
import type { StationData } from '../api/citybikes';

export const CACHE_TTL_MS = 60_000;
export const REQUEST_COOLDOWN_MS = 15_000;

export interface StationsState {
  data: StationData | null;
  isFetching: boolean;
  error: string | null;
  retryAt: number;
}

/** Session-only cache shared by every route; no polling and no disk storage. */
export function createStationsStore(
  request: () => Promise<StationData> = fetchStations,
  now: () => number = Date.now,
) {
  let state: StationsState = { data: null, isFetching: false, error: null, retryAt: 0 };
  let inFlight: Promise<void> | null = null;
  const listeners = new Set<() => void>();
  const publish = (next: StationsState) => {
    state = next;
    listeners.forEach(listener => listener());
  };

  function load(force = false): Promise<void> {
    if (inFlight) return inFlight;
    if (now() < state.retryAt) return Promise.resolve();
    if (!force && state.data && now() - state.data.fetchedAt < CACHE_TTL_MS) return Promise.resolve();
    publish({ ...state, isFetching: true, error: null, retryAt: now() + REQUEST_COOLDOWN_MS });
    inFlight = Promise.resolve().then(request).then(
      data => publish({ ...state, data, isFetching: false, error: null }),
      error => publish({
        ...state,
        isFetching: false,
        error: error instanceof Error ? error.message : 'Unable to load stations. Please try again.',
        retryAt: Math.max(state.retryAt, now() + (error instanceof StationRequestError ? error.retryAfterMs : REQUEST_COOLDOWN_MS)),
      }),
    ).finally(() => { inFlight = null; });
    return inFlight;
  }

  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    load,
  };
}

export const stationsStore = createStationsStore();

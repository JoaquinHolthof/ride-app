import { favouritesError, type FavouritesApi } from './api';

export interface FavouritesState {
  userId: string | null;
  ids: readonly string[] | null;
  isFetching: boolean;
  pendingId: string | null;
  error: string | null;
  mutationError: { stationId: string; message: string } | null;
}

export function createFavouritesStore(userId: string | null, api: FavouritesApi | null) {
  const initial = (): FavouritesState => ({ userId, ids: null, isFetching: false, pendingId: null, error: null, mutationError: null });
  let state = initial();
  let active = true;
  let generation = 0;
  let work: Promise<void> | null = null;
  let controller: AbortController | null = null;
  const listeners = new Set<() => void>();
  const publish = (next: FavouritesState) => { state = next; listeners.forEach(listener => listener()); };
  function run(operation: (signal: AbortSignal) => Promise<Partial<FavouritesState>>, stationId?: string) {
    if (!active || !userId || !api || work) return work ?? Promise.resolve();
    const revision = generation;
    controller = new AbortController();
    const signal = controller.signal;
    publish({ ...state, error: stationId ? state.error : null, mutationError: null,
      isFetching: !stationId, pendingId: stationId ?? null });
    work = Promise.resolve().then(() => operation(signal)).then(patch => {
      if (active && generation === revision) publish({ ...state, ...patch, isFetching: false, pendingId: null });
    }).catch(error => {
      if (!active || generation !== revision) return;
      const message = favouritesError(error);
      publish({ ...state, isFetching: false, pendingId: null,
        ...(stationId ? { mutationError: { stationId, message } } : { error: message }) });
    }).finally(() => {
      if (generation === revision) { work = null; controller = null; }
    });
    return work;
  }
  function refresh() {
    return run(async signal => ({ ids: await api!.list(userId!, signal), error: null }));
  }
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    refresh,
    activate: () => { active = true; return refresh(); },
    dispose: () => {
      active = false;
      generation++;
      controller?.abort();
      controller = null;
      work = null;
      publish(initial());
    },
    toggle: (stationId: string) => {
      if (!state.ids || state.error || state.isFetching || state.pendingId) return Promise.resolve();
      const saved = state.ids.includes(stationId);
      return run(async signal => {
        if (saved) await api!.remove(userId!, stationId, signal);
        else await api!.save(userId!, stationId, signal);
        return { ids: saved ? state.ids!.filter(id => id !== stationId) : [...new Set([...state.ids!, stationId])] };
      }, stationId);
    },
  };
}
export type FavouritesStore = ReturnType<typeof createFavouritesStore>;

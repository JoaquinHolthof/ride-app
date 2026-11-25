import type { SupabaseClient } from '@supabase/supabase-js';

export interface FavouritesApi {
  list(userId: string, signal: AbortSignal): Promise<string[]>;
  save(userId: string, stationId: string, signal: AbortSignal): Promise<void>;
  remove(userId: string, stationId: string, signal: AbortSignal): Promise<void>;
}
export const validStationId = (id: unknown): id is string =>
  typeof id === 'string' && id.length > 0 && [...id].length <= 256 && id.trim() === id;

export class FavouritesError extends Error {}
export function favouritesError(error: unknown) {
  if (error instanceof FavouritesError) return error.message;
  const code = error && typeof error === 'object' && 'code' in error ? error.code : null;
  if (code === '42P01' || code === 'PGRST205') return 'Saved stations are not set up yet. Ask the project owner to apply the favourites migration.';
  if (code === '42501' || code === 'PGRST301' || code === 'PGRST303') return 'Saved stations could not be accessed. Try signing in again; if it continues, ask the project owner to check database access.';
  return 'Could not sync saved stations. Check your connection and try again. Changes are not queued offline.';
}

export function parseFavouriteRows(data: unknown, userId: string): string[] {
  if (!Array.isArray(data)) throw new FavouritesError('Saved stations returned an unreadable response. Try again.');
  const ids: string[] = [];
  for (const row of data) {
    if (!row || typeof row !== 'object' || row.user_id !== userId || !validStationId(row.station_id)) {
      throw new FavouritesError('Saved stations could not be verified. Try signing in again.');
    }
    ids.push(row.station_id);
  }
  return [...new Set(ids)];
}

// Public client + the current user's JWT only. Ownership filters supplement RLS;
// the database policies remain the security boundary even for a modified app.
export function createFavouritesApi(client: SupabaseClient): FavouritesApi {
  async function request<T>(userId: string, parent: AbortSignal, run: (signal: AbortSignal) => Promise<T>): Promise<T> {
    const controller = new AbortController();
    let rejectAbort: (error: Error) => void;
    const cancelled = new Promise<never>((_, reject) => { rejectAbort = reject; });
    const abort = () => { controller.abort(); rejectAbort(new Error()); };
    parent.addEventListener('abort', abort);
    if (parent.aborted) abort();
    const timeout = setTimeout(abort, 12_000);
    try {
      return await Promise.race([cancelled, (async () => {
        const { data, error } = await client.auth.getSession();
        if (error || data.session?.user.id !== userId) throw new FavouritesError('Sign in again to sync your saved stations.');
        if (controller.signal.aborted) throw new Error();
        return run(controller.signal);
      })()]);
    } finally { clearTimeout(timeout); parent.removeEventListener('abort', abort); }
  }
  return {
    list: (userId, signal) => request(userId, signal, async abortSignal => {
      const ids = new Set<string>();
      // Keyset pagination avoids the Data API's response row limit.
      let after: string | null = null;
      for (;;) {
        let query = client.from('favourites').select('user_id,station_id').eq('user_id', userId)
          .order('station_id', { ascending: true }).limit(500);
        if (after !== null) query = query.gt('station_id', after);
        const { data, error } = await query.abortSignal(abortSignal);
        if (error) throw error;
        const page = parseFavouriteRows(data, userId);
        if (!page.length) return [...ids];
        const last = page[page.length - 1];
        if (last === after) throw new FavouritesError('Saved stations could not be fully loaded. Try again.');
        page.forEach(id => ids.add(id));
        after = last;
        // Always query the next page, even if the server caps responses below 500.
      }
    }),
    save: (userId, stationId, signal) => request(userId, signal, async abortSignal => {
      if (!validStationId(stationId)) throw new FavouritesError('This station cannot be saved.');
      const { data, error } = await client.from('favourites').insert({ user_id: userId, station_id: stationId })
        .select('user_id,station_id').abortSignal(abortSignal);
      if (error?.code === '23505') {
        // Idempotent save without granting UPDATE or using an UPDATE-based upsert.
        const existing = await client.from('favourites').select('user_id,station_id')
          .eq('user_id', userId).eq('station_id', stationId).abortSignal(abortSignal);
        if (existing.error) throw existing.error;
        if (!parseFavouriteRows(existing.data, userId).includes(stationId)) throw new Error();
      } else {
        if (error) throw error;
        const ids = parseFavouriteRows(data, userId);
        if (ids.length !== 1 || ids[0] !== stationId) throw new Error();
      }
    }),
    remove: (userId, stationId, signal) => request(userId, signal, async abortSignal => {
      if (!validStationId(stationId)) throw new FavouritesError('This station cannot be removed.');
      const { data, error } = await client.from('favourites').delete()
        .eq('user_id', userId).eq('station_id', stationId).select('user_id,station_id').abortSignal(abortSignal);
      if (error) throw error;
      const ids = parseFavouriteRows(data, userId);
      if (ids.some(id => id !== stationId)) throw new Error();
      // An already-removed own row is a successful idempotent deletion.
    }),
  };
}

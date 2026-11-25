import { useContext, useSyncExternalStore } from 'react';
import { FavouritesContext } from '@/favourites/context';

export function useFavourites() {
  const store = useContext(FavouritesContext);
  if (!store) throw new Error('FavouritesProvider is required.');
  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  return { ...state, refresh: store.refresh, toggle: store.toggle };
}

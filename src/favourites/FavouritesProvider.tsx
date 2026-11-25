import { useEffect, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '@/auth/AuthProvider';
import { supabase } from '@/auth/client';
import { createFavouritesApi } from './api';
import { FavouritesContext } from './context';
import { createFavouritesStore } from './store';

const api = supabase ? createFavouritesApi(supabase) : null;
function AccountFavourites({ userId, children }: PropsWithChildren<{ userId: string | null }>) {
  const [store] = useState(() => createFavouritesStore(userId, api));
  useEffect(() => {
    void store.activate();
    const subscription = AppState.addEventListener('change', next => {
      if (next === 'active') void store.refresh();
    });
    return () => { subscription.remove(); store.dispose(); };
  }, [store]);
  return <FavouritesContext.Provider value={store}>{children}</FavouritesContext.Provider>;
}

export function FavouritesProvider({ children }: PropsWithChildren) {
  const { state } = useAuth();
  const userId = state.status === 'ready' ? state.session?.user.id ?? null : null;
  // Keyed during render, not an effect: there is no frame displaying account A's
  // private data under account B. Token refresh for the same UUID preserves state.
  return <AccountFavourites key={userId ?? 'signed-out'} userId={userId}>{children}</AccountFavourites>;
}

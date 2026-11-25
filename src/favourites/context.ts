import { createContext } from 'react';
import type { FavouritesStore } from './store';
export const FavouritesContext = createContext<FavouritesStore | null>(null);

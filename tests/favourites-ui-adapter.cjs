// Existing station tests isolate the newly shared favourites boundary.
const { mocks } = require('./register.cjs');
mocks.set('@/hooks/use-favourites', { useFavourites: () => ({ userId: 'fixture-user', ids: [], isFetching: false,
  pendingId: null, error: null, mutationError: null, refresh: async () => {}, toggle: async () => {} }) });
mocks.set('@/favourites/FavouritesProvider', { FavouritesProvider: ({ children }) => children });

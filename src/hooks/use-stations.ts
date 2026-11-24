import { useEffect, useState, useSyncExternalStore } from 'react';

import { stationsStore } from '../state/stations';

export function useStations() {
  const state = useSyncExternalStore(stationsStore.subscribe, stationsStore.getSnapshot, stationsStore.getSnapshot);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    void stationsStore.load();
    // Update age/cooldown labels locally; this never fetches network data.
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return { ...state, now, refresh: () => stationsStore.load(true) };
}

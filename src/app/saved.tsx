import { useCallback } from 'react';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { SavedScreen } from '@/components/SavedScreen';
import { useFavourites } from '@/hooks/use-favourites';
import { useStations } from '@/hooks/use-stations';

export default function SavedRoute() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const selectedMode = mode === 'docks' ? 'docks' : 'bikes';
  const favourites = useFavourites();
  const feed = useStations();
  useFocusEffect(useCallback(() => { void favourites.refresh(); }, [favourites.refresh]));
  return <SavedScreen favourites={favourites} feed={feed} mode={selectedMode}
    onExplore={() => router.canGoBack() ? router.back() : router.replace('/')}
    onOpen={station => router.push({ pathname: '/station/[id]', params: { id: station.id, mode: selectedMode } })} />;
}

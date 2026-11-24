import { StateMessage } from './StateMessage';
import type { StationMapProps } from './StationMap.types';

/** Web fallback: never replace cartography with a decorative map. */
export function StationMap(_props: StationMapProps) {
  return <StateMessage title="Explore in the app" description="The interactive map is available in iOS and Android Expo Go. Switch to List to browse stations here." />;
}

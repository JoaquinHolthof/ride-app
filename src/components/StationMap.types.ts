import type { Station } from '@/api/citybikes';
import type { MapRegion, RideMode } from '@/utils/explore';

export interface StationMapProps {
  stations: Station[];
  mode: RideMode;
  selectedId: string | null;
  onSelect: (id: string) => void;
  initialRegion: MapRegion;
  onRegionChange: (region: MapRegion) => void;
  focusKey: string;
  fitOnMount?: boolean;
  bottomInset?: number;
}

import { Text, View } from 'react-native';
import { useFavourites } from '@/hooks/use-favourites';
import { Colors, Typography } from '@/constants/theme';
import { ActionButton } from './ActionButton';

export function SaveStationButton({ stationId }: { stationId: string }) {
  const saved = useFavourites();
  const message = saved.error ?? (saved.mutationError?.stationId === stationId ? saved.mutationError.message : null);
  const working = saved.isFetching || saved.pendingId !== null;
  return <View style={{ gap: 8 }}>
    <ActionButton variant="secondary"
      label={saved.pendingId === stationId ? 'Saving changes…' : saved.error ? 'Retry saved stations'
        : saved.ids === null ? 'Loading saved stations…' : saved.ids.includes(stationId) ? 'Unsave station' : 'Save station'}
      disabled={!saved.userId || working || (saved.ids === null && !saved.error)}
      onPress={() => { void (saved.error ? saved.refresh() : saved.toggle(stationId)); }} />
    {message && <Text accessibilityRole="alert" style={{ ...Typography.label, color: Colors.textSecondary }}>{message}</Text>}
  </View>;
}

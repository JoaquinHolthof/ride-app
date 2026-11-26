import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { useFavourites } from '@/hooks/use-favourites';
import { Colors, Typography } from '@/constants/theme';
import { RideIcon } from './RideIcon';
export function SaveStationButton({ stationId, stationName = 'station' }: { stationId: string; stationName?: string }) {
  const saved = useFavourites();
  const selected = saved.ids?.includes(stationId) ?? false;
  const busy = saved.isFetching || saved.pendingId === stationId || (saved.ids === null && !saved.error);
  const disabled = !saved.userId || saved.isFetching || saved.pendingId !== null || (saved.ids === null && !saved.error);
  return <Pressable accessibilityRole="button" accessibilityLabel={saved.error ? 'Retry saved stations' : (selected ? 'Unsave ' : 'Save ') + stationName}
    accessibilityHint={saved.mutationError?.stationId === stationId ? saved.mutationError.message : undefined}
    accessibilityState={{ selected, disabled, busy }} disabled={disabled}
    onPress={() => { void (saved.error ? saved.refresh() : saved.toggle(stationId)); }}
    style={({ pressed }) => [styles.button, selected && styles.selected, pressed && { opacity: 0.6 }, disabled && { opacity: 0.6 }]}>
    {busy ? <ActivityIndicator color={Colors.accent} /> : <RideIcon name={selected ? 'savedFilled' : 'saved'} color={selected ? Colors.accent : Colors.text} />}
  </Pressable>;
}
export function SaveStationFeedback({ stationId }: { stationId: string }) {
  const saved = useFavourites();
  const message = saved.error ?? (saved.mutationError?.stationId === stationId ? saved.mutationError.message : null);
  return message ? <Text accessibilityRole="alert" style={{ ...Typography.label, color: Colors.text }}>{message} Tap the bookmark to retry.</Text> : null;
}
const styles = StyleSheet.create({
  button: { minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  selected: { backgroundColor: Colors.background },
});

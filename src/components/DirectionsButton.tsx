import { useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import type { Station } from '@/api/citybikes';
import { Colors, Typography } from '@/constants/theme';
import { directionsUrl } from '@/utils/explore';
import { ActionButton } from './ActionButton';

export function DirectionsButton({ station }: { station: Station }) {
  const [error, setError] = useState<string | null>(null);
  const url = directionsUrl(station);
  return <View>
    <ActionButton label={url ? 'Directions ↗' : 'Directions unavailable'} disabled={!url} variant="secondary" onPress={() => {
      if (!url) return;
      setError(null);
      void Linking.openURL(url).catch(() => setError('Could not open maps. Please try again.'));
    }} />
    {error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
  </View>;
}
const styles = StyleSheet.create({ error: { ...Typography.label, color: Colors.text } });

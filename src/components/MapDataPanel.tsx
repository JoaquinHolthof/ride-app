import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Layout, Radius, Spacing, Typography } from '@/constants/theme';
import type { useStations } from '@/hooks/use-stations';
import { CACHE_TTL_MS } from '@/state/stations';
import { DataStatus } from './DataStatus';
import { ActionButton } from './ActionButton';
import { SourceCredit } from './SourceCredit';

export function MapDataPanel({ feed, unmapped }: { feed: ReturnType<typeof useStations>; unmapped: number }) {
  const [visible, setVisible] = useState(false);
  const cached = feed.data && (feed.error || feed.now - feed.data.fetchedAt >= CACHE_TTL_MS);
  const minutes = feed.data ? Math.max(0, Math.floor((feed.now - feed.data.fetchedAt) / 60_000)) : 0;
  const label = feed.error ? (feed.data ? 'Cached · refresh failed' : 'Unable to load · retry')
    : feed.isFetching ? 'Updating…' : feed.data ? `${cached ? 'Cached' : 'Data'} · ${minutes < 1 ? 'just now' : `${minutes}m ago`}` : 'Loading…';
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}. Open data, refresh and CityBikes attribution`}
      onPress={() => setVisible(true)} style={styles.button}>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
    <Modal visible={visible} animationType="none" onRequestClose={() => setVisible(false)}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.close}><ActionButton label="Back to map" onPress={() => setVisible(false)} /></View>
        <ScrollView contentContainerStyle={styles.content}>
          <Text accessibilityRole="header" style={styles.title}>Station data</Text>
          <DataStatus {...feed} />
          {unmapped > 0 && <Text style={styles.label}>{unmapped} stations have no coordinates. Find them in List.</Text>}
          <SourceCredit />
        </ScrollView>
      </SafeAreaView>
    </Modal>
  </>;
}
const styles = StyleSheet.create({
  button: { minHeight: Layout.minTouchTarget, minWidth: Layout.minTouchTarget, justifyContent: 'center',
    backgroundColor: Colors.background, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.textSecondary },
  label: { ...Typography.label, color: Colors.text },
  title: { ...Typography.heading, color: Colors.text },
  safeArea: { flex: 1, backgroundColor: Colors.background },
  close: { padding: Spacing.md },
  content: { padding: Spacing.lg, gap: Spacing.lg },
});

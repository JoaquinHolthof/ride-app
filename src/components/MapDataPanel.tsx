import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Layout, Radius, Spacing, Typography } from '@/constants/theme';
import type { useStations } from '@/hooks/use-stations';
import { dataStatus } from '@/utils/data-status';
import { DataStatus } from './DataStatus';
import { ActionButton } from './ActionButton';
import { SourceCredit } from './SourceCredit';

export function MapDataPanel({ feed, unmapped }: { feed: ReturnType<typeof useStations>; unmapped: number }) {
  const [visible, setVisible] = useState(false);
  const status = dataStatus(feed);
  const label = status.label;
  return <>
    <Pressable accessibilityRole="button" accessibilityLabel={`${label}. Open data, refresh and CityBikes attribution`}
      onPress={() => setVisible(true)} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <View style={styles.indicator}><View style={[styles.dot, { backgroundColor: status.color }]} /><Text style={styles.caption}>{label}</Text></View>
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
  button: { minHeight: Layout.minTouchTarget, minWidth: Layout.minTouchTarget, justifyContent: 'center' },
  indicator: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: Colors.background, borderRadius: Radius.sm },
  dot: { width: 6, height: 6, borderRadius: 3 },
  caption: { fontSize: 13, lineHeight: 18, color: Colors.text, flexShrink: 1 },
  label: { ...Typography.label, color: Colors.text },
  pressed: { opacity: 0.7 },
  title: { ...Typography.heading, color: Colors.text },
  safeArea: { flex: 1, backgroundColor: Colors.background },
  close: { padding: Spacing.md },
  content: { padding: Spacing.lg, gap: Spacing.lg },
});

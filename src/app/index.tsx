import { router } from 'expo-router';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DataStatus } from '@/components/DataStatus';
import { SourceCredit } from '@/components/SourceCredit';
import { StateMessage } from '@/components/StateMessage';
import { StationCard } from '@/components/StationCard';
import { Colors, Layout, Spacing, Typography } from '@/constants/theme';
import { useStations } from '@/hooks/use-stations';

export default function HomeScreen() {
  const feed = useStations();
  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={feed.data?.stations ?? []}
        keyExtractor={station => station.id}
        renderItem={({ item }) => <StationCard station={item} onPress={() => router.push({
          pathname: '/station/[id]', params: { id: item.id },
        })} />}
        contentContainerStyle={styles.content}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        refreshing={feed.isFetching && feed.data !== null}
        onRefresh={() => { void feed.refresh(); }}
        ListHeaderComponent={<View style={styles.header}>
          <Text style={styles.brand}>RIDE</Text>
          <Text accessibilityRole="header" style={styles.heading}>Antwerp stations</Text>
          <Text style={styles.description}>Your city. Your ride.</Text>
          <DataStatus {...feed} />
          {feed.data && <Text style={styles.description}>{feed.data.stations.length} stations</Text>}
        </View>}
        ListEmptyComponent={!feed.data && !feed.error
          ? <StateMessage loading title="Finding your next ride" description="Loading Velo Antwerpen stations…" />
          : feed.error
            ? <StateMessage title="Can’t load stations" description="Use the retry button above when you’re ready." />
            : <StateMessage title="No stations to show" description="CityBikes returned an empty list. Pull down or use Refresh stations to try again." />}
        ListFooterComponent={<SourceCredit />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background },
  content: { flexGrow: 1, width: '100%', maxWidth: Layout.contentMaxWidth, alignSelf: 'center', padding: Spacing.lg },
  header: { gap: Spacing.md, paddingBottom: Spacing.lg },
  brand: { ...Typography.heading, color: Colors.accent },
  heading: { ...Typography.heading, color: Colors.text },
  description: { ...Typography.body, color: Colors.textSecondary },
  separator: { height: Spacing.md },
});

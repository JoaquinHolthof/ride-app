const { mocks } = require('./register.cjs');
require('./favourites-ui-adapter.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const native = require('react-native-web');
let selectedId = 'a';
let feed;
let refreshed = 0;
let navigated;
mocks.set('@/hooks/use-stations', { useStations: () => feed });
mocks.set('react-native-safe-area-context', { SafeAreaView: native.View });
mocks.set('expo-router', { useLocalSearchParams: () => ({ id: selectedId }), router: {
  push: route => { navigated = route; }, canGoBack: () => false, replace: route => { navigated = route; }, back: () => { navigated = 'back'; },
} });
const Home = require('../src/app/(tabs)/(explore)/index.tsx').default;
const { StationList } = require('../src/components/ExploreScreen.tsx');
const { initialExploreState } = require('../src/utils/explore.ts');
const Detail = require('../src/screens/StationDetailScreen.tsx').default;
const { StationCard } = require('../src/components/StationCard.tsx');
const { DataStatus } = require('../src/components/DataStatus.tsx');
const { ActionButton } = require('../src/components/ActionButton.tsx');
const { StationCoordinates, StationTechnicalInfo } = require('../src/components/StationTechnicalInfo.tsx');
const station = { id: 'a', name: 'Real selected station', latitude: 51.21, longitude: 4.41,
  free_bikes: 0, empty_slots: 0, timestamp: '2026-11-24T12:00:00.000Z', address: 'Selected street', closed: false };
const reset = (changes = {}) => {
  feed = { data: null, isFetching: false, error: null, retryAt: 0, now: Date.parse('2026-11-24T12:10:00Z'),
    refresh: async () => { refreshed++; }, ...changes };
};
const data = (stations = [station]) => ({ stations, fetchedAt: Date.parse('2026-11-24T12:09:50Z'), skippedStations: 0 });
const render = component => renderToStaticMarkup(React.createElement(component));

test('list renders loading, retry error and empty states', () => {
  reset({ isFetching: true });
  assert.match(render(Home), /Loading Velo Antwerpen stations/);
  reset({ error: 'Connection failed' });
  assert.match(render(Home), /Connection failed/);
  assert.match(render(Home), /Try again/);
  reset({ data: data([]) });
  assert.match(render(Home), /No stations to show/);
});

test('station card renders real zero counts, unknown counts and closed status', () => {
  const card = item => renderToStaticMarkup(React.createElement(StationCard, { station: item, onPress() {} }));
  assert.match(card(station), /No bikes available/);
  assert.match(card(station), /No free docks/);
  assert.match(card(station), />0</);
  assert.match(card({ ...station, free_bikes: null }), /Unknown/);
  assert.match(card({ ...station, closed: true }), /Station closed/);
});

test('FlatList uses station IDs and wires selection and pull-to-refresh', async () => {
  reset({ data: data(), isFetching: true });
  const list = StationList({ stations: feed.data.stations, state: { ...initialExploreState, view: 'list' }, feed,
    onOpen: item => { navigated = { pathname: '/station/[id]', params: { id: item.id } }; },
    header: React.createElement(native.View), empty: React.createElement(native.View) });
  assert.equal(list.type, native.FlatList);
  assert.equal(list.props.keyExtractor(station), station.id);
  assert.equal(list.props.refreshing, true);
  const before = refreshed;
  list.props.onRefresh();
  assert.equal(refreshed, before + 1);
  list.props.renderItem({ item: station }).props.onPress();
  assert.deepEqual(navigated, { pathname: '/station/[id]', params: { id: 'a' } });
});

test('cached refresh failure keeps cards and labels cached data; retry is wired', () => {
  reset({ data: data(), error: 'Offline' });
  const html = render(Home);
  assert.match(html, /Cached results/);
  assert.match(html, /Real selected station/);
  const button = DataStatus(feed).props.children.find(child => child?.type === ActionButton);
  const before = refreshed;
  button.props.onPress();
  assert.equal(refreshed, before + 1);
  reset({ retryAt: feed.now + 15_000 });
  const disabledButton = DataStatus(feed).props.children.find(child => child?.type === ActionButton);
  assert.equal(disabledButton.props.disabled, true);
});

test('detail resolves selected ID and renders its real location, counts and source age', () => {
  reset({ data: data([station, { ...station, id: 'b', name: 'Other station', address: 'Other street' }]) });
  selectedId = 'a';
  const html = render(Detail);
  assert.match(html, /Real selected station/);
  assert.match(html, /Selected street/);
  assert.match(html, /Get Directions/);
  assert.ok(html.indexOf('Get Directions') < html.indexOf('Selected street'));
  assert.match(html, /Technical information/);
  assert.doesNotMatch(html, /51.21000|4.41000/); // Coordinates are now deliberately collapsed.
  assert.match(html, /10 min ago/);
  assert.match(html, /Source data is over 5 minutes old/);
  assert.doesNotMatch(html, /Other street/);
  selectedId = 'b';
  assert.match(render(Detail), /Other street/);
  selectedId = 'missing';
  assert.match(render(Detail), /Station not found/);
});

test('detail handles cold links, request failure and missing location/time', () => {
  selectedId = 'a';
  reset();
  assert.match(render(Detail), /Loading station/);
  reset({ error: 'Offline' });
  assert.match(render(Detail), /Can’t load this station/);
  reset({ data: data([{ ...station, latitude: null, timestamp: null, address: null }]) });
  assert.match(render(Detail), /Directions unavailable/);
  assert.match(render(Detail), /Street address unavailable/);
  assert.match(render(Detail), /Update time unavailable/);
  const scroll = Detail().props.children;
  const before = refreshed;
  scroll.props.refreshControl.props.onRefresh();
  assert.equal(refreshed, before + 1);
});

test('technical information starts collapsed and coordinate content uses selected real data', () => {
  const html = renderToStaticMarkup(React.createElement(StationTechnicalInfo, { station }));
  assert.match(html, /aria-expanded="false"/);
  assert.doesNotMatch(html, /Latitude|Longitude/);
  const coordinates = value => renderToStaticMarkup(React.createElement(StationCoordinates, { station: value }));
  assert.match(coordinates(station), /Latitude 51.21000/);
  assert.match(coordinates(station), /Longitude 4.41000/);
  assert.match(coordinates({ ...station, latitude: null }), /Coordinates unavailable/);
  assert.match(coordinates({ ...station, latitude: NaN }), /Coordinates unavailable/);
});

test('detail preserves Saved origin for a direct-link back fallback and excludes bottom safe area', () => {
  reset({ data: data() }); selectedId = 'a';
  const screen = Detail({ origin: 'saved' });
  assert.deepEqual(screen.props.edges, ['top', 'left', 'right']);
  const back = screen.props.children.props.children[0];
  assert.equal(back.props.accessibilityLabel, 'Back to Saved');
  back.props.onPress(); assert.equal(navigated, '/saved');
  Detail({ origin: 'explore' }).props.children.props.children[0].props.onPress();
  assert.equal(navigated, '/');
});

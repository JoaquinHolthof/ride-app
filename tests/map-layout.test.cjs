const { mocks } = require('./register.cjs');
require('./favourites-ui-adapter.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const native = require('react-native-web');
const styles = new Map();
mocks.set('react-native', { ...native,
  View: props => { if (props.testID) styles.set(props.testID, native.StyleSheet.flatten(props.style)); return React.createElement(native.View, props); },
  ScrollView: props => React.createElement('ride-scroll', {}, React.createElement(native.ScrollView, props)),
});
mocks.set('react-native-safe-area-context', { SafeAreaView: native.View });
mocks.set('./StationMap', { StationMap: () => React.createElement('ride-map') });
const { ExploreScreen } = require('../src/components/ExploreScreen.tsx');
const { MapDataPanel } = require('../src/components/MapDataPanel.tsx');
const { initialExploreState, ANTWERP_REGION } = require('../src/utils/explore.ts');
const station = { id: 'a', name: 'Selected station', latitude: 51.21, longitude: 4.41,
  free_bikes: 7, empty_slots: 4, timestamp: null, address: null, closed: false };
const feed = { data: { stations: [station], fetchedAt: 100, skippedStations: 0 }, isFetching: false,
  error: null, retryAt: 0, now: 100, refresh: async () => {} };
const props = { feed, state: initialExploreState, stations: [station], selected: null, dispatch() {},
  onOpen() {}, onSelect() {}, region: ANTWERP_REGION, onRegionChange() {}, height: 667 };
const render = p => renderToStaticMarkup(React.createElement(ExploreScreen, p));

test('map has a non-scrolling flex viewport and fixed header; advanced controls are absent', () => {
  const html = render(props);
  assert.match(html, /Find a bike/);
  assert.match(html, /Find a dock/);
  assert.match(html, /List and station search/);
  assert.doesNotMatch(html, /List \/ Search/);
  assert.doesNotMatch(html, /<ride-scroll|<input|Tap a pin|Lime: available/);
  assert.equal(styles.get('explore-map-viewport').flex, 1);
  assert.equal(styles.get('explore-map-viewport').position, undefined);
  assert.equal(styles.get('explore-header').flexShrink, 0);
});

test('selected preview is the only scroll overlay and never wraps the native map', () => {
  const html = render({ ...props, selected: station });
  let scrollDepth = 0;
  let sawMap = false;
  for (const token of html.matchAll(/<(\/?)(ride-scroll|ride-map)[^>]*>/g)) {
    if (token[2] === 'ride-scroll') scrollDepth += token[1] ? -1 : 1;
    if (token[2] === 'ride-map' && !token[1]) { sawMap = true; assert.equal(scrollDepth, 0); }
  }
  assert.equal(sawMap, true);
  assert.match(html, /Selected station/);
  assert.match(html, /Station details/);
});

test('List retains searchable/filterable content and does not mount a map', () => {
  const html = render({ ...props, state: { ...initialExploreState, view: 'list' } });
  assert.match(html, /Search stations by name/);
  assert.match(html, /All stations/);
  assert.match(html, /Refresh station data/);
  assert.doesNotMatch(html, /ride-map/);
});

test('map data badge exposes cached/error state and attribution access without full status panel', () => {
  const html = renderToStaticMarkup(React.createElement(MapDataPanel, {
    feed: { ...feed, error: 'Offline', now: 100_000 }, unmapped: 0,
  }));
  assert.match(html, /Connection issue/);
  assert.match(html, /CityBikes attribution/);
});

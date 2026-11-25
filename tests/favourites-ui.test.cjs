const { mocks } = require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const native = require('react-native-web');
let saved, listProps;
mocks.set('@/hooks/use-favourites', { useFavourites: () => saved });
mocks.set('react-native-safe-area-context', { SafeAreaView: native.View });
mocks.set('react-native', { ...native, FlatList: props => {
  listProps = props;
  return React.createElement(native.View, null, props.ListHeaderComponent,
    props.data.length ? props.data.map(item => React.createElement(React.Fragment, { key: props.keyExtractor(item) }, props.renderItem({ item }))) : props.ListEmptyComponent,
    props.ListFooterComponent);
} });
const { SavedScreen } = require('../src/components/SavedScreen.tsx');
const { SaveStationButton } = require('../src/components/SaveStationButton.tsx');
const { StationPreview } = require('../src/components/StationPreview.tsx');
const { ExploreHeader } = require('../src/components/ExploreScreen.tsx');
const { initialExploreState } = require('../src/utils/explore.ts');
const station = { id: 'a', name: 'Live station', free_bikes: 0, empty_slots: 6, latitude: 51.2, longitude: 4.4,
  timestamp: null, address: null, closed: false };
let refreshed, opened, toggled;
const reset = (patch = {}) => {
  refreshed = 0; opened = null; toggled = null;
  saved = { userId: 'A', ids: ['a'], isFetching: false, error: null, pendingId: null, mutationError: null,
    refresh: async () => { refreshed++; }, toggle: async id => { toggled = id; }, ...patch };
};
const feed = { data: { stations: [station], fetchedAt: 100, skippedStations: 0 }, isFetching: false, error: null,
  retryAt: 0, now: 100, refresh: async () => { refreshed++; } };
const render = (patch = {}) => renderToStaticMarkup(React.createElement(SavedScreen, {
  favourites: saved, feed, mode: 'docks', onExplore() {}, onOpen: value => { opened = value; }, ...patch,
}));

test('Saved uses stable IDs and real shared-cache counts, including zero, and refreshes both sources', async () => {
  reset(); const html = render();
  assert.match(html, /Live station/); assert.match(html, />0</); assert.match(html, />6</);
  assert.match(html, /Unsave station/); assert.equal(listProps.keyExtractor('a'), 'a');
  listProps.renderItem({ item: 'a' }).props.children[0].props.onPress();
  assert.equal(opened, station);
  listProps.onRefresh(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(refreshed, 2);
});

test('Saved distinguishes empty, loading, first-load error and stale account-scoped results', () => {
  reset({ ids: [] }); assert.match(render(), /No saved stations yet/);
  reset({ ids: null, isFetching: true }); assert.match(render(), /Loading your saved stations/);
  reset({ ids: null, error: 'Could not sync saved stations.' });
  assert.match(render(), /Can’t load saved stations/); assert.doesNotMatch(render(), /No saved stations yet/);
  reset({ error: 'Connection unavailable' });
  const html = render({ feed: { ...feed, now: 100_000, error: 'Offline station data' } });
  assert.match(html, /Live station/); assert.match(html, /last synced saved list/); assert.match(html, /Cached results/);
});

test('missing or offline station data never fabricates counts and retains Unsave', () => {
  reset({ ids: ['removed'] }); const html = render();
  assert.match(html, /Saved station unavailable/); assert.match(html, /Unsave station/);
  assert.doesNotMatch(html, /Bikes available|Docks free|Live station/);
  assert.match(render({ feed: { ...feed, data: null, error: 'Offline' } }), /information has not loaded/);
});

test('Save/Unsave, pending, retry and mutation failures use the shared action and confirmed state', () => {
  reset({ ids: [] });
  let control = SaveStationButton({ stationId: 'a' }).props.children[0];
  assert.equal(control.props.label, 'Save station'); control.props.onPress(); assert.equal(toggled, 'a');
  reset(); control = SaveStationButton({ stationId: 'a' }).props.children[0];
  assert.equal(control.props.label, 'Unsave station');
  reset({ pendingId: 'a' }); control = SaveStationButton({ stationId: 'a' }).props.children[0];
  assert.equal(control.props.disabled, true); assert.match(control.props.label, /Saving changes/);
  reset({ error: 'Offline' }); control = SaveStationButton({ stationId: 'a' }).props.children[0];
  assert.match(control.props.label, /Retry/); control.props.onPress(); assert.equal(refreshed, 1);
  reset({ mutationError: { stationId: 'a', message: 'Change failed; try again.' } });
  const html = renderToStaticMarkup(React.createElement(SaveStationButton, { stationId: 'a' }));
  assert.match(html, /Unsave station/); assert.match(html, /Change failed/);
});

test('preview offers Save and the compact Explore header opens Saved without removing modes', () => {
  reset({ ids: [] });
  assert.match(renderToStaticMarkup(React.createElement(StationPreview, { station, mode: 'bikes', onOpen() {}, onClose() {} })), /Save station/);
  let navigated = false;
  const header = ExploreHeader({ state: initialExploreState, dispatch() {}, onAccount() {}, onSaved: () => { navigated = true; } });
  header.props.children[0].props.children[1].props.onPress(); assert.equal(navigated, true);
  const html = renderToStaticMarkup(header);
  assert.match(html, /Find a bike/); assert.match(html, /Find a dock/); assert.match(html, /Saved/);
});

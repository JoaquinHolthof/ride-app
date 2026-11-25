const { mocks } = require('./register.cjs');
require('./favourites-ui-adapter.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const native = require('react-native-web');
native.Keyboard.dismiss = () => {}; // Native keyboard boundary; no browser DOM in Node tests.
const { exploreStations, initialExploreState, exploreReducer, selectedStation, availability,
  modeCount, modeStatus, directionsUrl, hasCoordinates, ANTWERP_REGION } = require('../src/utils/explore.ts');
const base = { latitude: 51.21, longitude: 4.41, timestamp: null, address: null, closed: false };
const stations = [
  { ...base, id: 'a', name: 'Éilandje', free_bikes: 12, empty_slots: 0 },
  { ...base, id: 'b', name: 'Centraal', free_bikes: 0, empty_slots: 20 },
  { ...base, id: 'c', name: 'Zuid', free_bikes: null, empty_slots: null },
  { ...base, id: 'd', name: 'Closed', free_bikes: 100, empty_slots: 100, closed: true },
];
const ids = list => list.map(s => s.id);

test('mode switch changes the ranked data and primary count, without mutating cache', () => {
  const copy = JSON.stringify(stations);
  let state = exploreReducer(initialExploreState, { type: 'mode', value: 'docks' });
  assert.deepEqual(ids(exploreStations(stations, 'bikes', '', 'all')), ['a', 'b', 'c', 'd']);
  assert.deepEqual(ids(exploreStations(stations, state.mode, '', 'all')), ['b', 'a', 'c', 'd']);
  assert.equal(modeCount(stations[0], 'bikes'), 12);
  assert.equal(modeCount(stations[0], 'docks'), 0);
  assert.equal(JSON.stringify(stations), copy);
});

test('availability filters distinguish available, zero, unknown and closed in each mode', () => {
  assert.deepEqual(ids(exploreStations(stations, 'bikes', '', 'available')), ['a']);
  assert.deepEqual(ids(exploreStations(stations, 'docks', '', 'available')), ['b']);
  assert.deepEqual(ids(exploreStations(stations, 'bikes', '', 'zero')), ['b']);
  assert.deepEqual(ids(exploreStations(stations, 'docks', '', 'zero')), ['a']);
  assert.deepEqual(ids(exploreStations(stations, 'bikes', '', 'unknown')), ['c']);
  assert.equal(availability(stations[3], 'bikes'), 'closed');
  assert.equal(modeStatus(stations[2], 'docks'), 'Dock count unknown');
});

test('search handles case, spaces, accents and combines with selected-mode filter', () => {
  assert.deepEqual(ids(exploreStations(stations, 'bikes', '  EILAND  ', 'available')), ['a']);
  assert.deepEqual(exploreStations(stations, 'docks', 'eiland', 'available'), []);
  assert.deepEqual(exploreStations(stations, 'bikes', 'no match', 'all'), []);
});

test('ties sort deterministically by station name then id', () => {
  const tied = [
    { ...stations[0], id: 'z', name: '10 - Station' },
    { ...stations[0], id: 'y', name: '2 - Station' },
    { ...stations[0], id: 'x', name: '2 - Station' },
  ];
  assert.deepEqual(ids(exploreStations(tied, 'bikes', '', 'all')), ['x', 'y', 'z']);
});

test('selection resolves current response; filtering/removal cannot leave stale preview data', () => {
  let state = exploreReducer(initialExploreState, { type: 'select', value: 'a' });
  assert.equal(selectedStation(stations, state.selectedId), stations[0]);
  const refreshed = stations.map(s => s.id === 'a' ? { ...s, free_bikes: 5 } : s);
  assert.equal(selectedStation(refreshed, state.selectedId).free_bikes, 5);
  assert.equal(selectedStation(exploreStations(stations, 'docks', '', 'available'), state.selectedId), null);
  assert.equal(selectedStation([], state.selectedId), null);
  state = exploreReducer(state, { type: 'view', value: 'list' });
  assert.equal(state.selectedId, 'a');
  state = exploreReducer(state, { type: 'clear' });
  assert.equal(state.selectedId, null);
  assert.equal(state.filter, 'all');
});

test('directions use exact coordinates and no assumed origin or permission', () => {
  const url = new URL(directionsUrl(stations[0]));
  assert.equal(url.searchParams.get('destination'), '51.21,4.41');
  assert.equal(url.searchParams.get('api'), '1');
  assert.equal(url.searchParams.has('origin'), false);
  for (const latitude of [null, 91, NaN, Infinity]) {
    assert.equal(hasCoordinates({ ...stations[0], latitude }), false);
    assert.equal(directionsUrl({ ...stations[0], latitude }), null);
  }
  assert.equal(hasCoordinates({ ...stations[0], latitude: 0, longitude: 0 }), true);
});

mocks.set('react-native-safe-area-context', { SafeAreaView: native.View });
let markers = [];
let mapProps;
const MockMap = React.forwardRef((props, _ref) => { mapProps = props; return React.createElement(native.View, {}, props.children); });
mocks.set('react-native-maps', { __esModule: true, default: MockMap,
  Marker: props => { markers.push(props); return null; }, Circle: () => null,
});
const { StationMap } = require('../src/components/StationMap.native.tsx');
const { SegmentedControl } = require('../src/components/SegmentedControl.tsx');
const { ExploreControls, ExploreScreen } = require('../src/components/ExploreScreen.tsx');
const { StationPreview } = require('../src/components/StationPreview.tsx');
const { ActionButton } = require('../src/components/ActionButton.tsx');
const { DirectionsButton } = require('../src/components/DirectionsButton.tsx');
const feed = { data: { stations, fetchedAt: 100, skippedStations: 0 }, isFetching: false, error: null, retryAt: 0, now: 100, refresh: async () => {} };
const render = (component, props) => renderToStaticMarkup(React.createElement(component, props));
function find(element, type) {
  if (!element) return undefined;
  if (element.type === type) return element;
  for (const child of React.Children.toArray(element.props?.children)) {
    const match = find(child, type);
    if (match) return match;
  }
}

test('segmented control exposes selection and dispatches the chosen mode', () => {
  let chosen;
  const element = SegmentedControl({ label: 'Mode', value: 'bikes', onChange: value => { chosen = value; },
    options: [{ value: 'bikes', label: 'FIND A BIKE' }, { value: 'docks', label: 'FIND A DOCK' }] });
  assert.equal(element.props.children[0].props.accessibilityState.selected, true);
  assert.equal(element.props.children[1].props.accessibilityState.selected, false);
  element.props.children[1].props.onPress();
  assert.equal(chosen, 'docks');
});

test('Explore search and filters dispatch actual values', () => {
  let action;
  const controls = ExploreControls({ feed, state: initialExploreState, stations, dispatch: value => { action = value; } });
  find(controls, native.TextInput).props.onChangeText('Centraal');
  assert.deepEqual(action, { type: 'query', value: 'Centraal' });
  const filters = find(controls, native.ScrollView).props.children;
  filters[1].props.onPress();
  assert.deepEqual(action, { type: 'filter', value: 'available' });
});

test('native pins use real coordinates, mode labels and availability without custom marker children', () => {
  let selected;
  const positions = [[51.21, 4.41], [51.24, 4.44], [51.18, 4.38], [51.245, 4.385]];
  const separated = stations.map((station, index) => ({ ...station, latitude: positions[index][0], longitude: positions[index][1] }));
  const props = { stations: [...separated, { ...stations[0], id: 'missing', latitude: null }], mode: 'bikes',
    selectedId: null, onSelect: id => { selected = id; }, initialRegion: ANTWERP_REGION, onRegionChange() {}, focusKey: '' };
  markers = [];
  render(StationMap, props);
  assert.equal(markers.length, 4);
  assert.deepEqual(markers[0].coordinate, { latitude: 51.21, longitude: 4.41 });
  assert.match(markers[0].title, /12 bikes available/);
  assert.notEqual(markers[0].pinColor, markers[1].pinColor);
  assert.notEqual(markers[1].pinColor, markers[2].pinColor);
  assert.equal(markers[0].children, undefined);
  assert.equal(markers[0].tracksViewChanges, false);
  assert.equal(mapProps.region, undefined); // Uncontrolled map gestures.
  assert.equal(mapProps.showsUserLocation, false);
  markers[0].onPress();
  assert.equal(selected, 'a');
  markers = [];
  render(StationMap, { ...props, mode: 'docks' });
  assert.match(markers[0].title, /No free docks/);
  assert.match(markers[1].title, /20 docks free/);
});

test('clusters show only a compact count, retain mode status, and keep selected pins separate', () => {
  const { Colors } = require('../src/constants/theme.ts');
  const props = { stations: [stations[0], { ...stations[0], id: 'second' }], mode: 'bikes',
    selectedId: null, onSelect() {}, initialRegion: ANTWERP_REGION, onRegionChange() {}, focusKey: '' };
  function cluster(input) {
    markers = [];
    render(StationMap, input);
    assert.equal(markers.length, 1);
    return markers[0];
  }
  const bike = cluster(props);
  assert.match(bike.accessibilityLabel, /2 stations/);
  assert.match(bike.title, /24 known bikes/);
  const badge = renderToStaticMarkup(bike.children);
  assert.match(badge, />2</);
  assert.doesNotMatch(badge, /stations/);
  const badgeStyle = native.StyleSheet.flatten(bike.children.props.style);
  assert.equal(badgeStyle.minHeight, 44);
  assert.equal(badgeStyle.minWidth, 44);
  assert.equal(badgeStyle.backgroundColor, Colors.surface);
  assert.equal(badgeStyle.borderColor, Colors.accent);
  const dock = cluster({ ...props, mode: 'docks' });
  assert.match(dock.title, /0 known docks/);
  assert.equal(native.StyleSheet.flatten(dock.children.props.style).borderColor, Colors.textSecondary);
  const unknown = cluster({ ...props, stations: props.stations.map(s => ({ ...s, free_bikes: null })) });
  assert.match(unknown.title, /2 unknown/);
  assert.equal(native.StyleSheet.flatten(unknown.children.props.style).borderColor, Colors.text);
  const closed = cluster({ ...props, stations: props.stations.map(s => ({ ...s, closed: true })) });
  assert.match(closed.title, /0 known bikes/);
  markers = [];
  render(StationMap, { ...props, selectedId: 'a' });
  const selected = markers.find(pin => pin.identifier === 'a');
  assert.equal(selected.accessibilityState.selected, true);
  assert.match(selected.accessibilityLabel, /Selected/);
  assert.equal(selected.zIndex, 10);
  assert.deepEqual(selected.coordinate, { latitude: 51.21, longitude: 4.41 });
});

test('preview shows both real counts and wires details, close and directions', () => {
  let opened = false;
  let closed = false;
  const props = { station: stations[0], mode: 'bikes', onOpen: () => { opened = true; }, onClose: () => { closed = true; } };
  const html = render(StationPreview, props);
  assert.match(html, /12 bikes available/);
  assert.match(html, /0 docks free/);
  const element = StationPreview(props);
  find(element, ActionButton).props.onPress();
  find(element, native.Pressable).props.onPress();
  assert.equal(opened, true);
  assert.equal(closed, true);
  assert.equal(find(element, DirectionsButton).props.station, stations[0]);
});

test('Explore no-match state allows clearing; web map offers honest list fallback', () => {
  const props = { feed, state: { ...initialExploreState, view: 'list', query: 'missing' }, stations: [], selected: null,
    dispatch() {}, onOpen() {}, onSelect() {}, region: ANTWERP_REGION, onRegionChange() {}, height: 844 };
  assert.match(render(ExploreScreen, props), /No matching stations/);
  assert.match(render(ExploreScreen, props), /Clear search/);
  assert.match(render(ExploreScreen, { ...props, stations, state: initialExploreState }), /interactive map is available in iOS and Android/);
});

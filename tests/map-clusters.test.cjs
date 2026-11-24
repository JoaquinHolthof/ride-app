require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { clusterStations, clusterAction } = require('../src/utils/map-clusters.ts');
const { ANTWERP_REGION } = require('../src/utils/explore.ts');
const base = { id: 'a', name: 'Station', latitude: 51.21, longitude: 4.41,
  free_bikes: 7, empty_slots: 0, closed: false, timestamp: null, address: null };
const represented = items => items.flatMap(item => item.kind === 'station' ? [item.station] : item.stations);

test('323 stations become a bounded set of clusters without losing identities', () => {
  const stations = Array.from({ length: 323 }, (_, i) => ({ ...base, id: String(i),
    latitude: 51.205 + Math.floor(i / 25) * 0.0008, longitude: 4.40 + (i % 25) * 0.0008 }));
  const original = JSON.stringify(stations);
  const items = clusterStations(stations, ANTWERP_REGION, 390, 'bikes');
  assert.ok(items.length < 60, `Expected <60 markers, received ${items.length}`);
  assert.equal(represented(items).length, 323);
  assert.equal(new Set(represented(items).map(s => s.id)).size, 323);
  assert.equal(JSON.stringify(stations), original);
});

test('selected station stays at its real coordinates outside a dense cluster', () => {
  const items = clusterStations([base, { ...base, id: 'b' }, { ...base, id: 'c' }], ANTWERP_REGION, 390, 'bikes', 'a');
  const selected = items.find(item => item.kind === 'station');
  assert.equal(selected.station, base);
  assert.equal(items.find(item => item.kind === 'cluster').stations.length, 2);
  assert.equal(represented(items).length, 3);
});

test('mode totals exclude closed and unknown counts and preserve real zero', () => {
  const stations = [base, { ...base, id: 'b', free_bikes: null, empty_slots: 12 },
    { ...base, id: 'c', closed: true, free_bikes: 100, empty_slots: 100 }];
  const bike = clusterStations(stations, ANTWERP_REGION, 390, 'bikes')[0];
  const dock = clusterStations(stations, ANTWERP_REGION, 390, 'docks')[0];
  assert.equal(bike.total, 7);
  assert.equal(bike.unknown, 1);
  assert.equal(dock.total, 12);
  assert.equal(dock.unknown, 0);
  assert.equal(dock.available, 1);
});

test('viewport culling excludes offscreen/invalid stations without inventing coordinates', () => {
  const items = clusterStations([base, { ...base, id: 'far', latitude: 50 }, { ...base, id: 'invalid', longitude: null }], ANTWERP_REGION, 390, 'bikes');
  assert.deepEqual(represented(items), [base]);
});

test('zooming in separates nearby stations while preserving exact coordinates', () => {
  const stations = [base, { ...base, id: 'b', longitude: 4.411 }];
  assert.equal(clusterStations(stations, ANTWERP_REGION, 390, 'bikes').length, 1);
  const closeRegion = { latitude: 51.21, longitude: 4.4105, latitudeDelta: 0.003, longitudeDelta: 0.003 };
  const items = clusterStations(stations, closeRegion, 390, 'bikes');
  assert.equal(items.length, 2);
  assert.ok(items.every(item => item.kind === 'station'));
  assert.deepEqual(represented(items), stations);
});

test('cluster taps zoom to members; identical coordinates offer a member chooser', () => {
  const coincident = clusterStations([base, { ...base, id: 'b' }], ANTWERP_REGION, 390, 'bikes')[0];
  assert.equal(clusterAction(coincident, ANTWERP_REGION, 390).kind, 'members');
  const cluster = clusterStations([base, { ...base, id: 'b', longitude: 4.411 }], ANTWERP_REGION, 390, 'bikes')[0];
  const action = clusterAction(cluster, ANTWERP_REGION, 390);
  assert.equal(action.kind, 'zoom');
  assert.ok(action.region.longitudeDelta < ANTWERP_REGION.longitudeDelta);
  assert.equal(action.region.longitude, 4.4105);
});

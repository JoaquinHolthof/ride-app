require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseStations, fetchStations, StationRequestError, NETWORK_URL } = require('../src/api/citybikes.ts');
const { createStationsStore } = require('../src/state/stations.ts');
const { stationStatus, ageLabel } = require('../src/utils/station-display.ts');

const raw = { id: 'a', name: '001 - Test station', latitude: 51.2, longitude: 4.4, free_bikes: 0, empty_slots: 0,
  timestamp: '2026-11-24T12:17:33.810719+00:00Z', extra: { address: 'Teststraat', status: 'OPN' } };
const payload = stations => ({ network: { id: 'velo-antwerpen', stations } });
const sample = (time = 100_000) => ({ ...parseStations(payload([raw])), fetchedAt: time });

test('parser preserves zero counts, coordinates and source timestamp', () => {
  const station = parseStations(payload([raw])).stations[0];
  assert.equal(station.free_bikes, 0);
  assert.equal(station.empty_slots, 0);
  assert.equal(station.latitude, 51.2);
  assert.equal(station.address, 'Teststraat');
  assert.equal(station.timestamp, '2026-11-24T12:17:33.810Z');
  assert.match(stationStatus(station), /No bikes available · No free docks/);
});

test('invalid or missing values are unknown, never invented zeroes', () => {
  for (const invalid of [undefined, null, -1, 1.5, '4', NaN, Infinity]) {
    const station = parseStations(payload([{ ...raw, free_bikes: invalid, empty_slots: invalid,
      latitude: 91, longitude: -181, timestamp: 'not a date' }])).stations[0];
    assert.equal(station.free_bikes, null);
    assert.equal(station.empty_slots, null);
    assert.equal(station.latitude, null);
    assert.equal(station.longitude, null);
    assert.equal(station.timestamp, null);
    assert.match(stationStatus(station), /count unknown/);
  }
});

test('partial responses skip invalid identities and duplicates; malformed responses fail', () => {
  const result = parseStations(payload([raw, raw, null, { ...raw, id: '' }, { ...raw, id: 'b', name: '002 - Other' }]));
  assert.equal(result.stations.length, 2);
  assert.equal(result.skippedStations, 3);
  for (const invalid of [null, {}, { network: {} }, payload(null), payload([null]), { network: { id: 'wrong', stations: [] } }]) {
    assert.throws(() => parseStations(invalid));
  }
  assert.deepEqual(parseStations(payload([])), { stations: [], skippedStations: 0 });
});

test('missing timestamps and closed stations get explicit display states', () => {
  const station = parseStations(payload([{ ...raw, timestamp: undefined, extra: { status: 'CLS' } }])).stations[0];
  assert.equal(station.timestamp, null);
  assert.equal(stationStatus(station), 'Station closed');
  assert.equal(ageLabel(0, 120_000), '2 min ago');
  assert.equal(ageLabel(200_000, 0), 'time ahead of device clock');
});

test('HTTPS fetch parses data and records fetch time separately', async () => {
  const data = await fetchStations(async (url, options) => {
    assert.equal(url, NETWORK_URL);
    assert.ok(options.signal instanceof AbortSignal);
    return Response.json(payload([raw]));
  }, () => 123);
  assert.equal(data.fetchedAt, 123);
  assert.equal(data.stations.length, 1);
});

test('HTTP, JSON, offline and timeout errors are actionable; rate limit respects Retry-After', async () => {
  await assert.rejects(fetchStations(async () => new Response('', { status: 503 })), /HTTP 503/);
  await assert.rejects(fetchStations(async () => new Response('invalid')), /unreadable data/);
  await assert.rejects(fetchStations(async () => { throw new TypeError('offline'); }), /Check your connection/);
  await assert.rejects(fetchStations(async () => new Response('', { status: 429, headers: { 'retry-after': '120' } })),
    error => error instanceof StationRequestError && error.retryAfterMs === 120_000);
  await assert.rejects(fetchStations((_url, { signal }) => new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new Error('aborted')));
  }), Date.now, 5), /timed out/);
});

test('store deduplicates requests, reuses cache and refreshes after expiry', async () => {
  let time = 100_000;
  let calls = 0;
  const store = createStationsStore(async () => { calls++; return sample(time); }, () => time);
  const first = store.load();
  assert.equal(store.getSnapshot().isFetching, true);
  assert.equal(first, store.load(true));
  await first;
  assert.equal(store.getSnapshot().isFetching, false);
  time += 20_000;
  await store.load();
  assert.equal(calls, 1);
  time += 41_000;
  await store.load();
  assert.equal(calls, 2);
});

test('refresh failure retains cached stations, throttles retries, and recovers', async () => {
  let time = 100_000;
  let fail = false;
  let calls = 0;
  const store = createStationsStore(async () => {
    calls++;
    if (fail) throw new Error('Offline');
    return sample(time);
  }, () => time);
  await store.load();
  const cached = store.getSnapshot().data;
  fail = true;
  time += 16_000;
  const refreshing = store.load(true);
  assert.equal(store.getSnapshot().data, cached);
  assert.equal(store.getSnapshot().isFetching, true);
  await refreshing;
  assert.equal(store.getSnapshot().data, cached);
  assert.equal(store.getSnapshot().error, 'Offline');
  await store.load(true);
  assert.equal(calls, 2);
  fail = false;
  time += 16_000;
  await store.load(true);
  assert.equal(calls, 3);
  assert.equal(store.getSnapshot().error, null);
  assert.notEqual(store.getSnapshot().data, cached);
});

test('first-load failure, successful empty result and subscriptions remain distinct', async () => {
  let time = 100_000;
  let fail = true;
  let notifications = 0;
  const store = createStationsStore(async () => {
    if (fail) throw new Error('Offline');
    return { stations: [], skippedStations: 0, fetchedAt: time };
  }, () => time);
  const unsubscribe = store.subscribe(() => notifications++);
  await store.load();
  assert.equal(store.getSnapshot().data, null);
  assert.equal(store.getSnapshot().error, 'Offline');
  fail = false;
  time += 16_000;
  await store.load(true);
  assert.deepEqual(store.getSnapshot().data.stations, []);
  assert.equal(store.getSnapshot().error, null);
  assert.equal(notifications, 4);
  unsubscribe();
});

test('server rate limit blocks requests for its full retry interval', async () => {
  let time = 100_000;
  let calls = 0;
  const store = createStationsStore(async () => { calls++; throw new StationRequestError('Wait', 120_000); }, () => time);
  await store.load();
  time += 119_000;
  await store.load(true);
  assert.equal(calls, 1);
  time += 1001;
  await store.load(true);
  assert.equal(calls, 2);
});

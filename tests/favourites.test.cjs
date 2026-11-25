const { mocks } = require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createFavouritesStore } = require('../src/favourites/store.ts');
const { createFavouritesApi, parseFavouriteRows, favouritesError } = require('../src/favourites/api.ts');
const tick = () => new Promise(resolve => setImmediate(resolve));
const deferred = () => { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b; }); return { promise, resolve, reject }; };

test('favourite parser fails closed for foreign owners and malformed rows, retaining stable IDs', () => {
  assert.deepEqual(parseFavouriteRows([{ user_id: 'A', station_id: 'zero' }, { user_id: 'A', station_id: 'zero' }], 'A'), ['zero']);
  for (const rows of [null, {}, [null], [{ user_id: 'B', station_id: 'private' }], [{ user_id: 'A', station_id: '' }],
    [{ user_id: 'A', station_id: ' x ' }], [{ user_id: 'A', station_id: 'x'.repeat(257) }]]) {
    assert.throws(() => parseFavouriteRows(rows, 'A'), /Saved stations/);
  }
  assert.doesNotMatch(favouritesError({ message: 'private response' }), /private response/);
  assert.match(favouritesError({ code: 'PGRST205' }), /migration/);
  assert.match(favouritesError({ code: '42501' }), /access/);
});

test('shared store waits for acknowledgement, updates Save/Unsave and ignores rapid duplicate taps', async () => {
  const write = deferred(); let saves = 0, removes = 0;
  const store = createFavouritesStore('A', { list: async () => [], save: async () => { saves++; await write.promise; }, remove: async () => { removes++; } });
  await store.activate();
  const pending = store.toggle('station');
  assert.deepEqual(store.getSnapshot().ids, []);
  assert.equal(store.getSnapshot().pendingId, 'station');
  await store.toggle('station');
  write.resolve(); await pending;
  assert.equal(saves, 1); assert.deepEqual(store.getSnapshot().ids, ['station']);
  await store.toggle('station');
  assert.equal(removes, 1); assert.deepEqual(store.getSnapshot().ids, []);
});

test('first-load and offline refresh failures are distinct from empty; failed writes retain confirmed IDs', async () => {
  let offline = true;
  const api = { list: async () => { if (offline) throw new Error('private'); return ['saved']; },
    save: async () => { throw new Error('private'); }, remove: async () => { throw new Error('private'); } };
  const store = createFavouritesStore('A', api);
  await store.activate(); assert.equal(store.getSnapshot().ids, null); assert.match(store.getSnapshot().error, /connection/);
  offline = false; await store.refresh(); assert.deepEqual(store.getSnapshot().ids, ['saved']);
  await store.toggle('saved'); assert.deepEqual(store.getSnapshot().ids, ['saved']);
  assert.equal(store.getSnapshot().mutationError.stationId, 'saved');
  await store.toggle('new'); assert.deepEqual(store.getSnapshot().ids, ['saved']);
  offline = true; await store.refresh(); assert.deepEqual(store.getSnapshot().ids, ['saved']);
  assert.match(store.getSnapshot().error, /not queued offline/);
  await store.toggle('saved'); assert.equal(store.getSnapshot().pendingId, null);
});

test('sign-out aborts and clears; late account A responses cannot populate B or a restarted store', async () => {
  const response = deferred(); let oldSignal;
  const a = createFavouritesStore('A', { list: (_, signal) => { oldSignal = signal; return response.promise; } });
  const pending = a.activate(); await tick(); a.dispose();
  assert.equal(oldSignal.aborted, true); assert.equal(a.getSnapshot().ids, null);
  const b = createFavouritesStore('B', { list: async () => ['B-only'] });
  await b.activate(); response.resolve(['A-private']); await pending;
  assert.equal(a.getSnapshot().ids, null); assert.deepEqual(b.getSnapshot().ids, ['B-only']);
});

test('late writes after sign-out do not resurrect IDs; Strict Mode activation can load again', async () => {
  const write = deferred();
  const store = createFavouritesStore('A', { list: async () => [], save: () => write.promise });
  await store.activate(); const pending = store.toggle('private'); await tick();
  store.dispose(); await store.activate(); write.resolve(); await pending;
  assert.deepEqual(store.getSnapshot().ids, []); assert.equal(store.getSnapshot().pendingId, null);
});

test('signed-out store never queries and concurrent refreshes are deduplicated', async () => {
  let calls = 0; const response = deferred();
  const api = { list: () => { calls++; return response.promise; } };
  const signedOut = createFavouritesStore(null, api); await signedOut.activate(); assert.equal(calls, 0);
  const store = createFavouritesStore('A', api);
  const first = store.activate(), second = store.refresh(); assert.equal(first, second);
  response.resolve([]); await first; assert.equal(calls, 1);
});

function clientHarness(responses, userId = 'A') {
  const requests = [];
  const client = { auth: { getSession: async () => ({ data: { session: userId ? { user: { id: userId } } : null }, error: null }) },
    from(table) {
      const calls = [['from', table]];
      const query = {};
      for (const method of ['select', 'eq', 'order', 'limit', 'gt', 'insert', 'delete']) query[method] = (...args) => { calls.push([method, ...args]); return query; };
      query.abortSignal = async signal => { requests.push(calls); if (signal.aborted) throw new Error(); return responses.shift(); };
      return query;
    } };
  return { client, requests, api: createFavouritesApi(client) };
}
const signal = () => new AbortController().signal;
test('API paginates even under reduced server row caps and filters every page by owner', async () => {
  const h = clientHarness([{ data: [{ user_id: 'A', station_id: 'a' }] }, { data: [{ user_id: 'A', station_id: 'b' }] }, { data: [] }]);
  assert.deepEqual(await h.api.list('A', signal()), ['a', 'b']);
  assert.equal(h.requests.length, 3);
  h.requests.forEach(request => assert.ok(request.some(call => JSON.stringify(call) === '["eq","user_id","A"]')));
  assert.ok(h.requests[1].some(call => JSON.stringify(call) === '["gt","station_id","a"]'));
});

test('API uses INSERT and scoped DELETE; duplicate INSERT is verified without UPDATE/upsert', async () => {
  const row = { user_id: 'A', station_id: 's' };
  const h = clientHarness([{ data: [row] }, { error: { code: '23505' } }, { data: [row] }, { data: [] }]);
  await h.api.save('A', 's', signal()); await h.api.save('A', 's', signal()); await h.api.remove('A', 's', signal());
  assert.deepEqual(h.requests[0].find(call => call[0] === 'insert')[1], row);
  const deletion = h.requests.at(-1);
  assert.ok(deletion.some(call => call[0] === 'delete'));
  assert.ok(deletion.some(call => JSON.stringify(call) === '["eq","user_id","A"]'));
  assert.ok(deletion.some(call => JSON.stringify(call) === '["eq","station_id","s"]'));
});

test('API refuses expired/different sessions and never accepts foreign write acknowledgements', async () => {
  for (const actor of [null, 'B']) {
    const h = clientHarness([], actor);
    await assert.rejects(h.api.save('A', 's', signal()), /Sign in again/);
    assert.equal(h.requests.length, 0);
  }
  const h = clientHarness([{ data: [{ user_id: 'B', station_id: 's' }] }]);
  await assert.rejects(h.api.save('A', 's', signal()), /verified/);
  const noAck = clientHarness([{ data: [] }]);
  await assert.rejects(noAck.api.save('A', 's', signal()));
});

test('API cancellation settles even while session restoration is pending and starts no later query', async () => {
  const session = deferred();
  const h = clientHarness([]);
  h.client.auth.getSession = () => session.promise;
  const controller = new AbortController();
  const pending = h.api.list('A', controller.signal);
  controller.abort(); await assert.rejects(pending);
  session.resolve({ data: { session: { user: { id: 'A' } } } }); await tick();
  assert.equal(h.requests.length, 0);
});

test('account boundary keys private state by UUID during render, not a delayed effect', () => {
  const React = require('react'); let userId = 'A';
  mocks.set('@/auth/client', { supabase: null });
  mocks.set('@/auth/AuthProvider', { useAuth: () => ({ state: { status: 'ready', session: userId ? { user: { id: userId } } : null } }) });
  const { FavouritesProvider } = require('../src/favourites/FavouritesProvider.tsx');
  const a = FavouritesProvider({ children: React.createElement('child') });
  userId = 'B'; const b = FavouritesProvider({ children: React.createElement('child') });
  assert.notEqual(a.key, b.key); assert.equal(b.props.userId, 'B');
  userId = null; assert.equal(FavouritesProvider({}).props.userId, null);
});

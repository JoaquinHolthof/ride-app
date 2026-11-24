require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { authConfig } = require('../src/auth/config.ts');
const { createSecureSessionStorage } = require('../src/auth/secure-storage.ts');
const { observeAuth, authAccess, initialAuthState } = require('../src/auth/lifecycle.ts');
const { submitCredentials, signOutLocally, authError } = require('../src/auth/actions.ts');
const tick = () => new Promise(resolve => setImmediate(resolve));
const session = { user: { id: 'fixture-user' }, access_token: 'fixture-token', refresh_token: 'fixture-refresh' };
function deferred() { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; }
function authHarness() {
  const restore = deferred();
  let callback, visibilityCallback, unsubscribed = false, removed = false;
  const refresh = [], states = [];
  const auth = {
    getSession: () => restore.promise,
    onAuthStateChange: cb => { callback = cb; return { data: { subscription: { unsubscribe() { unsubscribed = true; } } } }; },
    startAutoRefresh: async () => { refresh.push('start'); },
    stopAutoRefresh: async () => { refresh.push('stop'); },
  };
  const visibility = { currentState: 'active', addEventListener: (_, cb) => { visibilityCallback = cb; return { remove() { removed = true; } }; } };
  const stop = observeAuth(auth, state => states.push(state), visibility);
  return { restore, states, refresh, stop, emit: (...args) => callback(...args), change: state => visibilityCallback(state),
    cleaned: () => unsubscribed && removed };
}
test('config fails closed without reflecting missing, secret or malformed values', () => {
  assert.ok(authConfig(undefined, undefined).error);
  for (const [url, key] of [['http://project.test', 'sb_publishable_fixture'], ['https://project.test', 'sb_secret_private'],
    ['https://user:private@project.test', 'sb_publishable_fixture'], ['https://project.test', 'service-role-fixture']]) {
    const result = authConfig(url, key);
    assert.ok(result.error);
    assert.doesNotMatch(JSON.stringify(result), /private|service-role-fixture/);
  }
  assert.equal(authConfig('https://project.test', 'sb_publishable_fixture').error, undefined);
});
test('auth guards expose neither route group while loading or in error', () => {
  assert.deepEqual(authAccess(initialAuthState), { public: false, protected: false });
  assert.deepEqual(authAccess({ status: 'error', session: null, error: 'failure' }), { public: false, protected: false });
  assert.deepEqual(authAccess({ status: 'ready', session: null }), { public: true, protected: false });
  assert.deepEqual(authAccess({ status: 'ready', session }), { public: false, protected: true });
});
test('restores a persisted session, handles token refresh and sign out, and cleans listeners', async () => {
  const h = authHarness();
  assert.deepEqual(h.states, []);
  h.emit('INITIAL_SESSION', null);
  h.restore.resolve({ data: { session }, error: null });
  await tick();
  assert.equal(h.states.at(-1).session, session);
  const renewed = { ...session, access_token: 'fixture-renewed' };
  h.emit('TOKEN_REFRESHED', renewed);
  assert.equal(h.states.at(-1).session, renewed);
  h.emit('SIGNED_OUT', null);
  assert.equal(authAccess(h.states.at(-1)).protected, false);
  h.change('background'); await tick();
  h.change('active'); await tick();
  assert.deepEqual(h.refresh, ['start', 'stop', 'start']);
  h.stop(); await tick();
  assert.equal(h.cleaned(), true);
  assert.equal(h.refresh.at(-1), 'stop');
  const length = h.states.length;
  h.emit('SIGNED_IN', session);
  assert.equal(h.states.length, length);
});
test('late restoration cannot resurrect a signed-out session', async () => {
  const h = authHarness();
  h.emit('SIGNED_OUT', null);
  h.restore.resolve({ data: { session }, error: null });
  await tick();
  assert.equal(h.states.length, 1);
  assert.equal(h.states[0].session, null);
  h.stop();
});
test('restore failures stay protected and never reflect the original error', async () => {
  const h = authHarness();
  h.restore.reject(new Error('fixture-sensitive-input'));
  await tick();
  assert.equal(h.states[0].status, 'error');
  assert.doesNotMatch(h.states[0].error, /fixture-sensitive/);
  assert.equal(authAccess(h.states[0]).protected, false);
  h.stop();
});
test('cleanup suppresses a pending restore result', async () => {
  const h = authHarness(); h.stop();
  h.restore.resolve({ data: { session: null }, error: null });
  await tick();
  assert.equal(h.states.length, 0);
});
function storageHarness() {
  const values = new Map();
  let failWrites = false;
  return { values, fail: value => { failWrites = value; }, store: {
    getItem: async key => values.get(key) ?? null,
    setItem: async (key, value) => { if (failWrites && key.endsWith('.1')) throw new Error('fixture-private'); values.set(key, Buffer.from(value, 'utf8').toString('utf8')); },
    removeItem: async key => { values.delete(key); },
  } };
}
test('secure storage persists large Unicode sessions across adapters with small encrypted items', async () => {
  const h = storageHarness();
  const storage = createSecureSessionStorage(h.store);
  const value = JSON.stringify({ token: 'fixture'.repeat(800), name: '🚲漢'.repeat(900) });
  await storage.setItem('auth-key', value);
  assert.ok(h.values.size > 2);
  for (const chunk of h.values.values()) assert.ok(Buffer.byteLength(chunk, 'utf8') < 2048);
  assert.equal(await createSecureSessionStorage(h.store).getItem('auth-key'), value);
  await storage.removeItem('auth-key');
  assert.equal(h.values.size, 0);
  assert.equal(await storage.getItem('auth-key'), null);
});
test('failed secure writes retain prior complete session and do not expose native errors', async () => {
  const h = storageHarness(), storage = createSecureSessionStorage(h.store);
  await storage.setItem('auth-key', 'previous');
  h.fail(true);
  await assert.rejects(storage.setItem('auth-key', 'new'.repeat(1000)), /^Error: Secure session storage is unavailable\.$/);
  assert.equal(await storage.getItem('auth-key'), 'previous');
  assert.equal(h.values.size, 2);
});
test('concurrent storage updates serialize and partial/corrupt sessions fail closed', async () => {
  const h = storageHarness(), storage = createSecureSessionStorage(h.store);
  await Promise.all([storage.setItem('auth-key', 'first'), storage.setItem('auth-key', 'last')]);
  assert.equal(await storage.getItem('auth-key'), 'last');
  const manifest = JSON.parse(h.values.get('auth-key.manifest'));
  h.values.delete(`auth-key.${manifest.revision}.0`);
  await assert.rejects(storage.getItem('auth-key'), /Secure session storage/);
  h.values.set('auth-key.manifest', '{broken');
  await assert.rejects(storage.getItem('auth-key'), /Secure session storage/);
});
test('credential validation avoids requests, preserves passwords and distinguishes confirmation', async () => {
  let calls = 0, input;
  const auth = {
    signUp: async data => { calls++; input = data; return { data: { session: null }, error: null }; },
    signInWithPassword: async data => { calls++; input = data; return { data: { session }, error: null }; },
  };
  assert.ok((await submitCredentials(auth, 'signup', 'bad', '123')).error);
  assert.equal(calls, 0);
  assert.deepEqual(await submitCredentials(auth, 'signup', ' person@example.test ', ' password '), { error: null, confirmation: true });
  assert.deepEqual(input, { email: 'person@example.test', password: ' password ' });
  assert.deepEqual(await submitCredentials(auth, 'login', 'person@example.test', ' password '), { error: null, confirmation: false });
  auth.signUp = auth.signInWithPassword;
  assert.equal((await submitCredentials(auth, 'signup', 'person@example.test', ' password ')).confirmation, false);
});
test('auth failures are sanitized, including unconfirmed email and rate limiting', async () => {
  assert.match(authError({ code: 'email_not_confirmed' }), /Confirm your email/);
  assert.match(authError({ code: 'invalid_credentials' }), /incorrect/);
  assert.match(authError({ code: 'over_request_rate_limit' }), /Wait/);
  const result = await submitCredentials({ signInWithPassword: async () => { throw new Error('fixture-sensitive'); } },
    'login', 'person@example.test', 'password');
  assert.ok(result.error); assert.doesNotMatch(result.error, /fixture-sensitive/);
});
test('sign out is scoped to this device and reports persistence/network failures', async () => {
  let scope;
  assert.equal(await signOutLocally({ signOut: async input => { scope = input.scope; return { error: null }; } }), null);
  assert.equal(scope, 'local');
  assert.match(await signOutLocally({ signOut: async () => ({ error: {} }) }), /Could not sign out/);
  assert.match(await signOutLocally({ signOut: async () => { throw new Error('fixture-private'); } }), /Could not sign out securely/);
});

test('installed Supabase SDK signs in, refreshes, restores and signs out through secure adapter', async () => {
  const { createClient } = require('@supabase/supabase-js');
  const h = storageHarness();
  const exp = Math.floor(Date.now() / 1000) + 3600;
  const token = label => [Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
    Buffer.from(JSON.stringify({ sub: 'fixture-user', exp, role: 'authenticated', label })).toString('base64url'), 'fixture-signature'].join('.');
  let requests = 0;
  const fetch = async url => {
    requests++;
    if (String(url).includes('/logout')) return new Response('{}', { status: 200 });
    return new Response(JSON.stringify({ access_token: token(String(requests)), refresh_token: `fixture-refresh-${requests}`,
      token_type: 'bearer', expires_in: 3600, user: { id: 'fixture-user', email: 'person@example.test', aud: 'authenticated', app_metadata: {}, user_metadata: {} } }),
      { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  const make = () => createClient('https://fixture.supabase.co', 'sb_publishable_fixture', {
    auth: { storage: createSecureSessionStorage(h.store), persistSession: true, autoRefreshToken: false, detectSessionInUrl: false, debug: false },
    global: { fetch },
  });
  const first = make();
  let second;
  try {
    const login = await first.auth.signInWithPassword({ email: 'person@example.test', password: 'fixture-password' });
    assert.equal(login.error, null);
    assert.equal(login.data.user.id, 'fixture-user');
    const refreshed = await first.auth.refreshSession();
    assert.equal(refreshed.error, null);
    assert.notEqual(refreshed.data.session.access_token, login.data.session.access_token);
    await first.auth.dispose();
    const before = requests;
    second = make();
    const restored = await second.auth.getSession();
    assert.equal(restored.error, null);
    assert.equal(restored.data.session.access_token, refreshed.data.session.access_token);
    assert.equal(requests, before); // A valid stored session restores without an extra network request.
    assert.equal((await second.auth.signOut({ scope: 'local' })).error, null);
    assert.equal((await second.auth.getSession()).data.session, null);
    assert.equal(h.values.size, 0);
  } finally { await first.auth.dispose(); await second?.auth.dispose(); }
});

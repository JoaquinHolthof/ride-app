const { mocks } = require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash, webcrypto } = require('node:crypto');
const { AUTH_CALLBACK_URL, parseAuthCallback, emailRedirect, mobileAuthSupported } = require('../src/auth/redirects.ts');
const { createCallbackProcessor } = require('../src/auth/callbacks.ts');
const { createGoogleSignIn } = require('../src/auth/oauth.ts');
const { callbackInbox } = require('../src/auth/callback-inbox.ts');
const { redirectSystemPath } = require('../src/app/+native-intent.tsx');
const { submitCredentials } = require('../src/auth/actions.ts');
const callback = code => `${AUTH_CALLBACK_URL}?code=${code}`;
const signedOut = async () => ({ data: { session: null }, error: null });
const success = { status: 'success', message: 'Complete' };

test('stable scheme matches app config; Expo Go and web cannot start mobile OAuth', () => {
  assert.equal(require('../app.json').expo.scheme, 'rideapp');
  assert.equal(mobileAuthSupported('ios', 'storeClient'), false);
  assert.equal(mobileAuthSupported('web', 'standalone'), false);
  assert.equal(mobileAuthSupported('ios', 'bare'), true);
  assert.equal(mobileAuthSupported('android', 'standalone'), true);
  assert.equal(emailRedirect(true).url, AUTH_CALLBACK_URL);
  assert.deepEqual(emailRedirect(false), { url: undefined, error: null });
  for (const url of ['http://localhost:8081', 'exp://192.168.1.2', 'https://192.168.1.2/a',
    'https://localhost/a', 'https://host.local/a', 'https://u:p@example.test', 'https://example.test/?code=fixture']) {
    assert.ok(emailRedirect(false, url).error);
  }
  assert.equal(emailRedirect(false, 'https://owned.example.test/confirmed').url, 'https://owned.example.test/confirmed');
});

test('parses only exact PKCE callback and signup code; rejects tokens, ambiguity and foreign URLs', () => {
  assert.deepEqual(parseAuthCallback(callback('fixture-code')), { kind: 'code', code: 'fixture-code' });
  assert.equal(parseAuthCallback(callback('fixture-code') + '&type=signup').kind, 'code');
  for (const url of ['bad', 'https://auth/callback?code=fixture', 'rideapp://other/callback?code=fixture',
    'rideapp://auth/callback/extra?code=fixture', 'rideapp://user@auth/callback?code=fixture', AUTH_CALLBACK_URL,
    callback(''), callback('first') + '&code=second', callback('fixture') + '&type=recovery',
    callback('fixture') + '&next=https://evil.test', callback('fixture') + '#access_token=fixture-secret',
    AUTH_CALLBACK_URL + '#access_token=fixture-secret&refresh_token=fixture-secret', callback('%E0%A4%A'),
    callback('a'.repeat(9000))]) {
    assert.equal(parseAuthCallback(url).kind, 'error');
    assert.doesNotMatch(JSON.stringify(parseAuthCallback(url)), /fixture-secret|evil\.test/);
  }
});

test('callback errors and expired email links are sanitized; denial is recoverable', () => {
  for (const suffix of ['?error=access_denied&error_code=otp_expired&error_description=fixture-secret',
    '#error=server_error&error_description=fixture-secret', '?error_code=otp_expired']) {
    const result = parseAuthCallback(AUTH_CALLBACK_URL + suffix);
    assert.equal(result.kind, 'error');
    assert.doesNotMatch(result.message, /fixture-secret/);
  }
  assert.match(parseAuthCallback(AUTH_CALLBACK_URL + '?error=access_denied').message, /cancelled/);
  assert.match(parseAuthCallback(AUTH_CALLBACK_URL + '?error_code=otp_expired').message, /expired/);
  assert.match(parseAuthCallback(AUTH_CALLBACK_URL + '#error=access_denied&error_code=otp_expired').message, /expired/);
});

test('cold/warm native intent strips code and errors before navigation; unrelated links survive', () => {
  let notifications = 0;
  const unsubscribe = callbackInbox.subscribe(() => { notifications++; });
  for (const initial of [true, false]) {
    assert.equal(redirectSystemPath({ path: callback('fixture-private-code'), initial }), '/auth/callback');
    assert.equal(callbackInbox.getSnapshot().callback.kind, 'code');
  }
  assert.equal(notifications, 2);
  assert.equal(redirectSystemPath({ path: AUTH_CALLBACK_URL + '#error=otp_expired', initial: false }), '/auth/callback');
  assert.equal(callbackInbox.getSnapshot().callback.kind, 'error');
  assert.equal(redirectSystemPath({ path: 'rideapp://station/fixture', initial: true }), 'rideapp://station/fixture');
  callbackInbox.clear(); unsubscribe();
  assert.equal(callbackInbox.getSnapshot(), null);
});

test('browser and Router duplicate callbacks share one exchange, even after completion', async () => {
  let exchanges = 0;
  const complete = createCallbackProcessor({ getSession: signedOut, exchangeCodeForSession: async code => {
    assert.equal(code, 'fixture'); exchanges++; return { data: { session: {} }, error: null };
  } });
  const one = complete(parseAuthCallback(callback('fixture')));
  const two = complete(parseAuthCallback(callback('fixture')));
  assert.equal(one, two);
  assert.equal((await one).status, 'success');
  assert.equal((await complete(parseAuthCallback(callback('fixture')))).status, 'success');
  assert.equal(exchanges, 1);
});

test('expired/used/missing-verifier/network/storage failures never expose SDK messages', async () => {
  for (const exchange of [async () => ({ data: { session: null }, error: null }),
    async () => ({ data: {}, error: { message: 'fixture-secret', code: 'flow_state_expired' } }),
    async () => { throw new Error('fixture-secret'); }]) {
    const complete = createCallbackProcessor({ getSession: signedOut, exchangeCodeForSession: exchange });
    const result = await complete(parseAuthCallback(callback('fixture')));
    assert.equal(result.status, 'error'); assert.match(result.message, /password/);
    assert.doesNotMatch(result.message, /fixture-secret/);
  }
});

test('existing signed-in account cannot be replaced by a stray confirmation link', async () => {
  const complete = createCallbackProcessor({ getSession: async () => ({ data: { session: { user: { id: 'current' } } } }),
    exchangeCodeForSession: async () => { assert.fail('must not exchange'); } });
  assert.match((await complete(parseAuthCallback(callback('fixture')))).message, /already signed in/);
});

test('conflicting callbacks cannot exchange concurrently and parser failures never reach the SDK', async () => {
  let finish, exchanges = 0;
  const complete = createCallbackProcessor({ getSession: signedOut, exchangeCodeForSession: () => {
    exchanges++; return new Promise(resolve => { finish = resolve; });
  } });
  const pending = complete(parseAuthCallback(callback('first')));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal((await complete(parseAuthCallback(callback('second')))).status, 'error');
  assert.equal((await complete(parseAuthCallback('https://foreign.test?code=fixture'))).status, 'error');
  assert.equal(exchanges, 1);
  finish({ data: { session: {} }, error: null });
  assert.equal((await pending).status, 'success');
});

test('hosted email landing removes callback credentials and never asserts unverified success', () => {
  const fs = require('node:fs'), vm = require('node:vm');
  const html = fs.readFileSync(require('node:path').join(__dirname, '../docs/auth-confirmation/index.html'), 'utf8');
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  assert.doesNotMatch(html, /<script[^>]+src=|<iframe|<form|fetch\(/);
  assert.match(html, /does not sign you in or verify account status/);
  for (const [search, hash, failed] of [['?code=fixture-secret', '', false], ['', '#access_token=fixture-secret', false],
    ['', '#error=access_denied&error_code=otp_expired&error_description=fixture-secret', true]]) {
    let clean, domReady;
    const elements = { title: {}, message: {} };
    vm.runInNewContext(script, { URLSearchParams, location: { search, hash, pathname: '/confirmation' },
      history: { replaceState: (...args) => { clean = args; } },
      document: { addEventListener: (_, cb) => { domReady = cb; }, getElementById: id => elements[id] } });
    assert.deepEqual(clean, [null, '', '/confirmation']);
    domReady();
    assert.equal(Boolean(elements.message.textContent), failed);
    assert.doesNotMatch(JSON.stringify(elements), /fixture-secret/);
  }
});

test('email signup passes explicit redirect while password login remains unchanged', async () => {
  let input;
  const auth = { signUp: async value => { input = value; return { data: { session: null }, error: null }; },
    signInWithPassword: async value => { input = value; return { data: { session: {} }, error: null }; } };
  const result = await submitCredentials(auth, 'signup', 'person@example.test', 'fixture-password', AUTH_CALLBACK_URL);
  assert.equal(result.confirmation, true);
  assert.deepEqual(input.options, { emailRedirectTo: AUTH_CALLBACK_URL });
  await submitCredentials(auth, 'login', 'person@example.test', 'fixture-password', AUTH_CALLBACK_URL);
  assert.equal(input.options, undefined);
});

function googleHarness(overrides = {}) {
  const calls = [];
  const login = createGoogleSignIn({ supported: true, projectUrl: 'https://fixture.supabase.co',
    auth: { signInWithOAuth: async input => { calls.push(['init', input]); return {
      data: { url: 'https://fixture.supabase.co/auth/v1/authorize?provider=google' }, error: null }; } },
    openBrowser: async (...args) => { calls.push(['browser', ...args]); return { type: 'success', url: callback('fixture') }; },
    complete: async parsed => { calls.push(['complete', parsed]); return success; }, ...overrides });
  return { login, calls };
}

test('Google initiation delegates PKCE to Supabase and shares concurrent button attempts', async () => {
  const h = googleHarness();
  const one = h.login(); assert.equal(one, h.login());
  assert.equal(await one, success);
  assert.deepEqual(h.calls[0][1], { provider: 'google', options: { redirectTo: AUTH_CALLBACK_URL, skipBrowserRedirect: true } });
  assert.equal(h.calls[1][2], AUTH_CALLBACK_URL);
  assert.deepEqual(h.calls[2], ['complete', { kind: 'code', code: 'fixture' }]);
});

test('cancel/dismiss do not exchange sessions and allow retry', async () => {
  for (const type of ['cancel', 'dismiss']) {
    const h = googleHarness({ openBrowser: async () => ({ type }) });
    assert.equal((await h.login()).status, 'cancelled');
    assert.equal((await h.login()).status, 'cancelled');
    assert.equal(h.calls.filter(([event]) => event === 'complete').length, 0);
    assert.equal(h.calls.filter(([event]) => event === 'init').length, 2);
  }
});

test('Expo Go rejects before initiation; provider, browser and unexpected redirect failures stay safe', async () => {
  const blocked = googleHarness({ supported: false });
  assert.match((await blocked.login()).message, /development build/);
  assert.equal(blocked.calls.length, 0);
  for (const overrides of [
    { auth: { signInWithOAuth: async () => ({ error: { message: 'fixture-secret' }, data: {} }) } },
    { auth: { signInWithOAuth: async () => ({ data: { url: 'https://evil.test/authorize' } }) } },
    { openBrowser: async () => { throw new Error('fixture-secret'); } },
    { openBrowser: async () => ({ type: 'locked' }) },
    { openBrowser: async () => ({ type: 'success' }) },
  ]) {
    const h = googleHarness(overrides);
    const result = await h.login(); assert.equal(result.status, 'error');
    assert.doesNotMatch(result.message, /fixture-secret|evil\.test/);
    assert.equal(h.calls.filter(([event]) => event === 'complete').length, 0);
  }
});

test('native crypto adapter yields S256 PKCE with installed SDK and secure verifier survives restart', async () => {
  mocks.set('expo-crypto', { CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
    getRandomValues: array => webcrypto.getRandomValues(array), digest: (algorithm, data) => webcrypto.subtle.digest(algorithm, data) });
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
  Object.defineProperty(globalThis, 'crypto', { value: undefined, writable: true, configurable: true });
  const { ensurePkceCrypto } = require('../src/auth/pkce-crypto.native.ts');
  ensurePkceCrypto();
  const { createClient } = require('@supabase/supabase-js');
  const { createSecureSessionStorage } = require('../src/auth/secure-storage.ts');
  const values = new Map();
  const store = { getItem: async key => values.get(key) ?? null, setItem: async (key, value) => { values.set(key, value); },
    removeItem: async key => { values.delete(key); } };
  const requests = [];
  const fetch = async (url, init) => {
    if (String(url).includes('/logout')) return new Response('{}', { status: 200 });
    requests.push({ url: String(url), body: JSON.parse(init.body) });
    if (String(url).includes('/signup')) return new Response(JSON.stringify({ id: 'fixture-user', identities: [] }), { status: 200 });
    return new Response(JSON.stringify({ access_token: 'fixture-access', refresh_token: 'fixture-refresh', expires_in: 3600,
      token_type: 'bearer', user: { id: 'fixture-user' } }), { status: 200 });
  };
  const make = () => createClient('https://fixture.supabase.co', 'sb_publishable_fixture', { auth: {
    flowType: 'pkce', storage: createSecureSessionStorage(store), persistSession: true,
    autoRefreshToken: false, detectSessionInUrl: false, debug: false,
  }, global: { fetch } });
  let first, second;
  try {
    first = make();
    const oauth = await first.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: AUTH_CALLBACK_URL, skipBrowserRedirect: true } });
    assert.equal(oauth.error, null);
    const url = new URL(oauth.data.url);
    assert.equal(url.searchParams.get('code_challenge_method'), 's256');
    const signup = await submitCredentials(first.auth, 'signup', 'person@example.test', 'fixture-password', AUTH_CALLBACK_URL);
    assert.equal(signup.error, null); assert.equal(signup.confirmation, true);
    assert.equal(requests[0].body.code_challenge_method, 's256');
    assert.equal(new URL(requests[0].url).searchParams.get('redirect_to'), AUTH_CALLBACK_URL);
    const challenge = requests[0].body.code_challenge;
    await first.auth.dispose();
    second = make();
    const complete = createCallbackProcessor(second.auth);
    assert.equal((await complete(parseAuthCallback(callback('fixture-email-code')))).status, 'success');
    const exchange = requests.at(-1);
    assert.match(exchange.url, /grant_type=pkce/);
    assert.equal(exchange.body.auth_code, 'fixture-email-code');
    assert.equal(createHash('sha256').update(exchange.body.code_verifier).digest('base64url'), challenge);
    assert.equal((await second.auth.getSession()).data.session.user.id, 'fixture-user');
    // SDK 2.119 also keeps a bounded index of flow slots even without its experimental
    // multi-flow redirect opt-in. Legacy exchange removes the current fixed verifier.
    assert.equal(values.has('sb-fixture-auth-token-code-verifier.manifest'), false);
    assert.equal((await second.auth.signOut({ scope: 'local' })).error, null);
    assert.equal(values.size, 0); // Sign out removes all indexed encrypted flow slots too.
  } finally {
    await first?.auth.dispose(); await second?.auth.dispose();
    Object.defineProperty(globalThis, 'crypto', descriptor);
    mocks.delete('expo-crypto');
  }
});

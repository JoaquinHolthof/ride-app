const { mocks } = require('./register.cjs');
require('./favourites-ui-adapter.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const native = require('react-native-web');
let context, navigation;
const Stack = props => React.createElement(React.Fragment, null, props.children);
Stack.Screen = props => React.createElement('ride-route', { name: props.name });
Stack.Protected = props => props.guard ? React.createElement(React.Fragment, null, props.children) : null;
mocks.set('expo-router', { Stack, DarkTheme: { colors: {} }, ThemeProvider: native.View,
  router: { push: path => { navigation = path; }, replace: path => { navigation = path; } } });
mocks.set('expo-status-bar', { StatusBar: () => null });
mocks.set('react-native-safe-area-context', { SafeAreaView: native.View });
mocks.set('@/auth/AuthProvider', { useAuth: () => context, AuthProvider: ({ children }) => children });
const { AuthNavigator } = require('../src/app/_layout.tsx');
const { CredentialForm } = require('../src/components/AuthScreen.tsx');
const Confirm = require('../src/app/confirm-email.tsx').default;
const { ExploreHeader } = require('../src/components/ExploreScreen.tsx');
const { initialExploreState } = require('../src/utils/explore.ts');
const render = (type, props) => renderToStaticMarkup(React.createElement(type, props));
function setState(state, configurationError = null) { context = { state, configurationError, retry() {}, submit: async () => ({ error: null, confirmation: false }) }; }
test('root blocks protected routes until restoration resolves, including configuration and restore errors', () => {
  setState({ status: 'loading', session: null, error: null });
  assert.match(render(AuthNavigator), /Restoring your secure session/);
  assert.doesNotMatch(render(AuthNavigator), /ride-route/);
  setState({ status: 'error', session: null, error: 'Restore failed' });
  assert.match(render(AuthNavigator), /Try again/);
  assert.doesNotMatch(render(AuthNavigator), /ride-route/);
  setState({ status: 'ready', session: { user: {} }, error: null }, 'Configuration missing');
  assert.match(render(AuthNavigator), /Configuration missing/);
  assert.doesNotMatch(render(AuthNavigator), /ride-route/);
});
test('root declares all existing routes protected and removes them on sign out', () => {
  setState({ status: 'ready', session: null, error: null });
  let html = render(AuthNavigator);
  assert.match(html, /name="login"/); assert.match(html, /name="signup"/); assert.match(html, /name="confirm-email"/);
  assert.match(html, /name="auth\/callback"/);
  assert.doesNotMatch(html, /name="\(tabs\)"/);
  assert.doesNotMatch(html, /name="index"|name="station\/\[id\]"|name="account"/);
  setState({ status: 'ready', session: { user: { id: 'fixture' } }, error: null });
  html = render(AuthNavigator);
  assert.match(html, /name="\(tabs\)"/);
  assert.match(html, /name="auth\/callback"/);
  assert.doesNotMatch(html, /name="login"|name="signup"|name="confirm-email"/);
  setState({ status: 'ready', session: null, error: null });
  assert.doesNotMatch(render(AuthNavigator), /name="\(tabs\)"/);
});
test('auth forms expose email/password fields and confirmation guidance without sensitive route parameters', () => {
  setState({ status: 'ready', session: null, error: null });
  const login = render(CredentialForm, { mode: 'login' });
  assert.match(login, /Email address/); assert.match(login, /type="password"/); assert.match(login, /Log In/);
  assert.match(login, /Continue with Google/);
  assert.match(render(CredentialForm, { mode: 'signup' }), /at least 8 characters/);
  const confirmation = render(Confirm);
  assert.match(confirmation, /Check your inbox/); assert.match(confirmation, /return here and log in/);
  const actions = Confirm().props.children;
  actions[1].props.onPress();
  assert.equal(navigation, '/login');
});
test('Explore header has secondary view and primary mode controls without duplicate navigation', () => {
  const html = renderToStaticMarkup(ExploreHeader({ state: initialExploreState, dispatch() {} }));
  assert.match(html, /Explore view/); assert.match(html, /Find a bike/); assert.match(html, /Find a dock/);
  assert.doesNotMatch(html, /RIDE account|>Account<|>Saved</);
});

test('Expo Go Google button explains the development-build requirement alongside email login', () => {
  setState({ status: 'ready', session: null, error: null });
  context.googleAvailabilityMessage = 'Google sign-in needs a RIDE development build. Use email and password in Expo Go.';
  const html = render(CredentialForm, { mode: 'login' });
  assert.match(html, /development build/);
  assert.match(html, /Email address/);
  assert.match(html, /Continue with Google/);
  assert.match(html, /aria-disabled="true"/);
});

const { mocks } = require('./register.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const native = require('react-native-web');
const { dataStatus } = require('../src/utils/data-status.ts');
const { Colors } = require('../src/constants/theme.ts');
const now = Date.parse('2026-11-26T12:00:00Z');
const station = { timestamp: new Date(now).toISOString() };
const feed = { data: { stations: [station], fetchedAt: now, skippedStations: 0 }, isFetching: false, error: null, retryAt: 0, now };

test('status distinguishes fresh, cached, loading, connection failure and service error without green stale data', () => {
  assert.equal(dataStatus(feed).kind, 'fresh');
  assert.equal(dataStatus(feed).color, Colors.accent);
  for (const [patch, kind] of [
    [{ now: now + 61_000 }, 'cached'],
    [{ data: { ...feed.data, stations: [{ timestamp: new Date(now - 301_000).toISOString() }] } }, 'cached'],
    [{ data: { ...feed.data, stations: [{ timestamp: null }] } }, 'cached'],
    [{ data: { ...feed.data, stations: [] } }, 'cached'],
    [{ isFetching: true, error: 'Offline' }, 'loading'],
    [{ error: 'Unable to connect. Check your connection and try again.' }, 'offline'],
    [{ error: 'Server returned 503.' }, 'error'],
    [{ data: null }, 'loading'],
  ]) {
    const status = dataStatus({ ...feed, ...patch });
    assert.equal(status.kind, kind);
    assert.notEqual(status.color, Colors.accent);
  }
  assert.equal(dataStatus({ ...feed, error: 'Offline' }).label, 'Connection issue · cached');
});

let buttons = [], barStyle, navigated, events = [], prevented = false;
mocks.set('react-native', { ...native, Keyboard: { dismiss() {}, addListener: () => ({ remove() {} }) },
  Pressable: props => { buttons.push(props); return React.createElement(native.Pressable, props); },
  View: props => { if (props.accessibilityRole === 'tablist') barStyle = native.StyleSheet.flatten(props.style); return React.createElement(native.View, props); },
});
const { RideTabBar } = require('../src/components/RideTabBar.tsx');
test('one accessible tab bar respects insets, routes by key and honours prevented navigation', () => {
  const routes = [{ key: 'explore', name: '(explore)' }, { key: 'saved', name: '(saved)' }, { key: 'account', name: 'account' }];
  const props = { state: { routes, index: 0 }, descriptors: Object.fromEntries(routes.map((r, i) => [r.key, { options: { title: ['Explore', 'Saved', 'Account'][i] } }])),
    insets: { bottom: 34, left: 0, right: 0, top: 0 }, navigateToTab: key => { navigated = key; },
    emitter: { emit: event => { events.push(event); return { defaultPrevented: prevented }; } } };
  buttons = []; events = []; navigated = undefined;
  const html = renderToStaticMarkup(React.createElement(RideTabBar, props));
  assert.match(html, /Explore/); assert.match(html, /Saved/); assert.match(html, /Account/);
  assert.equal(buttons.length, 3);
  assert.equal(buttons[0].accessibilityState.selected, true);
  assert.equal(barStyle.paddingBottom, 34);
  for (const button of buttons) {
    const style = native.StyleSheet.flatten(button.style({ pressed: false }));
    assert.ok(style.minHeight >= 44 && style.minWidth >= 44);
  }
  buttons[0].onPress(); assert.equal(navigated, undefined);
  buttons[1].onPress(); assert.equal(navigated, 'saved');
  assert.deepEqual(events.at(-1), { type: 'tabPress', target: 'saved', canPreventDefault: true });
  prevented = true; buttons[2].onPress(); assert.equal(navigated, 'saved');
  buttons[2].onLongPress(); assert.equal(events.at(-1).type, 'tabLongPress');
});

# RIDE — Velo Antwerpen

A mobile-first React Native / Expo app for AP University's Minor Visual Code assignment. Built with Expo SDK 58, Expo Router and TypeScript, using the original carbon/forest/electric-lime design in `MOODBOARD.md`.

## Phase 4.1: Supabase email authentication — 2026-11-24

This explicitly requested phase supersedes the original no-auth scope. Explore, station details and Account now require a session. After login, the existing CityBikes client/cache, map/clusters, Bike/Dock modes, list/search/filters, directions and offline handling work as before. Tap **RIDE / Account** in the Explore header to sign out on this device. No application tables, favourites database, OAuth or custom backend were added.

### Configuration and persistence

Keep `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_KEY` in ignored `.env.local`; `.env.example` contains placeholders only. Restart Metro after environment changes. Startup validates presence, an HTTPS URL and a publishable-key format, without printing values. Missing/invalid configuration shows a branded error instead of opening protected routes. Public variables are embedded in the app bundle: use only the publishable key, never a secret/service-role key or database password.

Native sessions use Expo SecureStore (iOS Keychain / Android Keystore-backed storage), with `WHEN_UNLOCKED_THIS_DEVICE_ONLY` accessibility on iOS and no biometric prompt. The adapter divides large sessions into Unicode-safe chunks under historical native item limits. Every chunk and its manifest is encrypted by SecureStore. A new manifest is published only after all writes succeed; read/write failures are sanitized and partial sessions are never returned. Normal replacement/sign-out removes old chunks. An interrupted cleanup may leave unreachable encrypted chunks; no plaintext session backup is kept. SecureStore can survive an iOS uninstall, so use Sign Out rather than relying on deleting Expo Go to clear a session. [Expo SDK 58 SecureStore documentation](https://docs.expo.dev/versions/v58.0.0/sdk/securestore/).

The shared client persists sessions and disables URL session detection/debug logging. The native provider owns foreground refresh using `startAutoRefresh` / `stopAutoRefresh`, subscribes once to auth changes, and removes its auth/AppState listeners on cleanup. Loading/errors block protected content. A late restore cannot overwrite a newer sign-in/sign-out event. Passwords exist only in the form/request, are cleared after submission and never enter storage or route parameters. Auth errors display curated messages instead of raw responses. Web preview sessions are memory-only and reset on a full reload. [Supabase React Native guide](https://supabase.com/docs/guides/auth/quickstarts/react-native), [refresh lifecycle](https://supabase.com/docs/reference/javascript/auth-startautorefresh).

Expo Router `Stack.Protected` guards Explore, station details and Account and removes their navigation history when the session clears. Login, signup and confirmation guidance are available while signed out. A protected cold link redirects to login; after login this phase opens Explore rather than remembering a deferred destination. These are client navigation guards, not server authorization; future private data will require server-enforced policies. No private data tables exist in this slice. [Protected routes](https://docs.expo.dev/router/advanced/protected/).

### Remaining Supabase dashboard configuration

A read-only request to the configured project's public Auth settings returned HTTP 200: **email enabled, signup enabled, email confirmation required**. No real users were created, no email was sent, and dashboard configuration was not changed.

1. Keep Email/Password enabled and **Confirm email** enabled. Set an appropriate password policy; the app requires at least 8 characters for signup and also respects server rejection of weaker passwords.
2. In Authentication → URL Configuration, set **Site URL** to a reachable **HTTPS confirmation landing page you control**. The app does not override `emailRedirectTo`, so Supabase uses this Site URL. Keep the standard confirmation email's `{{ .ConfirmationURL }}` link. Confirm in the browser, then manually return to Expo Go and Log In. This phase does not consume callback tokens or automatically open the app. Avoid a third-party landing page: implicit confirmation redirects can carry session tokens in the fragment; the owned page should discard that fragment without logging it or running tracking scripts. Do not leave an unreachable localhost URL for iPhone testing. [Redirect configuration](https://supabase.com/docs/guides/auth/redirect-urls).
3. Verify SMTP delivery and sender settings. Supabase's built-in email service is restricted to authorized project-team addresses and currently limited to two messages/hour; configure custom SMTP to test with other addresses. SMTP credentials belong only in Supabase's dashboard, never in this app. [SMTP restrictions and configuration](https://supabase.com/docs/guides/auth/auth-smtp).
4. Use an email address you control to complete signup, confirmation and login. Check Authentication → Users for confirmation status if troubleshooting. Existing-user signup responses deliberately do not reveal whether an account exists. For an expired confirmation link, retry signup after the email cooldown or handle delivery through the dashboard. Password reset/resend UI is not part of this slice.

### Dependencies and audit

- Added using Expo CLI: `expo-secure-store` **~58.0.3** (included in SDK 58 Expo Go) and `react-native-url-polyfill` **^4.0.0** (JavaScript URL support for Supabase). Expo added the SecureStore config plugin for future native builds; no custom build is needed for Expo Go.
- `@supabase/supabase-js` was already installed by the user. Its **2.119.2** version is unchanged and now pinned exactly; the lockfile preserves resolved versions. Existing `.agents/`, `skills-lock.json` and the user's prior package installation were preserved.
- `npm audit` before and after this work reports **3 moderate, 0 high, 0 critical** findings: `minimatch` (globparts amplification / denial of service, [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249)), propagated through `@expo/fingerprint` and `expo`. These are three affected dependency entries, not three distinct advisories. npm's proposed forced fix installs Expo **52.0.49**, so it was not applied. No downgrade or `npm audit fix --force` was run; revisit an SDK-compatible upstream fix later.

### Validation and iPhone handoff

All **56 tests pass** (39 existing + 17 auth tests). Coverage includes restored/loading/error/signed-out routing, auth event races and cleanup, foreground refresh, validation/error sanitization, confirmation vs immediate signup, local sign-out, Unicode/large secure payloads, partial writes and a real installed-SDK integration using mock HTTP responses. Native storage and router rendering use adapters; these tests do not prove Keychain persistence or native navigation on an iPhone. TypeScript and Expo compatibility checks pass. iOS and Android Hermes exports pass in `.expo/phase41-export`. Expo's generated route types were refreshed through a temporary Metro session, which was then stopped. `.env.local` is ignored and untracked; no environment values, credentials or tokens were printed.

1. Finish the dashboard settings above. Run `npx expo start --clear` (or add `--tunnel` for network discovery), scan the QR code and open SDK 58-compatible Expo Go. Expect branded loading followed by Log In on first use.
2. Try invalid email/short signup password and a wrong login password. Verify readable errors, disabled submission while pending, keyboard behaviour, safe areas, large text and VoiceOver. No protected map/detail screen should flash during restoration.
3. Sign up with your test address. Expect Check your inbox. Open the email link in the browser, return to RIDE and Log In. Verify Explore loads, then regression-test map pan/zoom/clusters, Bike/Dock counts, list searching/filtering, station details and directions.
4. Fully close and reopen Expo Go with the device unlocked. Confirm the signed-in session restores. Background and foreground the app; leave it long enough for token refresh and verify it continues working without another login. iOS may retain Keychain data across reinstall; test Sign Out explicitly.
5. Open RIDE / Account → Sign Out. Confirm Log In appears, Back cannot reopen protected content, and reopening `/station/<real-id>` or `/account` while signed out cannot bypass login. Restart again to confirm the session stays cleared.
6. After login and loading stations, disconnect internet and refresh the list/map data panel: cached station data should remain labelled. Try auth offline, then reconnect and retry. Restoring an expired session may require connectivity; authentication does not make the existing session-only CityBikes cache survive a cold app restart.

Remaining manual work: email delivery/confirmation, actual login/logout, restart persistence, foreground refresh, protected deep-link/back behaviour, keyboard/accessibility and all native regressions on iPhone (and Android). No physical-device authentication was verified. Google OAuth, password reset, favourites database and production distribution remain deferred. No commit or push was created. Suggested commit: `feat: add secure Supabase email authentication`.

### Phase 4.1 changed files

| Area | Files |
| --- | --- |
| Auth infrastructure | `src/auth/config.ts`, `client.ts`, `secure-storage.ts`, `session-storage.native.ts`, `session-storage.ts`, `lifecycle.ts`, `actions.ts`, `AuthProvider.tsx` |
| Auth UI / routes | `src/components/AuthScreen.tsx`; `src/app/login.tsx`, `signup.tsx`, `confirm-email.tsx`, `account.tsx` |
| Existing navigation | `src/app/_layout.tsx`, `src/app/index.tsx`, `src/components/ExploreScreen.tsx` |
| Tests | `tests/auth.test.cjs`, `tests/auth-ui.test.cjs` |
| Configuration | `.env.example`, `app.json`, `package.json`, `package-lock.json` |
| Documentation | `AGENTS.md`, `PLAN.md`, `USERFLOW.md`, `CHECKLIST.md`, `README.md` |

The following Phase 2/3 sections are historical implementation records; Phase 4.1 supersedes their earlier statements that authentication is deferred.

## Phase 3.2: mobile UI polish — 2026-11-24

The user confirms the Phase 3.1 scrolling correction works on a physical iPhone. This pass preserves that flex layout and refines its hierarchy; the new visual changes have not yet been verified on a device.

- Compact RIDE branding, Map / List tabs and sentence-case Find a bike / Find a dock controls. Less padding gives the map more room. Controls retain 44 pt minimum targets, text scaling and wrapping; the header can wrap at large text sizes. List's accessible name includes station search.
- Count-only cluster badges use forest fill and a restrained lime outline/numeral, with mint for zero/closed groups and warm white for unknown groups. Numbers mean **station count**, also announced by VoiceOver. Badges are 44 pt minimum rather than the previous two-line badge; text can grow. Existing grid spacing, exact station coordinates, mode totals, viewport culling and cluster zoom/member selection are unchanged. Snapshot tracking stays bounded and is renewed when the font scale changes.
- Selected pins retain their native availability colour, raised stacking and a stronger selection ring; accessibility labels explicitly announce selection.
- Details lead with compact back navigation/name, large real counts and a lime **Get Directions** action. Address and source time follow without stacked decorative panels. Raw coordinates live in a collapsed **Technical information** section, which resets for a different station. Refresh, cached/error states, source-age warnings and CityBikes credit remain available.
- Press feedback now covers search clear, filters, the map data button, preview close and detail controls. Disabled actions use a muted outline treatment and remain non-interactive.

No dependencies, API/cache logic, native configuration or Expo Go development tools changed. No commit or push was created.

**Validation:** `npm test` passes all **39 tests**; `npx tsc --noEmit` and `npx expo install --check` pass; iOS and Android Hermes exports succeed in `.expo/phase32-export`. The 37 prior tests remain, with expectations adapted to the intended labels/collapsed coordinates, plus two regressions covering compact cluster state/selection and technical coordinate content. Existing API/cache, loading/error/empty, filtering/sorting, selection, pull-to-refresh, directions and non-scrolling map checks pass. Rendering tests use adapters and do not prove native appearance, gestures or VoiceOver behaviour.

**Files changed:**

| Area | Files |
| --- | --- |
| Explore and map | `src/components/ExploreScreen.tsx`, `SegmentedControl.tsx`, `StationMap.native.tsx`, `StationPreview.tsx`, `MapDataPanel.tsx` |
| Details and actions | `src/app/station/[id].tsx`, `src/components/DirectionsButton.tsx`, `ActionButton.tsx`, new `StationTechnicalInfo.tsx` |
| Regression coverage | `tests/explore.test.cjs`, `tests/map-layout.test.cjs`, `tests/ui.test.cjs` |
| Documentation | `PLAN.md`, `USERFLOW.md`, `CHECKLIST.md`, `README.md` |

**iPhone Expo Go checks:**

1. Reload the existing Expo Go session. If Metro is stopped, run `npx expo start` here and scan its QR code; use `npx expo start --tunnel` if LAN discovery fails. If old UI persists, restart with `--clear` and scan again.
2. Confirm the compact RIDE / Map / List header and Bike/Dock control stay fixed while the map fills the remaining safe area. Drag on the header, pan/zoom the map and open/close a preview; no header content should scroll beneath the map.
3. At city zoom, check compact badges display only counts and remain easy to tap. Tap to zoom or choose a member; select a pin and verify its ring, station name and counts. Switch modes and repeat, including zero/unknown/closed examples where available. Check native badge snapshots and smooth gestures with the full network; automated fixtures cover states absent from live data.
4. Open List, search and filter, then return to Map. Open details from both list and preview; confirm the same station's counts, address and source time. Tap Get Directions and confirm the real destination opens externally without RIDE asking for location permission.
5. Expand and collapse Technical information; compare coordinates with the selected station. Return to Explore. Check pull-to-refresh, cooldown-disabled controls and pressed feedback. After loading data, disconnect internet and refresh: cached data/error labels must remain; reconnect and retry after the cooldown.
6. Increase iPhone text size, including accessibility sizes, and test a long station name: no clipped text or inaccessible controls; detail/preview content should remain scrollable. Test VoiceOver tab selection, cluster/pin announcements, primary actions and disclosure expanded/collapsed state. Check notch/home-indicator and map attribution clearance. Leave the blue Expo gear unchanged.

Remaining: these Phase 3.2 device checks, native map performance and separate Android device validation. Optional GPS, favourites, backend/auth and standalone Android Maps configuration remain deferred. Suggested commit after review: `style: refine mobile Explore markers and station details`.

## Phase 3: Explore map and modes

### Phase 3.1 — iPhone layout and clustering correction

The user confirmed the app runs in iPhone Expo Go and reported header scrolling/overlap and severe pin congestion. In the Phase 3.2 handoff, the user confirmed the scrolling issue is resolved; other device checks below remain applicable.

**Cause:** `ExploreScreen` previously placed a vertical header ScrollView capped at 46% of window height above the map, and another vertical ScrollView capped at 29% below it. The header contained branding, view/mode switches, search, filters, result count and the full refresh/status stack. Those independently scrolling siblings consumed most of the screen while the native map stayed in the middle; scrolling controls disappeared at the map boundary instead of behaving like fixed map controls. The map itself was already outside those ScrollViews. A separate native compositor/z-order defect has not been reproduced, so this is a source-level explanation of the confirmed layout problem, not a claim of diagnosing an iOS rendering bug.

**Fix:** the compact RIDE header, view switch and Bike/Dock control are fixed non-scrolling siblings of a `flex: 1` map viewport. The native MapView also uses `flex: 1`; there are no percentage-height scroll bands around it. Search, advanced filters and the full status panel live in List's FlatList. The map has a small data-age/error button opening a modal for refresh and CityBikes attribution. Only the intentional selected-station preview overlays the bottom of the map; it is bounded to half the measured map height and can scroll for large text. Native map padding accounts for the preview. The main layout uses no absolute positioning; absolute positioning is confined to map overlays. Safe areas and 44pt controls are preserved.

**Markers:** a TypeScript Web Mercator grid groups nearby stations at the current zoom, culls outside a padded viewport and recalculates after camera gestures finish. Cluster badge numbers explicitly mean *stations*, not available bikes/docks. Cluster colour and callout totals follow Bike/Dock mode, excluding closed and unknown counts from available totals. A selected station remains an individual pin at its exact coordinates with a selection ring. Tap a cluster to zoom; coincident or very close points open a named member chooser. Individual counts remain in native callout labels and the compact preview rather than creating hundreds of overlapping custom count labels.

The existing Expo Go-compatible `react-native-maps` remains unchanged. A JavaScript clustering strategy was considered alongside [Supercluster](https://github.com/mapbox/supercluster); for this 323-station network, the small tested grid implementation avoids another dependency and all native/JSI changes. Only cluster badges use custom marker views, with view tracking stopped after their initial snapshot. Individual stations retain native pins. No dependencies or development-tool configuration were changed in Phase 3.1.

**Live data check (2026-11-24):** at the initial Antwerp region and a 390pt viewport, 323 valid stations became 40 markers (34 clusters + 6 individual pins), representing all 323 stations. Grouping took approximately 1.3ms on the development machine. This is not an iPhone FPS measurement; marker counts vary with viewport, zoom and filtering.

**Blue gear investigation:** no gear/floating development-control component exists in RIDE source. Expo's [DevMenuFABView.swift](https://github.com/expo/expo/blob/main/packages/expo-dev-menu/ios/FAB/DevMenuFABView.swift) uses `gearshape.fill` with a blue circular background, and [DevMenuFABWindow.swift](https://github.com/expo/expo/blob/main/packages/expo-dev-menu/ios/FAB/DevMenuFABWindow.swift) hosts it in a separate passthrough UIWindow. This matches the reported blue gear and identifies Expo's Tools overlay as the source-backed explanation. No device screenshot was attached or found in the project/recent Downloads, so the exact screenshot was not visually compared. Tapping it should open Expo's developer menu. It belongs to the Expo Go/development host and is absent from a normal production RIDE build. It was not hidden, moved or disabled.

**Validation:** all 37 tests pass (27 previous tests retained/adapted, 6 clustering tests and 4 layout regression tests), TypeScript and Expo dependency checks pass, and iOS/Android Hermes exports succeed. Layout tests assert a fixed header and a flex viewport with no ScrollView ancestor, and preserve searchable List and data-state access. Native marker tests use adapters, not a physical map renderer.

Phase 3.1 files: `src/components/ExploreScreen.tsx`, `StationMap.native.tsx`, `StationMap.types.ts`, `StationPreview.tsx`; new `MapDataPanel.tsx`, `src/utils/map-clusters.ts`, `tests/map-clusters.test.cjs`, `tests/map-layout.test.cjs`; adapted `tests/explore.test.cjs`; updated `PLAN.md`, `USERFLOW.md`, `CHECKLIST.md`, `README.md`. The API, shared cache, details, directions and existing design tokens are unchanged.

**Retest on iPhone:**

1. Reload the existing Expo Go session. If it shows old UI, restart Metro with `npx expo start --clear` (or `npx expo start --tunnel --clear`) and rescan.
2. In Map, drag vertically over the header: branding and mode controls must stay fixed. Pan the map: it must fill the remaining safe-area viewport without a scrolling panel above/below it. Check a small iPhone and larger Dynamic Type settings.
3. Zoom out to see numbered station groups; tap groups to zoom in and select individual stations. Confirm the selected pin/ring and preview refer to the same station. At overlapping coordinates, use the named member chooser. Check pan/zoom smoothness and badge rendering after repeated zooms.
4. Switch Bike/Dock modes without losing your current camera position. Verify marker status and selected counts change. Open List / Search, search `Centraal`, apply Available/Zero/Unknown filters, then return to Map. Filtered stations must match; Clear search & filter restores all.
5. Open a station preview and check its close, details and directions actions. At large text sizes, scroll only the bounded preview; the map itself must not move with it. Ensure native map attribution remains visible above the preview.
6. Tap the map's data-age button for refresh and CityBikes attribution. Disconnect internet after loading, refresh, and verify a visible cached/error badge plus retained List results. Restore connectivity and retry after the cooldown; also verify list pull-to-refresh.
7. Tap the blue gear only to confirm it opens Expo's developer menu, then dismiss it. Do not change developer settings as part of this check. Repeat accessibility/gesture checks on Android when available.

No commit or push was made. Suggested commit: `fix: give Explore a full map viewport and cluster station pins`.

Explore now opens a real native Antwerp map on iOS/Android, with a List alternative using the same CityBikes response. **Find a bike / Find a dock** changes descending availability ranking, primary count emphasis, filters and marker labels/colours. Zero, unknown and closed stations stay distinct; closed stations sort last and never satisfy Available.

Search station names (case/accent insensitive), then filter All stations, Available, No bikes/No docks or Unknown. Tap a pin for a selected-station preview with both real counts, details and directions. The selected pin gets a ring; a removed or filtered-out selection clears safely. List selection still opens details directly. Stations without coordinates remain available in List.

Directions open Google Maps in its app or browser with the exact station destination. No origin is invented; the external app handles the starting point. RIDE requests no location permission. Missing coordinates disable directions; open failures display a retryable message.

### Dependency and native configuration

`react-native-maps` **1.29.11** is the only added direct dependency, installed via `npx expo install react-native-maps`. Its transitive `@types/geojson` dependency is recorded in the lockfile. [Expo SDK 58 map documentation](https://docs.expo.dev/versions/v58.0.0/sdk/map-view/) and the installed SDK's module manifest confirm the supported version and Expo Go compatibility.

No extra setup, custom development build or app Maps API key is required for Expo Go. Provider defaults are Apple Maps on iOS and Google Maps on Android. iOS uses native dark appearance; Google Maps receives restrained dark styling. **Standalone Android/store builds require separate Google Maps API configuration later.** No keys or native configuration were added here. Map tiles come from the native map provider; station data still comes only from CityBikes.

The map remains uncontrolled during pan/zoom. Individual pins use actual coordinates and native titles; the smaller set of clusters uses labelled badges. Available pins are lime, zero/closed mint, unknown warm white, with textual status in the callout/preview. Sorted results and the map are memoized. Search/filter changes can reframe results; mode changes and fetches do not forcibly recenter the map. Switching back from List preserves the camera, fitting filtered results when appropriate.

On web, List is the default. Selecting Map explains that the native map is available in iOS/Android Expo Go; it never substitutes decorative cartography. Optional locate-me is deferred: no location dependency, request or assumed position is present.

### Phase 3 validation — 2026-11-24

- All **27 automated tests** pass: the existing 16 tests plus 11 tests for mode ranking, filters, search, deterministic sorting, selection, directions, controls, native-marker props, preview actions and fallback states.
- TypeScript and Expo dependency checks pass. iOS and Android JavaScript/Hermes bundles export successfully to `.expo/phase3-export`.
- Native map, keyboard and navigation adapters test props and callbacks; they do **not** validate actual map tiles, native gestures or device performance.
- Figma concept inspection was blocked by the MCP Starter-plan call limit. The supplied moodboard and existing tokens were used; no pixel-match claim is made.
- Browser visual inspection was blocked by an unavailable computer-use browser host. Rendered UI tests passed; physical-device and visual verification remain pending.

### Exact iPhone Expo Go test sequence

1. Stop the older Metro server with Ctrl+C in its terminal. From this folder, run `npm install`, then `npx expo start --clear`. If Wi-Fi discovery fails, stop it and run `npx expo start --tunnel --clear`. Scan the QR code with the iPhone camera and open a compatible Expo Go for SDK 58. No custom build or app API key is required.
2. Confirm real Antwerp streets/river geography load with station pins and no RIDE location prompt. If tiles fail, check internet and confirm List remains usable.
3. In Find a bike, open List: highest bike counts should appear first. Switch to Find a dock: sorting and lime count emphasis must change to docks. Closed stations remain last.
4. Search `Centraal` or another real station name. Toggle Available, No bikes/No docks and Unknown. Unknown can legitimately have no results. Clear filters. Search nonsense and use Clear search & filter to recover.
5. Switch to Map, pan and pinch-zoom repeatedly, then tap several pins. Confirm the preview name and both counts belong to that station. Change modes and verify marker/preview status updates. Apply a filter excluding the selected station and confirm its preview clears.
6. Open Station details from the preview, compare counts/location/source time, then return. Open Directions: the external app/browser must receive the real station destination without requesting RIDE location access. The external app may request its own permission or let you choose a starting point.
7. In List, wait out the 15-second cooldown and pull to refresh. Existing results stay visible during loading. After loading, disconnect internet and refresh: cached results and an error should remain. Restore connectivity and retry. Offline map tiles are not guaranteed; List is the fallback. A cold offline restart cannot recover the session-only cache.
8. Check a small iPhone, large text and VoiceOver: safe areas, mode/filter selection, list rows, preview close, directions and 44pt controls. The corrected header stays fixed; only the intentional bounded preview can scroll over the map. Repeat native gesture/performance testing on Android separately.

No physical-device checks, commits or pushes were performed in this phase. Suggested commit after review: `feat: add native station map and bike dock explore modes`.

## Preserved station data and detail functionality

Each station card shows available bikes, free docks and explicit availability text. Tap a card to open `/station/[id]` with that station's actual counts, street address when provided and source update time; expand Technical information for coordinates. Both screens support manual refresh and show loading/error recovery states.

Missing or invalid counts display as unknown, never as zero. Valid zero counts display explicitly. Unreadable station identities and duplicate IDs are omitted with a notice; a wholly invalid response is an error, distinct from an empty station list. Source timestamps are normalized before display.

## Run on your phone

```powershell
npm install
npx expo start
# If local network discovery fails:
npx expo start --tunnel
```

Scan the terminal QR code on your iPhone and open Expo Go. If a project server is already running, use its existing session. Preserve SDK-compatible package versions; use `npx expo install` when adding packages. Do not run the starter reset again.

## Code map

| File | Responsibility |
| --- | --- |
| `src/api/citybikes.ts` | API/station interfaces, validation, HTTPS request, timeout and errors |
| `src/state/stations.ts` | Shared session cache, request deduplication, refresh transitions and cooldown |
| `src/hooks/use-stations.ts` | React subscription, initial load and local age-label clock |
| `src/app/index.tsx` | Station FlatList, stable ID keys, loading/empty states and pull-to-refresh |
| `src/app/station/[id].tsx` | Resolve route ID against shared real data; detail, missing-station and cold-link states |
| `src/components/StationCard.tsx` | Reusable station card receiving data and selection callback via props |
| `src/components/` | Shared availability counts, action buttons, data status, empty/loading messages and attribution |
| `src/utils/station-display.ts` | Availability and age labels |
| `src/constants/theme.ts` | Existing palette, typography, spacing, radius and touch-target tokens |

Phase 3 changed files:

- `src/app/index.tsx`, `src/app/station/[id].tsx`: Explore controller, selection, mode emphasis and directions.
- `src/utils/explore.ts`: pure mode/filter/search/sort/selection logic, coordinate validation and directions URL.
- `src/components/ExploreScreen.tsx`, `SegmentedControl.tsx`: accessible Explore controls and Map/List layouts.
- `src/components/StationMap.native.tsx`, `StationMap.tsx`, `StationMap.types.ts`: native map, explicit web fallback and shared props.
- `src/components/StationPreview.tsx`, `DirectionsButton.tsx`: selected-station actions and external directions.
- `src/components/StationCard.tsx`, `AvailabilityCount.tsx`, `ActionButton.tsx`, `DataStatus.tsx`, `SourceCredit.tsx`: mode emphasis, selected state and compact/secondary variants.
- `tests/explore.test.cjs`, `tests/ui.test.cjs`: new coverage and adapted existing list-wiring test.
- `package.json`, `package-lock.json`: map dependency; `PLAN.md`, `USERFLOW.md`, `CHECKLIST.md`, `README.md`: current scope and handoff.

The existing API/cache/hook, Router layout, theme tokens, `AGENTS.md` and `MOODBOARD.md` were preserved. No second fetching system was added.

## Fetching and caching

The sole station endpoint is https://api.citybik.es/v2/networks/velo-antwerpen. No API key, custom backend or login is required.

The in-memory cache is shared across list and detail. Fresh data is reused for 60 seconds. Manual refresh bypasses freshness, with a minimum 15-second request interval and in-flight deduplication to avoid repeated requests. Requests time out after 12 seconds. HTTP 429 honours Retry-After (at least 60 seconds). Local age/cooldown labels update without network requests; there is no polling.

A failed refresh retains the last successful response and labels it as cached. Fetch time is separate from the source's station timestamp. Detail screens warn when source data is more than five minutes old. Missing source timestamps remain unavailable. Cached data is lost when the process restarts; persistent offline storage is outside this phase.

[CityBikes API documentation](https://docs.citybik.es/api/v2), [public usage limits](https://docs.citybik.es/api/) and [attribution terms](https://docs.citybik.es/api/tos) were checked on 2026-11-24. The documented public limit is 300 requests/hour. The app includes a visible link to CityBikes. Availability can change; RIDE cannot reserve bikes or docks.

## Validation

```powershell
npm test
npx tsc --noEmit
npx expo install --check
npx expo export --platform ios --platform android --output-dir .expo/phase32-export
```

Phase 2 baseline verified on 2026-11-24 (Phase 3 results are above):

- 16 automated tests passed: malformed/partial responses, missing values, zero bikes/docks, empty responses, timestamp normalization, HTTP/network/JSON/timeout failures, rate-limit cooldown, request deduplication, cache reuse and recovery.
- UI tests passed for loading/error/empty rendering, zero and unknown counts, cached results, retry and pull-to-refresh callback wiring, station selection, missing IDs and selected-station detail data.
- Live HTTPS parsing returned 323 stations, zero skipped records and 323 normalized timestamps. Live counts change over time.
- TypeScript and Expo dependency checks passed; iOS and Android JavaScript/Hermes bundles exported successfully.

Tests use Node's built-in test runner and the existing TypeScript compiler. UI tests render through React Native Web with navigation/safe-area test adapters. They do not establish native gesture behaviour, actual safe-area layout or accessibility performance on a phone. No new testing dependencies were installed.

## Phone verification still required

1. Open Expo Go: confirm the live list loads, scroll to later stations and check notch/home-indicator clearance.
2. Select several stations, including zero-bike/zero-dock stations when present. Confirm name/counts match the selected card and that address and source time appear; expand Technical information for coordinates. Return to the list.
3. After the 15-second cooldown, pull down to refresh. Existing cards should remain visible while refreshing.
4. Load stations, disconnect the phone from the internet and refresh. Cached cards should remain with an error and cached-data notice. Restore connectivity and retry after the cooldown. If using Expo Go over a tunnel, cached runtime connectivity may affect this test.
5. Test an offline first launch, an unknown station ID, large system text and VoiceOver. Check disabled retry states, tap targets and scrolling. Empty/invalid-response states are covered by fixtures; do not rely on the live API becoming empty.
6. Verify Android separately. These bundle checks do not substitute for a native build or physical-device tests.

Optional GPS/locate-me, persistent favourites, Supabase and authentication remain outside this implementation slice. No commits or pushes were made automatically. See `CHECKLIST.md` for completed and pending assignment work.

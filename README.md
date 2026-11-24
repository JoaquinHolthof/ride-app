# RIDE — Velo Antwerpen

A mobile-first React Native / Expo app for AP University's Minor Visual Code assignment. Built with Expo SDK 58, Expo Router and TypeScript, using the original carbon/forest/electric-lime design in `MOODBOARD.md`.

## Phase 3: Explore map and modes

### Phase 3.1 — iPhone layout and clustering correction

The user confirmed the app runs in iPhone Expo Go and reported header scrolling/overlap and severe pin congestion. The corrected layout still requires a fresh device check.

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

Each station card shows available bikes, free docks and explicit availability text. Tap a card to open `/station/[id]` with that station's actual counts, street address when provided, coordinates and source update time. Both screens support manual refresh and show loading/error recovery states.

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
npx expo export --platform ios --platform android --output-dir .expo/phase31-export
```

Phase 2 baseline verified on 2026-11-24 (Phase 3 results are above):

- 16 automated tests passed: malformed/partial responses, missing values, zero bikes/docks, empty responses, timestamp normalization, HTTP/network/JSON/timeout failures, rate-limit cooldown, request deduplication, cache reuse and recovery.
- UI tests passed for loading/error/empty rendering, zero and unknown counts, cached results, retry and pull-to-refresh callback wiring, station selection, missing IDs and selected-station detail data.
- Live HTTPS parsing returned 323 stations, zero skipped records and 323 normalized timestamps. Live counts change over time.
- TypeScript and Expo dependency checks passed; iOS and Android JavaScript/Hermes bundles exported successfully.

Tests use Node's built-in test runner and the existing TypeScript compiler. UI tests render through React Native Web with navigation/safe-area test adapters. They do not establish native gesture behaviour, actual safe-area layout or accessibility performance on a phone. No new testing dependencies were installed.

## Phone verification still required

1. Open Expo Go: confirm the live list loads, scroll to later stations and check notch/home-indicator clearance.
2. Select several stations, including zero-bike/zero-dock stations when present. Confirm name/counts match the selected card and that address, coordinates and source time appear. Return to the list.
3. After the 15-second cooldown, pull down to refresh. Existing cards should remain visible while refreshing.
4. Load stations, disconnect the phone from the internet and refresh. Cached cards should remain with an error and cached-data notice. Restore connectivity and retry after the cooldown. If using Expo Go over a tunnel, cached runtime connectivity may affect this test.
5. Test an offline first launch, an unknown station ID, large system text and VoiceOver. Check disabled retry states, tap targets and scrolling. Empty/invalid-response states are covered by fixtures; do not rely on the live API becoming empty.
6. Verify Android separately. These bundle checks do not substitute for a native build or physical-device tests.

Optional GPS/locate-me, persistent favourites, Supabase and authentication remain outside this implementation slice. No commits or pushes were made automatically. See `CHECKLIST.md` for completed and pending assignment work.

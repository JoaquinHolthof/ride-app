# RIDE — Velo Antwerpen

A mobile-first React Native / Expo app for AP University's Minor Visual Code assignment. Built with Expo SDK 58, Expo Router and TypeScript, using the original carbon/forest/electric-lime design in `MOODBOARD.md`.

## Current feature

Open RIDE to see Velo Antwerpen stations. Each card shows available bikes, free docks and explicit availability text. Tap a card to open `/station/[id]` with that station's actual counts, street address when provided, coordinates and source update time. Both screens support manual refresh and show loading/error recovery states.

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
npx expo export --platform ios --platform android --output-dir .expo/phase2-export
```

Verified on 2026-11-24:

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

Maps, GPS, mode selection, search, favourites, Supabase and authentication remain outside this implementation slice. No commits or pushes were made automatically. See `CHECKLIST.md` for completed and pending assignment work.

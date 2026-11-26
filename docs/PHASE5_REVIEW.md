# Phase 5 review — 26 November 2026

## Delivered behaviour

- One protected Expo Router JS tab shell: **Explore / Saved / Account**. Explore and Saved each have a stack, so station details retain the tabs and Back returns to the originating screen. Existing public URLs remain `/`, `/saved`, `/account` and `/station/[id]`; explicit route groups select the correct detail stack. Auth/callback routes remain outside the shell.
- Explore keeps mode, search, filters and camera state while switching tabs. Its header now contains RIDE, secondary Map/List and the prominent Bike/Dock control. The bar owns bottom/side safe-area padding; screens own top/side padding. It hides while typing and the iOS list uses keyboard avoidance.
- Bookmark icons beside names in preview, details and Saved use the **existing account-scoped store**. Outlined/filled means confirmed unsaved/saved; unknown/loading uses a spinner. Writes are disabled during an outstanding mutation; failures preserve confirmed state, announce an error and offer bookmark retry.
- Default marker titles/descriptions are removed. Native station pins, selection ring, cluster badges, counts and accessible descriptions remain; RIDE's bounded, scrollable preview is the primary selection UI.
- Details prioritize name/bookmark, 64pt counts and Get Directions. Positive availability is no longer repeated below the counts; closed, unknown and zero states, address, source time, stale warning, technical information and attribution remain.
- A small map status chip opens refresh/retry/source information; list/detail use a compact status row with a 44pt refresh action. No API polling, data cache, auth, SQL or favourites ownership logic was changed.

## Freshness and offline semantics

Fresh requires a fetch less than 60 seconds old and known station source timestamps no more than five minutes old. Any old source record makes the aggregate indicator conservative; missing source timestamps use neutral “Source time unknown”. Cached/source-old states use amber or neutral grey, never the fresh lime dot. Loading is neutral; connection and HTTP/service failures are amber and cached responses remain explicitly marked.

“Connection issue” covers offline/unreachable-network fetch failures. There is no connectivity probe, so it does **not** assert that airplane mode is active. Status wording distinguishes this from other failures. The source timestamp in a station detail is separate from the HTTP fetch timestamp.

## Validation

- `npm test`: **97 passed, 0 failed**, including auth/callback/storage regressions, actual local PostgreSQL RLS tests, account-boundary races, CityBikes/cache/clusters, bookmark actions, navigation events, safe-area ownership, and fresh/stale/loading/error colours.
- `npx tsc --noEmit`: passed, after Expo regenerated ignored route types for the new groups.
- `npx expo install --check`: dependencies up to date.
- `npx expo export --platform ios --platform android --output-dir .expo/phase5-final-export`: both Hermes bundles passed.
- `git diff --check`: passed.
- **No dependencies added.** Reused installed SDK 58 Expo Router and `expo-symbols`. No signed native build, remote SQL/provider change, commit or push.
- UI tests render through React Native Web with native adapters; they do not prove on-device rendering, safe-area geometry, map gestures or VoiceOver. Physical iPhone/Android checks below remain pending.

Implementation references: [SDK 58 Router](https://docs.expo.dev/versions/v58.0.0/sdk/router/), [JS tabs](https://docs.expo.dev/router/advanced/tabs/), [shared routes](https://docs.expo.dev/router/advanced/shared-routes/), [SDK 58 symbols](https://docs.expo.dev/versions/v58.0.0/sdk/symbols/), [installed maps 1.29.11 marker behaviour](https://github.com/react-native-maps/react-native-maps/blob/v1.29.11/docs/marker.md).

## Exact file manifest

Moved and edited:

- `src/app/index.tsx` → `src/app/(tabs)/(explore)/index.tsx`
- `src/app/saved.tsx` → `src/app/(tabs)/(saved)/saved.tsx`
- `src/app/account.tsx` → `src/app/(tabs)/account.tsx`
- `src/app/station/[id].tsx` → `src/screens/StationDetailScreen.tsx`

Added:

- `src/app/(tabs)/_layout.tsx`
- `src/app/(tabs)/(explore)/_layout.tsx`
- `src/app/(tabs)/(explore)/station/[id].tsx`
- `src/app/(tabs)/(saved)/_layout.tsx`
- `src/app/(tabs)/(saved)/station/[id].tsx`
- `src/components/RideIcon.tsx`
- `src/components/RideTabBar.tsx`
- `src/utils/data-status.ts`
- `tests/polish.test.cjs`
- `docs/PHASE5_REVIEW.md`

Updated:

- `src/app/_layout.tsx`
- `src/components/AvailabilityCount.tsx`
- `src/components/DataStatus.tsx`
- `src/components/ExploreScreen.tsx`
- `src/components/MapDataPanel.tsx`
- `src/components/SaveStationButton.tsx`
- `src/components/SavedScreen.tsx`
- `src/components/SegmentedControl.tsx`
- `src/components/StationCard.tsx`
- `src/components/StationMap.native.tsx`
- `src/components/StationPreview.tsx`
- `src/constants/theme.ts`
- `tests/auth-ui.test.cjs`
- `tests/explore.test.cjs`
- `tests/favourites-ui.test.cjs`
- `tests/map-layout.test.cjs`
- `tests/register.cjs`
- `tests/ui.test.cjs`
- `README.md`, `PLAN.md`, `USERFLOW.md`, `MOODBOARD.md`, `CHECKLIST.md`

Generated bundle/test logs and route types stay inside ignored `.expo/`.

## iPhone acceptance checklist

Start with `npx expo start --clear` and an SDK 58-compatible Expo Go installation for email-authenticated UI testing. Use a RIDE development build for Google/native auth callbacks; the exact prerequisites and commands remain in [AUTH_SETUP.md](AUTH_SETUP.md). This phase adds no native dependencies or distribution changes.

1. **Session/navigation:** log in; see only one bottom bar. Switch Explore → Saved → Account → Explore. Confirm mode/search/filter/camera/selection survive. Open details from both Explore and Saved; check Back and iOS swipe-back return to the correct origin, with tabs still present. Open a cold station link and confirm a usable Back fallback.
2. **Map:** pan/zoom clusters, select and close a station preview; confirm no default white Apple callout, no unexpected camera jump and no scroll conflict. Filter in List, return to Map, select a station, change Bike/Dock mode. Try a long station name and maximum text size.
3. **Bookmarks:** save/unsave from preview, details and Saved; verify immediate confirmed-state consistency, disabled/busy feedback during requests, persistence after an online restart, and an empty-list Explore action. Test missing station data without fabricated counts.
4. **Data/network:** open the small chip and CityBikes attribution. Check refresh, cooldown, pull-to-refresh, old source timestamps and unknown counts. With cached stations, enable airplane mode and refresh: counts remain with an amber connection/cached state. Attempt a save: failure is visible, confirmed state stays unchanged. Reconnect/retry. Test first-load failure separately.
5. **Accessibility/layout:** test a small iPhone and a home-indicator iPhone, portrait/landscape, standard and largest Dynamic Type. Verify 44pt controls, wrapping names/tab labels, scrollable detail content above the bar, keyboard search results, clear selected/pressed states, VoiceOver bookmark labels/selected/busy/error feedback and marker/list alternatives.
6. **Account isolation/regression:** sign out while a favourites request is in flight; confirm login replaces all protected routes. Sign in as a second account and confirm no first-account Saved items flash. Repeat online restart, email signup/login and directions. Run Google cancellation/success only in a configured development build.

Remote prerequisites remain manual: [favourites migration and two-account RLS verification](FAVOURITES_SETUP.md), and [Supabase email/Google dashboard setup](AUTH_SETUP.md). Phase 5 does not establish whether those hosted settings have been applied.

Suggested commit after review: `feat: polish RIDE navigation and station interactions`. No commit was made.

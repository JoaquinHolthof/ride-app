# RIDE — Course-compliant checklist

Sources: AP Hogeschool Minor Visual Code, Lesson 06 (Plan an App), Lesson 07 (React & React Native), plus supplied final assignment brief.

Status: [x] drafted / [ ] requires work or physical verification. Mark complete only after evidence exists.

## Phase 1: Concept BEFORE code (Lesson 06 pp. 23–29)
- [x] Define target user and situation (student/resident, street, hurry, one hand).
- [x] Define one clear core task (find bike or dock and inspect live numbers in ten seconds).
- [x] Specify 3–5 core screens and the API fields each needs.
- [x] Draw userflow for borrow, return, favourites, permission denied and errors.
- [x] Design first-open, loading, empty and error states in `PLAN.md`.
- [x] Write `PLAN.md` with persona, task, API, screens, states and design direction.
- [ ] Assemble a genuine visual moodboard including actual UI references (not merely a palette).
- [x] Create first Figma screen concepts; [ ] review final visuals and complete missing states.

## Phase 2: API (Lesson 06 pp. 13–21, 46)
- [x] Select CityBikes `velo-antwerpen` and record endpoint/documentation.
- [x] Identify expected JSON fields: station ID, name, coordinates, free bikes, empty slots, timestamp.
- [x] Verify the endpoint over HTTPS and parse a live response; test HTTP/network/invalid-response failures with fixtures (2026-11-24).
- [x] Confirm current usage and attribution terms; cite data source in app with a CityBikes link.
- [ ] Show instructor concept, docs, working endpoint and fields; bring `PLAN.md`, phone, starter.

## Phase 3: Expo starter (Lesson 06 pp. 30–45)
- [ ] Confirm Node LTS, Expo Go and installed SDK compatibility with current official docs.
- [ ] Create a NEW Expo project in `ride-velo-antwerpen` (not ATMOS).
- [ ] Inspect `app`/`src/app`, `_layout.tsx`, `assets`, `package.json`.
- [ ] Edit text on the first screen and observe Fast Refresh on a real phone.
- [ ] Reset starter ONCE using `npm run reset-project` before adding custom screens (if template supports it).
- [ ] Use an Expo Image example from official docs and check package compatibility.
- [ ] Stop/restart dev server, scan again and confirm RIDE appears.
- [ ] Commit the working starter.

## Phase 4: React Native + data (Lesson 07 pp. 14–34)
- [x] Use small reusable function components and props.
- [x] Keep state with hooks and avoid direct DOM manipulation.
- [x] Fetch and display all valid stations in a `FlatList` with stable station IDs.
- [x] Show name, free bikes and empty slots; include loading, error/retry and pull-to-refresh (automated state/wiring checks; native gesture verification pending).
- [x] Provide a separate station detail route with bike and parking counts from the selected station.
- [x] Explain where fetch, state and list live in the project (README).
- [x] Implement the two-mode RIDE flow; name search, availability filters and list fallback (automated checks; phone verification below).

## Phase 5: Optional extra + review (Lesson 07 pp. 35–59)
- [ ] Add local favourites with persistence on phone; test after a restart.
- [ ] Test offline/stale, zero availability, no GPS permission and network failure.
- [ ] Decide with instructor whether optional Supabase exercises (email, Google, database favourites) are expected in the final project. Assignment working brief explicitly says no backend/login; do not add by default.
- [ ] Create `AGENTS.md` (provided) and commit after each working step.
- [ ] Bring the running app on a phone for design review.
- [ ] Check font size >=16pt for body except deliberate exceptions; touch targets >=44pt.

## Phase 6: Final assignment hand-in
- [ ] New GitHub repository; multiple meaningful feature commits.
- [ ] Push source; if private, add collaborator `wimva`.
- [ ] Ensure `PLAN.md`, userflow, moodboard, attribution and README are included.
- [ ] Export full code as ZIP with NO `node_modules` and no secrets.
- [ ] Prepare slide presentation and demo video.
- [ ] Stop committing after the submission deadline (instructor instruction).

## Phase 2 implementation validation — 2026-11-24
- [x] `npx tsc --noEmit` and `npx expo install --check` pass; no dependencies added.
- [x] `npm test`: 16 passing tests for parsing, invalid/missing fields, zero counts, empty data, request errors/timeouts, caching, deduplication, rate-limit cooldown, recovery and rendered list/detail states.
- [x] Live API parser: 323 stations, zero skipped, 323 valid normalized source timestamps. Counts are a point-in-time observation.
- [x] iOS and Android production JavaScript/Hermes bundle export succeeds via `npx expo export --platform ios --platform android --output-dir .expo/phase2-export`.
- [x] Basic session-memory cache: 60-second reuse, deduplicated in-flight requests, at least 15 seconds between requests, retained cached results on failure, no polling.
- [x] Code uses 16pt-or-larger labels/body text and 44pt-or-larger interactive targets.
- [ ] Verify on iPhone: live list, scrolling, safe areas, large text, VoiceOver, selecting stations and back navigation.
- [ ] Verify native pull-to-refresh, offline/cached messaging, retry after cooldown and direct detail links on phone.
- [ ] Verify Android device behaviour. Bundle success is not physical-device validation.

The automated UI tests render through React Native Web and inspect event wiring; they do not simulate iOS/Android touch gestures or safe-area insets. Session cache does not persist after process termination. No commits or pushes were made in this phase.

## Phase 3 implementation validation — 2026-11-24
- [x] Re-read project guidance, inspect the cache/UI/tests, and update implementation plan before coding.
- [x] Verify SDK 58 map compatibility in official Expo docs and installed SDK metadata; install `react-native-maps` 1.29.11 using `npx expo install`.
- [x] Real native cartography: default Apple Maps on iOS / Google Maps on Android, pins at validated API coordinates, selected-station preview and existing detail navigation.
- [x] Find a bike / Find a dock changes sorting, primary counts, availability filtering and marker labels/colours. Unknown, zero and closed remain distinct.
- [x] Local station-name search, All / Available / Zero / Unknown filters, empty-search recovery, Map / List switch and list pull-to-refresh.
- [x] Preserve shared API/cache, error recovery, cached-data labels, CityBikes attribution and detail information.
- [x] Native pins without custom marker children; memoized map and sorted results; virtualized list. No new API polling.
- [x] Directions use actual destination coordinates, handle missing coordinates/open failures, and request no RIDE location permission.
- [x] `npm test`: all 27 tests pass, including 11 new Explore/model/native-marker-adapter tests.
- [x] TypeScript and Expo dependency checks pass; iOS and Android Hermes exports succeed.
- [ ] Physically verify iPhone Expo Go: map tiles, pan/zoom, marker selection, modes, search/filter, preview, detail/back navigation, directions, safe areas and large text.
- [ ] Check VoiceOver and native marker touch accessibility; list remains the full accessible alternative.
- [ ] Verify offline map/list fallback, recovery and performance with the live 300+ station network on iOS/Android.
- [ ] Native map performance is not established by mocked marker tests or successful bundles.
- [ ] Browser visual preview: unavailable because the computer-use browser host could not be reached. Browser UI states are covered by automated rendering tests only.
- [ ] Figma concept comparison: MCP Starter-plan call limit blocked reading frames. Supplied moodboard and existing tokens used; no pixel-match claim.
- [ ] Optional locate-me and permission-denial UI remain deferred; the app currently requests no location permission and never invents a user position.
- [ ] Android standalone/store Maps API configuration remains a later distribution task. Expo Go requires no app key; no secrets were added.

No Git commit or push was created during Phase 3. Web uses the real station list and an explicit native-map availability message, never a schematic map substitute.

## Phase 3.1 iPhone layout correction — 2026-11-24
- [x] Record user-confirmed iPhone Expo Go run and reported header/map overlap and overcrowding. No device screenshot was supplied or found locally.
- [x] Replace percentage-height scrolling map header/footer with fixed compact controls and a flex map viewport; move search/filters to List.
- [x] Keep only deliberate map overlays: compact data access and a bounded selected-station preview, with native map padding for the preview.
- [x] Add dependency-free viewport/zoom clustering, exact individual coordinates, selected-pin separation and close/coincident member selection.
- [x] Live initial-view check: 323 stations represented by 40 markers (34 clusters + 6 pins), approximately 1.3ms grouping on development machine.
- [x] Preserve Bike/Dock modes, search/filters, station details, directions, refresh/cache/error behaviour and attribution.
- [x] Investigate blue gear: no RIDE component; Expo native source uses a blue circular gear in its floating Tools window. Development tools unchanged. Exact screenshot comparison remains unavailable.
- [x] All 37 automated tests, TypeScript and Expo dependency checks pass; iOS/Android Hermes bundle exports pass.
- [ ] Retest corrected layout on iPhone: no header scrolling under map, safe areas, Dynamic Type, preview interactions and map gestures.
- [ ] Verify native cluster badge snapshots, zoom expansion, selection, VoiceOver and frame rate; automated tests do not establish native rendering performance.
- [ ] Confirm reported gear opens Expo Tools on the user's device; no production build was inspected.

No new packages, commits or pushes in Phase 3.1. See README for cause, changes, source links and exact device steps.

## Phase 3.2 mobile UI polish — 2026-11-24
- [x] Record user confirmation that the previous iPhone scrolling issue is resolved; retain the flex map with no outer ScrollView.
- [x] Compact branding and Map/List/Bike/Dock controls; keep minimum 44 pt targets, safe areas, text scaling and wrapping.
- [x] Replace two-line cluster badges with count-only forest/lime badges; preserve geographic grouping, zoom/member chooser and mode/availability logic.
- [x] Strengthen selected-pin ring and accessibility labels; retain bounded marker snapshots, renewed on font-scale changes.
- [x] Reorder station details around real counts and primary Get Directions; keep address/source time, collapse technical coordinates and reduce whitespace.
- [x] Add pressed feedback and distinct disabled treatment; preserve search/filter, list/detail, directions, refresh/cache/error states and attribution.
- [x] All 39 tests pass, including existing regressions and new cluster/technical-information coverage.
- [x] TypeScript and Expo dependency compatibility checks pass; iOS and Android Hermes exports succeed (`.expo/phase32-export`).
- [x] Update PLAN, USERFLOW and README with scope, changes, evidence and phone test steps. No new dependencies, development-tool changes, commits or pushes.
- [ ] Verify the new header and badge appearance on iPhone, with small screens, long names and larger Dynamic Type sizes.
- [ ] Verify marker tapping, cluster zoom/member chooser, selected ring, preview, native snapshots and performance with 300+ stations.
- [ ] Verify VoiceOver selection/disclosure announcements, expand/collapse interaction, Get Directions, pressed/disabled states and offline recovery on device.
- [ ] Repeat native checks on Android; bundle exports and adapter tests do not constitute physical-device verification.

## Phase 4.1 Supabase email authentication — 2026-11-24
- [x] Apply the user's explicit auth scope, superseding the initial no-auth restriction; read guidance and verify official Supabase/SDK 58 docs.
- [x] Validate both public environment variables without printing values; reject secret/service-role credentials; keep `.env.local` ignored and untracked.
- [x] Shared client, native SecureStore adapter for large/Unicode payloads, serialized atomic manifest updates, sanitized failures and no plaintext persistence.
- [x] Branded login/signup, loading, confirmation guidance, auth errors and Account/sign-out screens; keyboard-aware scrolling, safe areas and 44 pt buttons.
- [x] Restore sessions before route access, subscribe to auth events, prevent stale restoration races, manage foreground refresh and clean up listeners.
- [x] Guard Explore, station details and Account with Expo Router; signed-out users cannot navigate into those routes. Existing app functionality remains behind login.
- [x] Read-only public Auth settings check: HTTP 200, email/signup enabled, confirmation required. No live test accounts/emails or dashboard changes.
- [x] All 56 tests pass, including 17 focused auth/storage/navigation tests and an installed-SDK integration against mock HTTP responses.
- [x] TypeScript and Expo dependency compatibility pass; iOS/Android Hermes exports pass.
- [x] Record unchanged audit findings: 3 moderate, 0 high/critical; do not apply the proposed Expo downgrade.
- [x] Document changes, install additions, dashboard/email settings and iPhone instructions. No tables, OAuth, favourites database, commits or pushes.
- [ ] Verify owned HTTPS Site URL, confirmation email template and SMTP/delivery settings in Supabase Dashboard.
- [ ] Complete real email signup/confirmation/login and failure cases on iPhone Expo Go.
- [ ] Verify secure persistence across force-close/reopen, foreground refresh, sign-out/restart, protected deep links and cleared back history on device.
- [ ] Check keyboard, Dynamic Type, VoiceOver, offline recovery and the full CityBikes map/list/detail flow on iPhone and Android.

## Phase 4.2 email redirects and Google OAuth — 2026-11-25
- [x] Record user-confirmed Phase 4.1 iPhone email/signup/login, confirmation, secure persistence, protected routes and working map/details. Remaining Phase 4.1 device checkboxes above are historical, not a denial of that confirmation.
- [x] Read project guidance, audit auth/client/routes/storage/dependencies, retain approved moodboard, and update PLAN/USERFLOW before implementation.
- [x] Verify current official Supabase PKCE/mobile/Google/redirect docs and exact SDK 58 WebBrowser/Crypto docs; preserve existing `rideapp` scheme.
- [x] Native PKCE email redirect, callback parsing, error/recovery states, cold/warm native-intent sanitization, shared duplicate processing and existing-session protection.
- [x] RIDE-styled Google action, system auth browser, Supabase code exchange, cancellation/provider-failure handling; Expo Go/web OAuth blocked with guidance.
- [x] Secure native PKCE randomness/SHA-256 using Expo Crypto; existing SecureStore adapter, auth lifecycle, email/password login and route guards retained.
- [x] Explicit Expo Go HTTPS signup redirect configuration and supplied static landing artifact; no LAN addresses, fake deployment or disabled email confirmation.
- [x] Document precise Google Cloud/Supabase settings, hosting requirements, same-installation/latest-link limits and iOS build prerequisites/commands without executing builds.
- [x] `npm test`: **71 passing tests** (56 existing + 15 new), covering OAuth request/cancel/error paths, strict callback parsing, cold/warm intent sanitization, duplicate/conflicting callbacks, email redirect regression, hosted-page credential removal and installed-SDK S256 exchange through secure persistence across restart.
- [x] `npx tsc --noEmit`, `npx expo install --check` and `git diff --check` pass. `expo-crypto` ~58.0.8 is the only added dependency; no unrelated package updates.
- [x] iOS and Android JavaScript/Hermes exports succeed in `.expo/phase42-export`; signed native build/device verification remains pending below.
- [ ] Host `docs/auth-confirmation/index.html`, configure owned HTTPS Site URL/allowlist/environment, and verify new email confirmation in Expo Go.
- [ ] Configure Google Web OAuth client and Supabase provider/redirect allowlist manually; keep secrets solely in dashboards.
- [ ] Create/install iOS development build and verify cold/warm callbacks, Google success/cancel/errors, email regressions, restart persistence, protected routes and CityBikes flows.
- [ ] Verify native behaviour/appearance/accessibility on Android as well. No physical-device Phase 4.2 verification claimed.

No tables, favourites database, remote configuration changes, native builds, commits or pushes were created.

## Phase 4.3 Supabase Saved stations and RLS — 2026-11-25
- [x] Read planning/auth/station architecture and both Supabase skills; preserve approved moodboard and update current scope before coding.
- [x] CLI-created migration `supabase/migrations/20261125162038_create_user_favourites.sql`: owner UUID + station ID, composite primary key, auth-user cascade, nonblank-ID constraint, enabled/forced RLS, separate ownership SELECT/INSERT/DELETE policies and least-privilege grants.
- [x] API separates Supabase calls/parsing from UI, verifies expected user, paginates without relying on server row caps, acknowledges writes, handles duplicates without UPDATE and sanitizes errors.
- [x] Per-account in-memory store, immediate keyed account boundary, request cancellation and late-response rejection; no disk cache, offline queue or private data shared across users.
- [x] Save/Unsave in details/selected previews; protected Saved route and Explore shortcut; live/zero/unknown counts from existing CityBikes cache, removable missing IDs, loading/empty/stale/error states and pull-to-refresh.
- [x] Deliver SQL Editor preflight/application/readback instructions and a manual two-account JWT test script with temporary rows/cleanup. Neither remote SQL nor the hosted test script was run.
- [x] **93 tests pass** (71 existing + 22 new, including nested Postgres checks): actual migration/RLS/grants, two simulated account roles, duplicate/FK constraints, API validation/pagination, cancelled/stale requests, account-boundary and Saved UI states.
- [x] `npx tsc --noEmit`, `npx expo install --check`, manual-script syntax check and `git diff --check` pass.
- [x] iOS and Android JavaScript/Hermes exports pass in `.expo/phase43-export`. These are bundle checks, not signed native builds or device verification.
- [ ] Owner manually applies migration and verifies Data API exposure, policies, constraints and grants in the intended project.
- [ ] Run hosted two-account SELECT/INSERT/DELETE attacks and own-write/duplicate/anonymous tests with dedicated confirmed accounts.
- [ ] On iPhone/Android, verify save/unsave across preview/details/Saved, online restart persistence, account switching during requests, offline failure/recovery, missing station IDs, accessibility and map/auth regressions.

Only test tooling was added (`@electric-sql/pglite` 0.6.0 dev dependency). No runtime/native dependencies, hosted database changes, commits or pushes.

## Useful commands
```powershell
npx create-expo-app@latest ride-velo-antwerpen
cd ride-velo-antwerpen
npx expo start
# campus Wi-Fi / device discovery problems:
npx expo login
npx expo start --tunnel
# after adding a dependency (compatible with installed SDK):
npx expo install <package>
npx expo install --check
```

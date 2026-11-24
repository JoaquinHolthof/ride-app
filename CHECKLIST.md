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
- [ ] Implement the two-mode RIDE flow; search and list fallback.

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

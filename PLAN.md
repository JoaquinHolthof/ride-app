# RIDE — Velo Reimagined

## Assignment
Minor Visual Code (2026–2027), Option 1: Velo Antwerpen. React Native / Expo. A fresh UI (do not reuse original Velo Antwerpen styling). Every station needs a dedicated details screen showing available bikes and parking spots. No custom backend or mandatory login.

## One-line concept
**RIDE. — Find a bike. Find a dock. Keep moving.** A two-mode urban mobility app designed around the actual decision a rider needs to make next, not around a default map or list.

## Target users and contexts
- Students and city residents in Antwerp, often outdoors, in a hurry, using one hand.
- Borrowing: locate a station with a bike quickly.
- Returning: locate a station with an available dock quickly.
- Need to know the source update time and be able to retry if availability changes.

## Core task
Within 10 seconds, choose **Find a bike** or **Find a dock**, discover a suitable station, and view its live counts.

## Key UX decision
The first screen presents two explicit goals. A station's visibility and ordering depend on the selected mode; never imply that availability is guaranteed, or that the API can reserve a bicycle.

## Screens
1. **Home / Choose mode** — Find a bike or Find a dock; quick shortcut to recently used/favourite stations.
2. **Explore / Map & list** — map with station pins, segmented modes, search by station, nearby sorting (with permission); no-location fallback to all stations.
3. **Station Details** — station name, available bikes (`free_bikes`), free docks (`empty_slots`), last data timestamp, favourite toggle, open directions, and availability status. Required for every station via dynamic route `station/[id]`.
4. **Saved** — favourite stations persisted on device, up-to-date counts when online.
5. **Settings / About** — location permissions guidance, data-source acknowledgement, freshness and limitations.

## Full user flows
### A. Borrow a bike
Launch → Home → Find a bike → Explore (stations filtered/sorted for bikes) → Station pin/card → Station Details → Open directions (external map) → return to app.

### B. Return a bike
Launch → Home → Find a dock → Explore (stations filtered/sorted for free docks) → Station pin/card → Station Details → Open directions.

### C. Save a station
Station Details → Tap save → Saved → Select saved station → Station Details. Save only the station ID in local storage.

### D. No location permission
Launch → deny permission → Antwerp-wide map/list still works → optional manual list search → Station Details.

### E. No bikes or docks
Current mode → no stations fulfilling chosen criteria → explain situation, offer other stations/list, switch mode or refresh. Display zero explicitly, not as an absent value.

### F. Network error
App fetch fails → explain weather/data is unavailable (use bike-data wording) → retry action; if cached stations exist, show cached data labelled with its timestamp.

## API documentation
- Base: `https://api.citybik.es/v2/`
- Velo network: `https://api.citybik.es/v2/networks/velo-antwerpen`
- Data: `network.stations[]` containing `id`, `name`, `latitude`, `longitude`, `free_bikes`, `empty_slots`, `timestamp` (some fields/extra vary).
- Source: https://docs.citybik.es/api/v2
- Public API limit: 300 requests/hour; do not poll unnecessarily. Cache results and provide pull-to-refresh and timestamp.
- Attribution required by CityBikes; link to https://citybik.es within the app.
- No station reservation or guaranteed availability promised.

## UI States
First load, loading, success, zero bikes, zero docks, empty search, failed request, offline cached, invalid/stale station, location denied, no favourites. State must be visible and provide useful recovery.

## Look and feel / moodboard
**Urban editorial / street utility / high-contrast transit graphic design.** Original branding distinct from current Velo Antwerpen.
- Colors: carbon `#101512`, dark forest `#1D2620`, acid-lime `#D8FF6A`, warm white `#FAF8EE`, muted mint `#A5B5A6`.
- Typography: oversized condensed-feeling display hierarchy and clean readable UI sans-serif; implementation should use available licensed fonts.
- Visual language: high-contrast availability counts, bold segmented mode switch, dark map, large buttons, restrained motion.
- Avoid: reproducing Velo's original colors, UI conventions, and navigation sequence.
- Reference Figma: https://www.figma.com/design/WLLdGhsuiJPZy6fQiHIlPU
- NOTE: Initial Figma map is an illustrative vector graphic, **not** a geographically accurate map; actual implementation must use real station coordinates on a real map or accurate list.

## Architecture proposal (after design approval)
- Expo Router + TypeScript
- API client in `src/api/citybikes.ts`, with input validation and refresh handling
- Shared state for selected mode, station data, loading/error, timestamp
- `src/components/StationCard`, `AvailabilityCount`, `ModeSwitch`, `MapStationPin`
- Map implementation after checking Expo Go-compatible map SDK for both platforms; provide list fallback
- AsyncStorage for favourites
- Optional expo-location permission; never block core usage
- External navigation link using OS maps
- No backend or auth

## Priorities
### Current implementation slice: Explore map and modes
- Phase 3.1 corrects confirmed iPhone issues: remove the percentage-height scrolling panels around the map; use a fixed compact header/mode control and a `flex: 1` map viewport. Search/filter UI lives in List. A deliberate bounded preview overlays the map only when selected; full data/refresh/attribution opens in a modal.
- Reduce pin congestion with a dependency-free, viewport-aware Web Mercator grid clusterer in TypeScript. Cluster badges represent groups, never relocated individual stations. Recompute after completed camera gestures; tap groups to zoom, and offer a member chooser for coincident/very close points. Individual station coordinates and selection remain exact.
- Keep selected stations outside their cluster with native pin/ring emphasis. Avoid hundreds of custom React marker children; only the much smaller set of cluster badges uses custom views. Count labels remain in native station callouts and the selected preview to avoid new label collisions.
- Investigate the reported blue gear separately from app layout. Do not change Expo development settings; document evidence and any unverified screenshot identification.
- Phase 3 opens Explore with explicit Find a bike / Find a dock controls, a real native map, and a retained list alternative. Both share the existing API cache and detail route.
- Sort by selected-mode availability descending; zero, unknown and closed stations remain distinguishable. Search station names and filter All / Available / Zero / Unknown locally without extra requests.
- Use Expo SDK 58's supported `react-native-maps` version, installed with Expo CLI. Default Apple Maps on iOS and Google Maps on Android work in Expo Go without app API keys. Standalone Android distribution requires Google Maps configuration later.
- Use native pins rather than hundreds of custom React marker views. Keep map gestures uncontrolled, memoize station derivations, and update marker appearance only when data/mode/selection changes.
- A selected pin opens a compact station preview with real counts and access to the existing details. Filtered-out or removed selections clear safely. External directions use real destination coordinates and do not require RIDE location access.
- No in-app location request or locate-me feature in this slice; no assumed user position. Persistent favourites, backend and auth remain deferred.
- Retain the moodboard's bold typography, dark surfaces and lime emphasis. Figma concept inspection was attempted but blocked by the account's MCP call limit; no pixel-match claim is made.
- Keep the approved carbon/forest/lime design and native safe areas. Use reusable station cards with explicit zero and unknown counts.
- Parse untrusted CityBikes fields before rendering. Share a session-memory cache between list and detail with a 60-second freshness window, in-flight request deduplication, a short retry cooldown and a request timeout. No polling or disk persistence in this phase.
- Manual refresh keeps the previous successful response visible on failure, clearly labelled as cached. Show fetch age separately from the station source timestamp; missing timestamps remain unknown.

**MVP:** Home modes, real API, list + search, station details, bikes/docks counts, loading/error, timestamps.
**Next:** Map, GPS, favourites, filters.
**Polish:** animation, accessibility, reduced motion, visual states, responsiveness.

## Quality and accessibility
- Thumb-friendly tap targets >=44 pt; native safe areas; web preview capped to phone width.
- All numbers legible outdoors; status and count not encoded by color alone.
- Manual refresh and cache prevent excess polling.
- Test iOS/Android, zero/empty/offline, station selection and app reopen.

## Submission plan
- New Git repository named `ride-velo-antwerpen` (do not reuse ATMOS repo)
- Meaningful commits by feature; user adds `wimva` collaborator if repository is private
- `PLAN.md`, user flow, moodboard, source attribution, README
- Full source ZIP without `node_modules`
- Final presentation and recorded demo video
- Do not push or upload anywhere without the owner's authorization.

# RIDE — instructions for Codex and development agents

Read `PLAN.md`, `USERFLOW.md`, `MOODBOARD.md`, and `CHECKLIST.md` before modifying this project. Implement the core user flow and API contract before adding decorative features.

## Project and constraints
- React Native + Expo + Expo Router + TypeScript, with iOS and Android as primary targets.
- Public data only from `https://api.citybik.es/v2/networks/velo-antwerpen` (CityBikes API v2).
- No custom backend, no mandatory login, no Supabase unless the course instructor clarifies a conflicting requirement.
- Store saved station IDs locally. Never claim bikes can be reserved.
- Never commit secrets or private keys. Do not introduce an API key for this public endpoint.
- Use a distinct visual design, not the official Velo Antwerpen UI.
- Each station must open a dedicated detail screen showing `free_bikes` and `empty_slots`.

## Expo / package compatibility
- Use the official Expo docs for the exact installed SDK and check Expo Go compatibility before installing packages.
- Add packages using `npx expo install <package>` where possible.
- Run `npx expo install --check` or `--fix` as appropriate; do not invent package versions.
- Only run starter-template reset (`npm run reset-project`) once and only before custom work has begun.

## Architecture and React Native basics
- Use small function components, props, React state/hooks, and Expo Router screens.
- Use `FlatList` for a long list of stations, with `station.id` as the key, not array indexes.
- Use native primitives (`View`, `Text`, `Pressable`, etc.), no HTML or browser DOM manipulation for native.
- Separate fetch/API parsing from UI. Validate fetched data and preserve valid zero counts.
- Handle first open, loading, errors/retry, empty searches, zero bikes/docks, denied location and stale cached results.
- Add pull-to-refresh; show the age of data, and avoid frequent polling to respect the API limit.
- Buttons must be at least 44 pt in touch dimensions. Ensure screen content can scroll above safe-area navigation.

## Required incremental workflow
1. Before coding, update `PLAN.md` and `USERFLOW.md` as needed and confirm Figma/moodboard direction.
2. Scaffold Expo cleanly and run on a physical phone with Expo Go. Demonstrate Fast Refresh by changing visible app text.
3. Commit the working starter with a meaningful message.
4. Implement API data as a list first: station name, bikes and free docks, loading, error/retry, pull-to-refresh.
5. Implement one dynamic detail route for every station.
6. Implement distinct Find a bike / Find a dock user flows, filtering and search.
7. Add map/GPS only if compatible with Expo Go; list-based flow must remain usable without permissions.
8. Add local favourites and test persistence after restart.
9. Validate on phone, run TypeScript/test/build checks and create meaningful commits after working features.
10. Prepare README, visual documentation, presentation, demo video and source ZIP without `node_modules`.

## Reporting
After each working step report: files changed; how to test on a phone; tests run; remaining limitations; and suggested Git commit message. Never claim physical device verification unless the user confirms it. Do not push to GitHub or upload any deliverables without explicit authorization.

# RIDE — Moodboard / Design direction

**Concept:** Urban editorial mobility. A fast-use outdoor utility that borrows visual energy from wayfinding graphics, cycling culture and modern transit systems, but not the official Velo Antwerpen brand.

## Visual anchors
- Bold directional typography and enormous count numerals for bikes/docks.
- Carbon/dark forest base; electric acid-lime primary actions; warm-white body copy; muted mint secondary data.
- Restrained street-grid map styling and distinct icon shapes for bike availability versus free docks.
- Minimal rectangular/rounded panels, no glossy weather-app gradients or decorative dashboard clutter.
- High-contrast active mode: “Find a bike” versus “Find a dock”.

## Palette
- Carbon: #101512
- Forest surface: #1D2620
- Electric lime: #D8FF6A
- Warm white: #FAF8EE
- Muted mint: #A5B5A6

## Type and accessibility
- Display: oversized heavy sans headings, with compact line height.
- Body: clean sans, preferably >=16 pt except compact metadata.
- Min interactive target 44x44 pt, labels alongside colour cues, strong outdoor readability.

## Figma concept screens
https://www.figma.com/design/WLLdGhsuiJPZy6fQiHIlPU

Current initial screens: Home, Explore/Bikes, Station details, Saved. Add or extend: Docks mode, search/empty, error/refresh, first-open/permission, Settings/About. The Figma map graphic is schematic only, not accurate cartography.

## Moodboard evidence to assemble in Figma
Gather at least 6–8 *actual mobile UI* references: map-based apps, mobility apps, transit station detail screens, searching/filter interfaces, bottom-navigation patterns, typographic UI, empty/error states. Photos of cyclists and palette swatches can supplement but must not substitute for UI references (lesson 07, p.60).

Document why each reference is useful; do not copy a reference or the official Velo Antwerpen UI wholesale.

## Phase 5 implementation — 2026-11-26

Keep the approved urban editorial direction: carbon/forest surfaces, warm-white names, large availability numerals, lime for primary Bike/Dock and confirmed active controls. Use one compact bottom bar, system map/bookmark/account symbols and restrained metadata. Detail counts use 64pt type; status/tab captions may use 13–14pt with native text scaling. Touch targets remain at least 44pt regardless of visible icon/chip size. Amber (#E6BA71) signals old/error data; neutral grey (#B9BAB7) signals loading/unknown source time. Stale status never uses lime. Physical-device review is pending; see [Phase 5 checklist](docs/PHASE5_REVIEW.md).

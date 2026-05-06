# Catch Transit

A *Jet Lag: The Game*–inspired transit game scoped to the **Mumbai Metropolitan
Region** rail network — Suburban (Western, Central, Harbour, Trans-Harbour) and
Mumbai Metro lines.

Cross-platform (Android + iOS) built with **React Native + Expo**, **MapLibre**
+ **OpenStreetMap**, and **TypeScript**.

## What's in the MVP

- Interactive dark map of the MMR rail network with all stations & lines.
- GPS-aware station geofencing: arriving at a station auto-draws a card.
- **Challenge** and **Curse** decks (Mumbai-flavored — slow locals, vada pav
  tax, ladies-side rule, three-line Dadar, etc.).
- **Daily Challenge** mode (3 random target stations, time + score).
- **Free Roam** mode (open-ended).
- Per-station detail page with line connections.
- Session summary with full card history.

Multiplayer Tag (real-time room-code lobbies) lands in the next phase.

## Project layout

```
app/                     # expo-router screens
src/
  data/                  # stations.json, lines.json (seed + generated)
  transit/               # graph, adjacency, nearest-station, shortest-path
  map/                   # MapLibre wrapper, layers, hooks
  game/                  # decks, engine, zustand store
  ui/                    # theme, Button, CardModal
scripts/
  build-transit-data.ts  # one-shot Overpass importer for fuller OSM data
```

## Running

```bash
pnpm install
pnpm start            # Expo dev server
pnpm test             # graph + engine unit tests
pnpm typecheck
pnpm build:transit    # rebuild stations.json / lines.json from OpenStreetMap
```

For physical-device testing use Expo Go (Android dev menu → mock location works
for testing geofences without leaving your desk) or `eas build --profile preview`
for an installable APK / TestFlight build.

## Status

Solo MVP — see `/root/.claude/plans/root-claude-uploads-7b69fd31-bcb3-4d7d-peaceful-pine.md`
for the full multi-phase plan.

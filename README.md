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
- **Tag multiplayer** with 4-letter room codes, real-time location sync via
  Firebase, head-start countdown, capture detection at the same station, role
  rotation after each capture, anti-cheat speed/jump heuristics (live-logged
  to Firestore as `cheat-flag` events), and local notifications for capture
  events.
- **Hide & Seek multiplayer** with zone-restricted hiding stations, hider
  station picker + lock-in, Yes/No question chat answered by the hider, and
  a coin-priced hint shop (zone, line type, first letter, distance from any
  station). Seekers win by reaching the hider's locked station; the hider
  wins if the timer expires.
- **Train Rush multiplayer** — two teams (red & blue) race from station A to
  station B. Auto-balanced team assignment with manual swap. Spend coins to
  throw timer-based curses at the opposing team (Slow Local, No CSMT,
  Mandatory Detour, etc.) — recipients see active curses in their HUD.
- **Play again** flow with role rotation across all three modes — Tag keeps
  the current runner, Hide & Seek promotes the finder to next hider, Train
  Rush flips the from/to direction.
- **Hardened Firestore rules** — askers can only write their own questions,
  only the current hider can answer them, hint and curse-throw writes are
  scoped to in-room players.
- **Resilient host loop** — capture detection / round-end is run by a
  deterministic leader-elected client (lowest online uid), so the round
  survives the original host disconnecting mid-game.
- **Optional Cloud Functions** in `functions/` for cross-device Expo Push
  notifications and a watchdog that ends rooms whose timer expired even if
  every client is offline.

## Project layout

```
app/                     # expo-router screens (solo + tag/*)
src/
  data/                  # stations.json, lines.json (seed + generated)
  transit/               # graph, adjacency, nearest-station, shortest-path
  map/                   # MapLibre wrapper, layers, hooks
  game/                  # solo decks, engine, zustand store
  multiplayer/           # tag rules engine, anti-cheat, room store, hooks
  firebase/              # auth + room CRUD + Firestore client
  ui/                    # theme, Button, CardModal
scripts/
  build-transit-data.ts  # one-shot Overpass importer for fuller OSM data
firestore.rules          # security rules for friend-lobby Tag
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

### Firebase setup (Tag mode)

1. Create a project at <https://console.firebase.google.com>.
2. Enable **Anonymous** sign-in under Authentication.
3. Create a **Firestore** database in production mode and paste the contents of
   `firestore.rules` into the Rules tab.
4. Add a Web app under Project Settings and copy the config values into a
   `.env` file (see `.env.example`).
5. Restart `pnpm start`. The Tag screen will show a setup banner if any of the
   `EXPO_PUBLIC_FIREBASE_*` vars are missing.

### Cloud Functions (optional)

Cross-device push notifications and the round watchdog live in `functions/`.
They are entirely optional — the app works without them, with local-only
notifications and client-side leader election as the round backstop.

```bash
cd functions
npm install
npm run build
firebase deploy --only functions
```

Requires a Firebase project on the Blaze plan (Cloud Functions need
outbound network access). Push notifications use the Expo Push Service
via the device tokens registered into `users/{uid}/pushToken` by
`configureNotifications` on the client.

## Status

Solo MVP — see `/root/.claude/plans/root-claude-uploads-7b69fd31-bcb3-4d7d-peaceful-pine.md`
for the full multi-phase plan.

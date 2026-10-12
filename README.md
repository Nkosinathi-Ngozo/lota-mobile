# LOTA Mobile

Native mobile app (Expo / React Native) for LOTA — Location, Ownership and
Traceability of Assets. This app implements the field-verification workflow
that previously only existed as a simulated "mobile" panel inside the web
app's Verification page (`f/lota/src/routes/verification.tsx`): scanning an
asset's barcode/QR with the camera, capturing condition/custodian/GPS/photo
evidence offline, and syncing the results back to the same backend the web
app uses.

## Features

- **Login** — same LOTA branding and auth contract (`/auth/login`, `/auth/me`, refresh tokens) as the web app.
- **Due list** — assets with `verificationStatus` of `Due`/`Overdue`, searchable.
- **Camera scan** — native barcode/QR scanning (`expo-camera`) that opens the matching asset via `/codes/validate`, with manual UID entry as a fallback.
- **Offline capture** — condition, custodian confirmation, GPS (`expo-location`), photo evidence (device camera), and exception notes, saved to on-device storage immediately.
- **Sync queue** — pending/synced counts, one-tap sync when back online, writes go through the same `/assets/:uid` update the web app uses.
- **Profile** — session details and sign out.

## Getting started

```bash
cd src                 # the Expo project lives in mobile/src (docker-compose.yml stays here)
npm install
npm run start        # Expo dev server (scan the QR with Expo Go, or press i/a)
npm run android       # open on a connected Android device/emulator
npm run ios           # open on a connected iOS device/simulator (macOS only)
npm run web           # run in a browser (dev only — this app targets native)
```

Set `EXPO_PUBLIC_API_BASE_URL` (and `EXPO_PUBLIC_WS_API_URL`, if needed) in
`.env` to point at your backend. `dot.env` is the template committed to the
repo — copy it to `.env` and fill in real values; `.env` itself is
git-ignored.

## Docker

```bash
# LAN dev server (Expo Metro + DevTools), for use with a physical device/emulator
docker compose up expo

# Same, but tunneled (works across networks, needs an Expo account for reliability)
docker compose --profile tunnel up expo-tunnel

# Static web export served behind nginx, for a browser-accessible preview
docker compose --profile web up web
```

The `web` profile builds the app with `expo export --platform web` and
serves the static output through nginx (`Dockerfile`'s `web` stage +
`nginx.conf`). It's a convenience preview, not the primary target — this is
a native app; use `expo` or `expo-tunnel` with a real device/simulator/Expo
Go for the full experience (camera, GPS, offline storage).

## Project layout

```
src/app/                expo-router routes (project root is mobile/src)
  (auth)/login.tsx       sign-in screen
  (app)/verification.tsx due-assets list (home tab)
  (app)/scan.tsx          camera barcode/QR scanner
  (app)/asset/[uid].tsx   asset detail + offline capture form
  (app)/queue.tsx         offline sync queue
  (app)/profile.tsx       session info + sign out
src/src/
  theme/                 design tokens mirrored from the web app's Tailwind theme
  lib/api.ts              API client (same contract as f/lota/src/lib/api.ts)
  lib/verificationStore.tsx  offline-first capture queue + sync
  hooks/                  auth, assets, network status
  components/             shared UI primitives + badges matching the web app
```

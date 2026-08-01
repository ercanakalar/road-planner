# Road Planner — mobile

Expo / React Native client for the Road Planner API.

## Setup

```bash
npm install
cp src/constants/appConfig.example.ts src/constants/appConfig.ts
cp .env.example .env
npm start
```

`src/constants/appConfig.ts` is git-ignored. It reads `EXPO_PUBLIC_BASE_URL` and
`EXPO_PUBLIC_MAP_API_KEY` from `.env`, falling back to `http://localhost:3000`.

### Google Maps keys

Two separate keys are involved:

| Key | Used by | Configured in |
| --- | --- | --- |
| `EXPO_PUBLIC_MAP_API_KEY` | Directions, Geocoding, Places REST calls | `.env` → `appConfig.ts` |
| `GOOGLE_MAPS_API_KEY` | The native map SDK rendering the map itself | `.env` → substituted into `app.json` at prebuild |

Both are shipped inside the app binary, so restrict them in the Google Cloud
console — Android package name + SHA-1, iOS bundle id, and only the APIs above.

## Features

### The Map tab works signed out

Anyone can open **Map**, drop stops and compare travel times without an
account. Those routes live on the device (`localRoadSlice` + AsyncStorage via
`services/localRoadStorage`), never on the server.

When a signed-out user with local routes signs in or signs up,
`LocalRoadMigrationPrompt` offers to keep them. The transfer itself lives in
**Settings → Routes on this device**, so one screen owns it:
`uploadLocalRoads` posts each route to `POST /road/create` — waypoints
included, one request per route — and drops only the ones the server accepted,
so a partial failure leaves the rest on the device to retry.

The signed-out map and the account-backed route screen render through the same
components (`MapSection`, `WaypointList`, `ContextMenu`, `PlacesSearchBar`);
only the persistence target differs, so the two cannot drift apart.

### Settings

`settingsSlice` holds the preferences, `persistence-middleware` writes them to
AsyncStorage and pushes the notification flag into `notificationService` — which
cannot read the store, because it is called from response transforms and other
non-React code.

| Preference | Effect |
| --- | --- |
| Notifications | Suppresses every toast, including the ones API responses raise |
| Auto-fit route | Whether a map frames the whole route when it opens |

## Architecture

```
src/
  components/   Reusable UI (ContextMenu, FormField, ScreenState, …)
  hooks/        useMapLogic, useLocalMapLogic, useRouteDirections, bootstrap
  navigators/   Root stack + bottom tabs
  screens/      Feature screens (map/local is the signed-out Map tab)
  services/     Platform + third-party access (Google Maps, storage)
  store/        RTK Query APIs, slices, middleware, adapters
  theme/        Design tokens — colours, spacing, radii, shadows, elevation
  types/        Shared types
```

### Data layer

Server state lives entirely in RTK Query; Redux slices hold only client state
(session, map interaction). A few conventions worth knowing:

- **No `accessToken` in endpoint arguments.** `baseQuery` attaches the bearer
  token from the session, so cache keys stay stable across token refreshes.
- **Cache tags do the invalidating.** Endpoints declare `providesTags` /
  `invalidatesTags`; optimistic updates live in each endpoint's
  `onQueryStarted`, not in the components.
- **401 is handled in `baseQuery`.** It refreshes the session once — shared
  across concurrent requests — and replays the original call. If the refresh
  fails it dispatches `sessionCleared`, which wipes the keychain and every
  cached response.
- **Envelope unwrapping.** Every response is `{ status, header, message, data }`.
  `transformApiResponse` returns `data`; mutations that should surface the
  server's message use `transformApiResponseWithToast`.

### Maps and network cost

Every Google call goes through `services/googleMapsService`, which caches by
request (bounded LRU) and de-duplicates concurrent identical requests. One
Directions response supplies both the polyline and the distance/duration, and
the driving-mode lookup is shared between the drawn line and the mode selector.

Because callers share one in-flight promise, `fetchDirections` and
`reverseGeocode` deliberately take no `AbortSignal` — one screen must not be
able to cancel a request another is awaiting. They are debounced instead.
Places autocomplete is per-caller, so it does abort, and it uses a session
token so a search plus its details lookup is billed once.

## Checks

```bash
npm run typecheck                     # tsc --noEmit
npm test                              # jest
npx expo export --platform android    # verify the bundle builds
```

All three run in CI on any change under `mobile-react-native/`
(`.github/workflows/mobile-ci.yml`). The bundle step is there because `tsc`
cannot see unresolved imports or a broken path alias — only Metro can.

Tests cover the pure logic and the reducers: the favourites adapter, the
directions cache, duration/distance formatting, and the auth, map, settings and
local-road slices. `baseQuery` is exercised against a stubbed `fetch`, since it
holds the retry, refresh and replay logic.

### Known gaps

- The collection endpoints are paginated (`DEFAULT_PAGE_SIZE` 50,
  `MAX_PAGE_SIZE` 200). The app requests the maximum page and does not page
  further — see `src/constants/pagination.ts` for what real paging needs.
- No component or end-to-end tests; the map interactions are unverified by CI.

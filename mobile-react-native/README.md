# Road Planner — mobile

Expo / React Native client for the Road Planner API.

## Setup

```bash
npm install
cp src/constants/appConfig.example.ts src/constants/appConfig.ts
cp .env.example .env
npm start
```

`src/constants/appConfig.ts` is git-ignored. It reads `EXPO_PUBLIC_BASE_URL`
from `.env`, falling back to `http://localhost:3000`.

`EXPO_PUBLIC_BASE_URL` is the backend's address **without** the `/api` prefix —
NestJS sets that prefix globally and `src/constants/apiUrl.ts` adds it to every
request. Writing it in anyway is harmless; the prefix is never doubled.


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

### Following a route as you drive it

Once a route is drawn, a **navigate** button appears under the locate button.
It is a toggle: on, `useLiveLocation` watches the device position
(`expo-location`, a fix every 10m or 2s) and the map recentres on each one. The
first fix zooms in close enough to read the road; every fix after that only
moves the camera, so a zoom chosen by hand mid-journey survives. Panning the
map switches following off — carrying on recentring would drag the map back
out from under your finger.

The road already driven draws at 0.6 opacity. `splitRouteAtLocation`
(`utils/geo`) cuts the drawn line at the point nearest the current position and
the two halves share that point, so the faded road behind and the full-strength
road ahead meet under the marker rather than leaving a gap at it. A polyline has
no opacity of its own — `strokeColor` is all there is — so the fade goes into
the colour itself via `withAlpha`, casing and line together.

The split only applies within 200m of the line. A drawn route is a
simplification of the road and a fix has error of its own, but past that the
journey has been left rather than rounded off, and dimming half of it because
you are in the next town would be a lie about where you are.

Both the watch and the button live in `MapSection`, so both map screens get
this without either of them knowing about it. The subscription exists only
while following is on: a location watch left running is the fastest way to
flatten a battery.

### Searching along the route

Once a route has two stops, an **On the way** chip appears over the map.
`RouteSearchSheet` searches the journey itself rather than the map view: a
free-text box for anything (*sushi*, *car wash*, *playground*), one-tap
categories from `constants/placeCategories`, and a corridor width from 500m to
10km. The route is the boundary of the search, so nothing comes back that is
further than that from the line that will actually be driven — a cafe two
streets off the motorway is a result, one the same distance from the
destination as the crow flies is not.

Results are drawn on the map in a colour the route's own pins never use, and
each row shows its rating, how far off the route it is, and whether it is open.
The **+** on a row adds it as a stop *where it is passed*: the backend returns
`insertAfterIndex`, so a lunch stop lands between the two stops it actually sits
between rather than at the end of the journey. Tapping the row instead just
shows it on the map, leaving the route alone.

One search costs the backend a dozen billed Places lookups, so `useRouteSearch`
debounces harder than the autocomplete beside it (600ms), asks for nothing until
there is both a route and something to look for, and `mapsService` caches each
search. A route too long to blanket at the chosen radius is searched in circles
that no longer touch; the sheet says so rather than letting a short list read as
an empty stretch of road.

Both map screens use it — the signed-out device map and the account-backed route
screen — through the same sheet; only where the new stop is written differs.

### Sharing a route by link

The share button on a route in **Routes** asks the backend for a link
(`GET /road/share/:id`, owner only) and hands it to the system share sheet, so
WhatsApp and everything else the phone knows about appear without the app
integrating with any of them. Android's sheet ignores the sheet's `url` field
and posts `message` alone, so the link is inside the message text.

Opening a link resolves it through `POST /road/share/:token` — public, because
the point is that the recipient may not have an account — onto
`SharedRouteScreen`, which shows the route read only. Signing in is what unlocks
saving or copying it.

The link is a JWT, so it expires (`ROAD_SHARE_EXPIRE_IN`, 7 days by default) and
carries no road id anyone can guess at. A road its owner has deleted resolves to
a 404 rather than outliving the deletion.

**A link only opens the app instead of a browser if it points at a host that
serves `/.well-known/assetlinks.json` naming this package and its signing
SHA-256.** Set `EXPO_PUBLIC_SHARE_LINK_BASE_URL` (app) and `SHARE_LINK_BASE_URL`
(backend) to that host. With neither set the app shares
`net.travelroutes.travelroutes://share/<token>`, which does open the app when
tapped but which chat apps will not render as a tappable link — so on a plain
LAN setup, expect to paste it into a browser rather than tap it in WhatsApp.

### Reading is open, keeping is not

The community feed on Home and the routes in it are readable without an account.
`GET /road/discover` and `GET /road/:id` both run under `OptionalAccessGuard`,
and `visibleRoadWhere` narrows to `{ isPublic: true, archivedAt: null }` when
there is no caller — a signed-out reader can reach exactly what somebody chose
to publish, and a road id is a UUID rather than something to walk through.

An anonymous read still returns the `favoriteRoads` and `favoriteWaypoints`
arrays, empty. The server skips the query, but the app reads both without
checking, and an absent array is a crash where an empty one is just no
favourites.

Favourites themselves live on the server against a user, so those affordances
are absent rather than present-and-inert: no star on community cards
(`DiscoverRoadCard`'s `canFavorite`), no favourite action in the signed-out Map
tab's stop list (`LocalWaypointList` passes `showFavoriteAction`), and the
community and shared route screens offer sign-in where the save button would be.

### Editing titles and descriptions

A route's name and notes are editable from the Routes list, from the Map tab's
toolbar, and — for favourites — from the Favourites tab.

Two constraints shape how:

- `PUT /road/update/:id` treats its `waypoints` array as the route's complete
  desired state, so an omitted array deletes every stop. A title-only edit goes
  through `updateRoadDetails`, which reads the current waypoints and sends them
  back with their ids.
- A favourite's title and description annotate the **favourite row**, not its
  target. A waypoint has no title of its own, and a road belongs to its author,
  so this is the only text a user can edit on something they merely saved.
  Clearing the field falls back to the target's own name.

### Location

`useInitialRegion` asks for foreground location once per app run. Granted, the
map opens on the device; denied or unavailable, it opens on the whole of
Turkey. `initialRegion` is only read when the native view mounts, so a
permission answered later animates the map instead of stranding it.

### Route line styling

Each transport mode draws its own colour and dash pattern
(`constants/transportStyles.ts`) — driving solid blue, transit long-dashed
purple, walking dotted green. The pattern carries the same information as the
colour, so the modes stay distinguishable without relying on hue alone.

### Settings

`settingsSlice` holds the preferences, `persistence-middleware` writes them to
AsyncStorage and pushes the notification flag into `notificationService` — which
cannot read the store, because it is called from response transforms and other
non-React code.

| Preference | Effect |
| --- | --- |
| Notifications | Suppresses every toast, including the ones API responses raise |
| Auto-fit route | Whether a map frames the whole route when it opens |

### Confirmations

`ConfirmProvider` mounts one dialog for the whole app and exposes it as an
awaitable call, replacing the scattered `Alert.alert` usages:

```ts
const confirm = useConfirm();
if (await confirm({ title: 'Delete route?', tone: 'danger' })) remove();
```

Every field is optional. A second request while one is open resolves the first
as cancelled, so no caller is left awaiting a promise that never settles.

## Architecture

```
src/
  components/   Shared UI, grouped by what it knows about
    ui/         Domain-agnostic primitives: buttons, fields, layout, states
    feedback/   Errors, toasts and confirmation, app-wide
    auth/       Sign-in surface and session gating
    map/        The map, its controls and the waypoint list
    road/       Road details and the local-road upload prompt
    profile/    Avatar and theme controls
  hooks/        useMapLogic, useLocalMapLogic, useRouteDirections, bootstrap
  navigators/   Root stack + bottom tabs
  screens/      Feature screens (map/local is the signed-out Map tab)
  services/     Platform + third-party access (Google Maps, storage)
  store/        RTK Query APIs, slices, middleware, adapters
  theme/        Design tokens — colours, spacing, radii, shadows, elevation
  types/        Shared types
```

Two rules keep that arrangement honest. **`components/` never imports from
`screens/`** — a component that needs a screen's data takes it as a prop, which
is what let `MapSection` and `WaypointList` be shared by the signed-out map and
the account-backed one instead of one screen reaching into the other's folder.
And **`ui/` never imports from a domain folder**, so a primitive stays a
primitive.

Imports name the file rather than a folder barrel — `components/ui/PrimaryButton`,
not `components/ui`. A barrel makes every screen that wants one control pull in
all of them, which is startup time a phone pays for and nobody asked for.

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

The app does not talk to Google. Every lookup goes through
`services/mapsService`, which calls the backend's `/api/maps/*` endpoints; the
backend calls Google and caches the answers. Coordinates go out, a drawn line
and an address come back — the polyline arrives already decoded, which is why
there is no polyline library in this project any more.

`mapsService` keeps a cache of its own (bounded LRU, de-duplicating concurrent
identical requests) so a redraw makes no round trip at all. Because callers
share one in-flight promise, `fetchDirections` and `reverseGeocode` deliberately
take no `AbortSignal` — one screen must not be able to cancel a request another
is awaiting. They are debounced instead. Places autocomplete is per-caller, so
it does abort, and it carries a session token so a search plus its details
lookup is billed once.

Comparing modes is one request: `fetchModeDurations` posts the journey and the
list of modes, and the backend asks Google for each of them in parallel.

`searchPlacesAlongRoute` is the most expensive call the app makes — the backend
fans one out into a dozen Places lookups to cover the route in circles — so it
is cached like the rest and debounced hardest (600ms). It takes no
`AbortSignal` for the same reason `fetchDirections` does not; a result that
arrives after the search has moved on is dropped by the hook instead.

Adding or moving a waypoint on a saved road sends coordinates only. The server
names the pin as it stores it, so the write is one round trip instead of a
lookup followed by a save; the list shows *Locating…* for as long as that takes.
Roads kept on the device still geocode through `/api/maps/geocode/reverse`,
since there is no server-side write to hang the lookup off.

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

## Building an installable APK with Docker

Produces a signed APK without an Expo account, Android Studio, or a JDK on the
host. Run from the repository root:

```bash
docker compose -f docker-compose.apk.yml run --rm build-apk
```

The APK is written to `apk-output/`. Copy it to the phone and open it, or:

```bash
adb install -r apk-output/travel-routes-release.apk
```

The first run downloads the Android SDK and Gradle dependencies and takes a
while; later runs reuse both from named volumes.

### Configuration

Values prefixed `EXPO_PUBLIC_` are compiled into the bundle, so **changing any
of them means rebuilding**. They are read from `mobile-react-native/.env`, or
can be passed on the command line:

```bash
EXPO_PUBLIC_BASE_URL=http://192.168.1.20:3000 \
  docker compose -f docker-compose.apk.yml run --rm build-apk
```

`EXPO_PUBLIC_BASE_URL` has no default and the build refuses to start without
it — an APK compiled against the wrong address installs and opens fine, and
then reaches nothing, which is not a state worth shipping into. `localhost`
means the phone itself, and `10.0.2.2` means the host only to the Android
emulator; use the backend machine's address on the network the phone is on.
Confirm it from the phone's browser before building — `/api/health` answers.

Android blocks plain HTTP in a release build. `app.config.js` opts the manifest
back in automatically when `EXPO_PUBLIC_BASE_URL` starts with `http://`, which
is fine while testing but not something to ship — serve the API over HTTPS for a
real release and the opt-in disappears on its own.

### Signing and Google sign-in

The signing key is generated on the first run into a named volume and reused
afterwards, so the certificate fingerprint stays the same between builds. The
build prints its SHA-1; register that against package
`net.travelroutes.travelroutes` in the Android OAuth client, or Google
sign-in is refused.

Deleting the `apk-keystore` volume generates a new key with a new fingerprint,
and Android refuses to install an update signed by a different key — uninstall
the app first if that happens.

### Reading a crash off the phone

A release build has no red error screen; a failure at startup is just Android's
"app keeps stopping" dialog. The real stack trace lives in the phone's crash
buffer, and the build image already carries `adb` to fetch it — nothing has to
be installed on the host.

On the phone: **Settings → Developer options → Wireless debugging**, on. First
time only, tap *Pair device with pairing code* and use the address and six
digits it shows:

```bash
ADB_PAIR=192.168.1.42:37105 PAIR_CODE=123456 \
  docker compose -f docker-compose.apk.yml run --rm logcat
```

Then, and every time after, use the *IP address & Port* from the Wireless
debugging screen itself — a different port from the pairing one:

```bash
ADB_TARGET=192.168.1.42:5555 \
  docker compose -f docker-compose.apk.yml run --rm logcat
```

The trace is printed and written to `apk-output/crash.txt`. Open the app so it
crashes first — the buffer survives the crash, so the order does not matter
beyond that.

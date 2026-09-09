# Travel Routes — mobile

Expo / React Native client for the Travel Routes API.

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
account. Those routes live on the device (`localRouteSlice` + AsyncStorage via
`services/localRouteStorage`), never on the server.

When a signed-out user with local routes signs in or signs up,
`LocalRouteMigrationPrompt` offers to keep them. The transfer itself lives in
**Settings → Routes on this device**, so one screen owns it:
`uploadLocalRoutes` posts each route to `POST /road/create` — waypoints
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

### Searching what everyone has published

The search button on Home opens one field over two lists: routes, and the
people who published them. Order and filters sit directly under the field and
belong to the route list, so they leave with it when the People tab is showing.

Length is filtered in bands — 2-4, 5-9, 10+ — rather than as a number, because
nobody wants "at least seven stops", they want a short route or a long one. The
API turns a band into a clause on the stop `order` rather than counting rows:
`order` is a dense 1-based rank per route, so "has a stop ranked 5 or higher" is
the same question as "has at least five stops", and unlike a count it is one
Postgres can answer inside the same query. That matters because filtering after
the page came back would return short pages and a wrong total.

The term reaches the network in two steps — deferred, so typing never waits on
a re-render, then debounced, so it never waits on a request either. A
one-character term is held back entirely: the API treats it as no term at all
and would answer with the newest routes, which reads as search ignoring what
was typed.

**Search finds authors, not accounts.** `/user/search` only returns someone who
has at least one live public route, matches only on the nickname and first name
their routes are already published under, and returns neither an email nor a
surname. Someone who has published nothing cannot be found through it at all,
which is what makes it safe to leave open to signed-out callers. Matching is
deliberately restricted to the two fields it will show back, so search cannot be
turned into a probe for a field it hides.

Tapping a person opens their shelf, which is the same `/road/search` endpoint
narrowed with `authorId` — "their routes" is nothing but that filter, and a
second endpoint would only be another way to ask the same question.

### Importing a route from Google Maps

The Map tab can go the other way as well as hand off: paste a Google Maps link
and its stops become a route on this device.

Links arrive in more shapes than one. `parseGoogleMapsRoute` reads the
documented `?api=1&origin=…&waypoints=A|B` form, the `/maps/dir/A/B/C` path the
website puts in the address bar, the older `?saddr=…&daddr=B to:C` form, and a
single shared pin. Links shared from the phone app are shortened and carry
nothing but an id, so those are followed to the real URL first.

What a link gives for each stop is any of three things — a coordinate, a place
id, or the words somebody typed — and only the first is already usable. The
other two go back through Google to become one, which is why the import shows
what it found and waits for confirmation before adding anything: a name can land
somewhere other than where it was meant to. A stop nothing can place is listed
by name rather than quietly dropped, and a coordinate whose address will not
resolve is still kept, because the point is what makes the stop and the name is
decoration.

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
carries no route id anyone can guess at. A route its owner has deleted resolves to
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
to publish, and a route id is a UUID rather than something to walk through.

An anonymous read still returns the `favoriteRoads` and `favoriteWaypoints`
arrays, empty. The server skips the query, but the app reads both without
checking, and an absent array is a crash where an empty one is just no
favourites.

Favourites themselves live on the server against a user, so those affordances
are absent rather than present-and-inert: no star on community cards
(`DiscoverRouteCard`'s `canFavorite`), no favourite action in the signed-out Map
tab's stop list (`LocalWaypointList` passes `showFavoriteAction`), and the
community and shared route screens offer sign-in where the save button would be.

### Editing titles and descriptions

A route's name and notes are editable from the Routes list, from the Map tab's
toolbar, and — for favourites — from the Favourites tab.

Two constraints shape how:

- `PUT /road/update/:id` treats its `waypoints` array as the route's complete
  desired state, so an omitted array deletes every stop. A title-only edit goes
  through `updateRouteDetails`, which reads the current waypoints and sends them
  back with their ids.
- A favourite's title and description annotate the **favourite row**, not its
  target. A waypoint has no title of its own, and a route belongs to its author,
  so this is the only text a user can edit on something they merely saved.
  Clearing the field falls back to the target's own name.

### Location

`useInitialRegion` asks for foreground location once per app run. Granted, the
map opens on the device; denied or unavailable, it opens on the whole of
Turkey. `initialRegion` is only read when the native view mounts, so a
permission answered later animates the map instead of stranding it.

### The map's own colours

The basemap is built from the palette rather than picked from Google's presets:
`buildMapStyle(colors)` in `constants/mapStyles.ts` returns the style, and
`hooks/map/useMapStyle` hands the current one to every `MapView`. There are no
literal colours in that file, so retheming the app rethemes the map — and a test
asserts it, because a hex dropped in there is how the two drift apart.

Light mode used to be an empty array, meaning Google's stock map under an app
that looks nothing like it; dark mode was Google's night preset, whose greys are
not the palette's greys. Both are now the same style with different tokens in
it.

The map is a backdrop, not a subject. Everything that matters is drawn on top of
it — the route line, the four waypoint pins, places found along the way, the
compared pair — so the basemap is built only from the neutrals, and two tests
check that none of the pin or route colours appear anywhere in it. There are two
deliberate exceptions where grey would read as wrong rather than as neutral:
water takes `water` and parkland `successSoft`. Water has a token of its own
rather than a brand tint because a family can be any hue, and a green or
indigo sea reads as land. Google's own POI, road and transit icons are switched off, because this
app draws its own pins and the two compete for the same glance.

### Route line styling

Each transport mode draws its own colour and dash pattern
(`constants/transportStyles.ts`) — driving solid blue, transit long-dashed
purple, walking dotted green. These belong to the map rather than to the
brand, so they do not change with the family; the line is drawn over the
basemap, not over the app's own surfaces, and it has to stay clear of the pins
at either end of it. The pattern carries the same information as the
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

## Google sign-in

Optional. With no client id configured the button is not rendered and
email/password sign-in is unaffected.

The flow is: the app opens Google in a browser tab, receives an authorization
code at its own URI scheme, exchanges that code for an **id token**, and posts
the token to `POST /api/auth/google/token`. The API verifies the token's
signature and audience with Google, stores the name and avatar it carries, and
answers with this API's own session — the same access/refresh pair
email/password sign-in returns. Google's tokens are never persisted.

### What has to match

Three things are checked by Google or by the API, and each rejects a mismatch:

| Value | Has to be |
| --- | --- |
| The redirect URI | `net.travelroutes.travelroutes:/oauthredirect` — the app's own application id. Registered implicitly by the Android/iOS client type; nothing to paste. |
| The client id compiled into the build | An OAuth client of the **platform being built** (`EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` / `..._IOS_...`). A web client id here is refused by Google. |
| The audience the API accepts | The same client id, listed in the backend's `GOOGLE_NATIVE_CLIENT_IDS` (its `GOOGLE_CLIENT_ID` is always accepted as well). |

An Android OAuth client is keyed by package name **and** signing certificate, so
a debug build and a release build are two different clients:

```bash
# release — the APK build prints this fingerprint itself
docker compose -f docker-compose.apk.yml run --rm build-apk

# debug — the key `expo run:android` signs with
keytool -list -v -keystore ~/.android/debug.keystore \
  -alias androiddebugkey -storepass android -keypass android
```

Create one client per fingerprint in **Google Cloud console → APIs & Services →
Credentials → OAuth client ID → Android**, package
`net.travelroutes.travelroutes`. Put the one for the build you are making in
`.env`, and list *both* on the backend so either build can sign in.

### Development

Expo Go cannot be used for this. It is one shared app under one shared package
name, so Google's redirect never reaches your code — the account picker opens,
returns to nothing, and there is no configuration that fixes it. The app detects
Expo Go and says so under the button instead of spinning.

Use a development build, which is the same code with this app's own package name:

```bash
npx expo run:android          # or: npx expo run:ios
```

### Production

The release APK is signed by the keystore in the `apk-keystore` volume, so its
fingerprint — and therefore its OAuth client — is stable across rebuilds. See
[Signing and Google sign-in](#signing-and-google-sign-in).

### When it does not work

Every failure names itself under the button, and the details are logged with
a `[google-sign-in]` prefix (`npx expo start`, or `logcat` for a release build).
The ones worth recognising:

| On screen | Cause |
| --- | --- |
| *Google sign-in needs a development build* | Running in Expo Go. |
| *The server would not accept this Google account…* | The API verified the token and refused its audience. Add this build's client id to `GOOGLE_NATIVE_CLIENT_IDS` and restart the API — it names the offending audience in its own log. |
| *Google sign-in is not configured on the server* | The API has neither `GOOGLE_NATIVE_CLIENT_IDS` nor `GOOGLE_CLIENT_ID`. |
| *Could not reach the server…* | `EXPO_PUBLIC_BASE_URL` is not an address this phone can open. `http://<address>/api/health` from the phone's browser answers. |
| *Google issued no id token…* | The compiled client id is not one for this platform — typically the web client id on Android. |
| `redirect_uri_mismatch`, `invalid_client` | The signing certificate does not match the one on the OAuth client. A debug build signed with a release client's fingerprint fails here. |

### The tab bar

Home · Map · **♥** · Routes · Profile, with Favourites raised into the middle
as one filled circle in `primary` (`navigators/CentreTabButton`).

The raised one is still an ordinary tab, not a floating action button drawn
over it: the press is the tab press React Navigation hands over, and only the
drawing is different. `centreTabButton(icon, label)` builds the button for
whichever screen sits there, so moving the middle around is a line in the
navigator rather than a new component — call it at module scope, though, since
`tabBarButton` is invoked on every render of the bar and a function built
inside one remounts the button with it.

Every screen keeps the name it had through the reorder, so
`navigate('Favourites')` from the community and shared-route screens — the
`highlightTargetId` param and all — still lands where it did, and the app
still opens on Map.

Favourites are hearts, filled in `primary`. The one star left in the app
is the Google rating on a place found along a route, which is a rating.

## Architecture

```
src/
  components/   Shared UI, grouped by what it knows about
    ui/         Domain-agnostic primitives: buttons, fields, layout, states
    feedback/   Errors, toasts and confirmation, app-wide
    auth/       Sign-in surface and session gating
    map/        The map, its controls and the waypoint list
    route/      Route details, the compact route row, the rail card, the
                upload prompt
    profile/    Avatar and theme controls
    search/     The search field, its filters, and a person's row
  hooks/        All the logic, grouped the same way components/ is
    common/     Reusable behaviour: form actions, debounce, clipboard
    feedback/   useConfirm
    auth/       Session bootstrap, Google sign-in, the auth forms
    map/        useMapLogic, useLocalMapLogic, useRouteDirections, useMapScreen
    routes/     Sharing, Google Maps hand-off, the Routes tab
    favorites/  The Favourites tab
    home/       The Discover feed
    profile/    The Profile tab
    search/     Search and one author's shelf
  navigators/   Root stack + bottom tabs
  screens/      One folder per bottom tab, plus what each tab pushes
    home/       Discover feed
    map/        The Map tab: pick a route, drop stops, save it
    routes/     The Routes tab and the route detail screens it opens
    favorites/  The Favourites tab
    profile/    The Profile tab: welcome, auth gate, settings, legal
    search/     Search results, and one author's published routes
  services/     Platform + third-party access (Google Maps, storage)
  store/        RTK Query APIs, slices, middleware, adapters
  theme/        Design tokens — colours, spacing, radii, shadows, elevation
  types/        Shared types
```

Three rules keep that arrangement honest. **`components/` never imports from
`screens/`** — a component that needs a screen's data takes it as a prop, which
is what let `MapSection` and `WaypointList` be shared by the signed-out map and
the account-backed one instead of one screen reaching into the other's folder.
**`ui/` never imports from a domain folder**, so a primitive stays a primitive.
And **`hooks/` imports neither `components/` nor `screens/`**: a hook is the
layer underneath both, so it can be read, tested and reused without dragging a
view in behind it. That rule is why `useConfirm` lives in `hooks/feedback/` with
the context it reads while `ConfirmProvider` stays a component, and why the
pure favourites helpers moved to `utils/favorites/`.

A screen is what its hook returns, laid out. `MapScreen`, `FavoritesScreen`,
`RoutesScreen`, `HomeScreen` and `ProfileScreen` each pair with one hook named
after them — `hooks/map/useMapScreen`, `hooks/favorites/useFavoritesScreen`,
and so on — which owns the queries, the mutations and the open/closed state of
the overlays. What is left in the `.tsx` file is markup and its styles. Screens
that are one form (`SignInScreen`, `SignUpScreen`, `ForgotPasswordScreen`) pair
with a form hook over `hooks/common/useFormAction` instead.

The remaining screens — the route detail screens, the reset-code flow,
`SettingsScreen`, `ProfileDetailScreen` and `ChangePasswordSection` — still hold
their own logic and have not been through this yet.

Imports name the file rather than a folder barrel — `components/ui/PrimaryButton`,
not `components/ui`. A barrel makes every screen that wants one control pull in
all of them, which is startup time a phone pays for and nobody asked for.

One hazard worth knowing about, because it is silent: a module must not exist as
both `.ts` and `.tsx`. Metro resolves `sourceExts` in order — `ts` before `tsx` —
and so does `tsc`, so the `.tsx` twin is never loaded by anything. `useMapLogic`
and `useWaypointLogic` each had a pair, and the `.tsx` half was dead: editing it
changed nothing at runtime, and no tool said a word. If a change to a file seems
to have no effect, check for a same-named sibling with the other extension.

### Rendering and re-renders

The React Compiler is on, through `experiments.reactCompiler` in `app.json`.
It memoises components and hook results at build time, so a `useCallback` or a
`memo()` is no longer the only thing standing between a list and a re-render of
every row. The existing hand-written ones are left where they are — they are
correct, and the compiler is happy to skip what is already memoised — but new
code does not need to reach for them by reflex.

The compiler is conservative: anything it cannot prove safe it simply leaves
alone, per function, with no error and no bundle change. At the last check it
compiled 95 functions and stepped over 14. Most of those are only unsupported
syntax (`try`/`finally`, `try` with no `catch`). Three are worth knowing about,
because they are real rules-of-React violations rather than gaps in the
compiler: `useMapLogic`, `useRouteDirections` and `useRouteSearch` each write to
a ref during render to keep a "latest value" around. They work, and they are
skipped rather than miscompiled, but they will not be optimised until that write
moves into an effect.

Three React 19 features carry their weight in specific places:

- **`useActionState`**, under `hooks/common/useFormAction`, is what the auth
  forms submit through. It replaces a pair of `useState` calls — one for
  pending, one for the error — that had to be kept in step by hand, and its
  pending flag covers validation, the request *and* the navigation after it.
  There is no `<form>` on this platform to hand the action to, so `handleSubmit`
  opens the transition itself; without that `isPending` never flips.
- **`useOptimistic`**, in `hooks/home/useHomeScreen`, lights the star on a
  community route the moment it is tapped. Saving one round-trips to the server
  and then refetches the whole Discover sample, which is far too long to leave a
  tapped star dark. Failure needs no handling: ending the action drops the
  optimistic flip back to whatever the server said. Note this is only needed for
  Discover — the other favourite lists are patched by RTK Query's
  `onQueryStarted` instead, which is the better tool when there is a cache entry
  to patch.
- **`useDeferredValue`**, in `hooks/favorites/useFavoritesScreen`, filters the
  favourites list at a lower priority than the keystroke that changed it, so
  typing stays at the keyboard's frame rate on a long list. The list dims while
  it is a keystroke behind.

### Addresses

A stop carries one string: Google's formatted address as it read when the pin
was placed. `utils/address.ts` is the only thing that reads it.

It arrives cleaned — the API drops the noise on the way in — but the column also
holds rows written before that cleaning existed, and a route carried off a phone
brings whatever it was saved with, so the same rules run again on the way out.
Dropped: Plus Codes standing in for a street name (`7GXR+8C`), "Unnamed Road",
a postcode on its own, punctuation-only segments, and a segment repeated. That
last one folds Turkish case first — "KADIKÖY" and "Kadıköy" are the same place,
and a plain `toLowerCase()` says they are not.

Three readers, so a card never has to slice the string itself:

| | |
| --- | --- |
| `addressName` | The first segment — the place. Marker titles, card headings |
| `addressLocality` | The middle segments — where it is. Subtitles; drops the country, which repeats on every stop of a domestic route |
| `fullAddress` | The whole cleaned line, country included. What Copy address puts on the clipboard |

Each returns `''` for a stop that was never named, so callers use `||` for their
fallback rather than testing for null.

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

Adding or moving a waypoint on a saved route sends coordinates only. The server
names the pin as it stores it, so the write is one round trip instead of a
lookup followed by a save; the list shows *Locating…* for as long as that takes.
Routes kept on the device still geocode through `/api/maps/geocode/reverse`,
since there is no server-side write to hang the lookup off.

## Checks

```bash
npm run typecheck                     # tsc --noEmit
npm test                              # jest
npm run check:contrast                # the palette's own constraints
npx expo export --platform android    # verify the bundle builds
```

The first, second and last run in CI on any change under `mobile-react-native/`
(`.github/workflows/mobile-ci.yml`). The bundle step is there because `tsc`
cannot see unresolved imports or a broken path alias — only Metro can.

Tests cover the pure logic and the reducers: the favourites adapter, the
directions cache, duration/distance formatting, and the auth, map, settings and
local-route slices. `baseQuery` is exercised against a stubbed `fetch`, since it
holds the retry, refresh and replay logic.

### Known gaps

- Almost no component tests. `CreateRouteTabButton` has one, because it
  crashed the app on launch in a way `tsc`, jest and the bundle export all
  passed straight over: `tabBarButton` is *called* by `BottomTabItem` rather
  than mounted, so a `memo()` object there is not callable — and its props
  are the DOM-ish spellings (`aria-selected`, `aria-label`), which the prop
  type permits you to ignore in favour of `accessibilityState` that never
  arrives. Anything else rendered only by the navigator has the same hole
  under it.
- The collection endpoints are paginated (`DEFAULT_PAGE_SIZE` 50,
  `MAX_PAGE_SIZE` 200). The app requests the maximum page and does not page
  further — see `src/constants/pagination.ts` for what real paging needs.
- No component or end-to-end tests; the map interactions are unverified by CI.

## Brand and store images

### Palette

`theme/palettes.ts` holds every colour in the app. A **family** is a light
scheme and a dark one that go together, and there are three:

| Family | `primary` | `brand` | Paper |
| --- | --- | --- | --- |
| `maps` (in use) | `#1967D2` Blue 700 | `#1A73E8` Blue 600 | Google greys |
| `forest` | `#146C2E` Green 800 | `#1E8E3E` Green 600 | Google greys |
| `harbour` | `#4A50A8` indigo | `#6A70C4` | cool off-white |

All three sit on Google's Material steps, picked at the step that clears the
contrast each token needs rather than the brightest one. `maps` uses Blue
**700** rather than the Blue 600 Google fills its buttons with, because
`primary` also sets small label text on `primarySoft`: Blue 600 reaches 4.51:1
on pure white and nothing above it, so any tint at all puts it under 4.5. Blue
600 lives in `brand`, which is display-sized only and needs 3:1.

`ACTIVE_PALETTE` names the one the app wears, and `lightColors` / `darkColors`
are that choice — nothing outside the file names a family, so switching is one
word and reskins every screen, the basemap included. It is not a user setting:
light and dark are, and a second axis of choice on top of those is a lot of
surface for something an app usually just decides.

In `maps`, `primary` and `route` are the same blue, so the stops between the
ends really are brand-coloured — the one place a family knowingly breaks the
pin rule below. That is what Google Maps looks like, and the four pin hues
still separate by 60°, so it is a deliberate borrow rather than an oversight.

Harbour is indigo rather than a third green because at ~236° it is far enough
from forest's ~140° that the two read as different apps, while still clearing
`route` blue (~215°) and `selection` violet (~272°) by enough that neither the
map nor the compared pair goes muddy against the chrome.

The map colours — the four pins, `selection`, the three route modes, `water` —
are about reading a map rather than about the brand, so families share them
unless a family has a reason not to.

Six constraints are load-bearing for *every* family, in use or not, and the
comment at the top of the file repeats them:

- Stop pins colour by position — start `success`, destination `accent`, the
  stops between them `route` — and a place found along the way uses `place`.
  All four share a screen, so they stay far apart in hue (green ~140°, red
  ~5°, blue ~215°, olive ~77°); the closest pair is 60° apart. The middle
  stops take `route` rather than `primary` because a brand-coloured pin reads
  as a second start — except in `maps`, where the two are the same blue on
  purpose. `warning` is out for the
  matching reason on the red side: 33° from `accent`, and it read as a second
  destination.
- `selection` marks the compared pair and temporarily replaces whichever of
  those four a pin would otherwise use, so it is a fifth hue kept clear of
  them all — violet ~282°.
- The three route modes are drawn over the same map — driving ~215°, transit
  ~272°, walking ~145°. Each casing is a lighter halo of its own hue holding
  ≥ 3:1 against the line it outlines; a *darker* same-hue casing cannot reach
  3:1 at all, which is why the outline lightens rather than deepens.
- `primary` is used for small label text, so it holds ≥ 4.5:1 against
  `surface`, `background`, `surfaceAlt` and `primarySoft` — that last one is
  what secondary buttons are filled with, and it is what caps how light
  `primary` may go.
- `text` and `textMuted` clear 4.5:1 on all three backgrounds; `textSubtle`
  never carries meaning on its own and clears 3:1. `brand` is display-sized
  only, so it clears 3:1.
- `water` is the one basemap colour that never follows the brand. A green or
  indigo sea reads as land, so it stays blue, separated from `background` so
  the coast is visible and far enough from `route` that a line drawn across a
  lake still holds 3:1.

None of that is checkable by eye:

```bash
npm run check:contrast
```

walks every pair in every palette — a family sitting unused is one somebody
will switch to, and it should not have been allowed to rot in the meantime —
and fails with the ratio it measured.

### Icons

Every launcher and store image is generated from one vector source:

```bash
node scripts/generate-icons.mjs
```

It renders through the Chromium that Playwright installs — set `CHROME_BIN` to
point at another one — and writes:

| File | Size | Purpose |
| --- | --- | --- |
| `assets/icon.png` | 1024² | iOS, and the base Expo resizes from. Opaque: iOS paints transparency black |
| `assets/adaptive-icon.png` | 1024² | Android adaptive foreground, transparent |
| `assets/adaptive-icon-background.png` | 1024² | Adaptive background layer |
| `assets/monochrome-icon.png` | 1024² | Android 13 themed icons; the launcher tints whatever is opaque |
| `assets/splash-icon.png` | 1024² | Splash mark, light scheme |
| `assets/splash-icon-dark.png` | 1024² | Splash mark, dark scheme |
| `assets/favicon.png` | 192² | Expo web |
| `store-assets/play-store-icon.png` | 512² | Play Console store icon, 32-bit |
| `store-assets/feature-graphic.png` | 1024×500 | Play Console feature graphic |

Android crops an adaptive icon to a shape the launcher picks and only promises
the centred circle 66dp of the 108dp canvas across. The script measures the
rendered artwork against that circle and fails rather than shipping a mark that
a round launcher would clip.

`config/appAssets.test.ts` guards the other half: that every path `app.json`
names is a PNG that exists at the size the stores expect, that the iOS icon
carries no alpha, and that the splash opens on the same background the app then
draws. An SVG in `expo.icon` is the failure worth knowing about — Expo does not
read one, and silently ships its own placeholder icon instead.

### Still needed before the listing goes live

Neither can be produced from this repository:

- Screenshots — the Play Console wants at least two phone screenshots.
- A privacy policy URL. The app already collects location and an optional
  profile photo, and shows a KVKK notice (`components/legal/`), but Play needs
  the policy hosted at a public URL.

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
sign-in is refused. The rest of that setup is under
[Google sign-in](#google-sign-in).

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

# Step 7 — the map API moves to the server

The app held a Google Maps key and called Directions, Geocoding and Places
directly. It no longer holds one, and it no longer calls them. Everything that
touches a map API now happens here, behind `/api/maps` and two new road
endpoints.

This is not on the REVIEW.md list — it came out of the same reading of the code,
and the reason it is worth its own step is below.

---

## 1. A key inlined into the bundle is a key that has been given away

`EXPO_PUBLIC_MAP_API_KEY` was read by `src/services/googleMapsService.ts` and
appended to every request the phone made:

```ts
const params = new URLSearchParams({
  origin: coordKey(origin),
  destination: coordKey(destination),
  mode,
  key: appConfig.mapApiKey,   // ← compiled into the JS bundle
});
```

Expo inlines `EXPO_PUBLIC_*` at build time, so the key is a string constant in
the shipped bundle. Extracting it takes `unzip` and `grep`. The usual mitigation
— restrict the key to an Android package and signing SHA-1 — does not apply to
the web services: those restrictions exist for the Maps **SDK**, while
Directions, Geocoding and Places accept the key from anywhere and bill whoever
owns it. A key with an app restriction on it is still a key that answers a
`curl` from a datacentre.

The app keeps one key: the Maps SDK key that draws the tiles, written into
`AndroidManifest.xml` at prebuild. That one *can* be restricted to the package
and fingerprint, so extracting it buys nothing.

### What replaced it

| Route | Answers |
| --- | --- |
| `POST /api/maps/directions` | Decoded coordinates, seconds, metres |
| `POST /api/maps/durations` | Seconds per transport mode |
| `GET /api/maps/geocode/reverse` | The address at a point |
| `GET /api/maps/places/search` | Suggestions for what is being typed |
| `GET /api/maps/places/:placeId` | Where a chosen suggestion is |
| `GET /api/road/:id/route` | A stored road drawn as a line |
| `GET /api/road/:id/durations` | Seconds per mode for a stored road |

`MAP_API_KEY` is added in `GoogleMapsClient` and nowhere else. It is optional at
boot: without it these endpoints answer 503 and the rest of the API is
unaffected, which keeps the variable from becoming a reason a deploy fails.

---

## 2. These endpoints are public, so the throttle is what protects the key

`AccessGuard` is global, so the default would have been to require a token. That
would have broken two screens that work today: a shared road opens from a link
with no account, and the Map tab plans routes before anyone signs in. Requiring
a token would also have bought less than it appears — anyone can create an
account.

So the endpoints are `@Public()`, and three other things carry the weight:

**Per-endpoint throttling** (`MAPS_THROTTLE`), sized against what one person's
screen actually does rather than against the global 120/min:

```ts
directions: { default: { ttl: MINUTE, limit: 60 } },   // redraws on a debounce
geocode:    { default: { ttl: MINUTE, limit: 40 } },   // once per dropped pin
places:     { default: { ttl: MINUTE, limit: 90 } },   // per keystroke, debounced
```

**Caching with expiry**, per service — routes 10 minutes, addresses a day, place
details a day. Concurrent identical requests share one upstream call, which is
exactly what a dragged pin produces: the phone fires a request per debounce tick
and Google is asked once.

**Validation before spending.** A malformed coordinate, an unknown transport
mode, a 24-stop route or a one-letter search is rejected without a billed
request. `whitelist: true` also strips anything else the caller sends, so a
`key` field in the body goes no further than the DTO.

The road-level endpoints reuse the road visibility rules on top of that, so a
private road cannot be traced by asking for directions along it — the same
`RoadVisibility` clause that decides who may read a road decides who may route
it.

---

## 3. Adding a waypoint is one round trip, not two

Dropping a pin used to be: geocode from the phone, wait, then post the waypoint
with the address the phone had just learned. Two network calls, and the write
carried an address the server took on trust.

`address` is now optional on `POST /road/add-waypoint/:id` and
`PUT /road/update-waypoint/:waypointId`. When it is absent the server
reverse-geocodes the coordinates as it stores them:

```ts
// Before the transaction: a geocode is a network call to Google, and holding a
// database transaction open across one would pin a connection for as long as a
// third party takes to answer.
const address = await this.geocoding.resolveAddress(body, body.address);
```

A caller that already knows the address keeps it and spends no lookup — which is
what road migration off a phone does, and what `POST /road/create` still does
for a whole road at once.

A failed lookup does not fail the write. `resolveAddress` catches and falls back
to `Dropped pin`, because losing someone's waypoint because Google was briefly
unavailable is worse than storing it unnamed.

---

## 4. Google's failures do not become ours verbatim

Google answers 200 with a `status` field, so every response is inspected before
it is called a success. `OK` and `ZERO_RESULTS` are both answers — a pair of
points with no transit route between them on a Sunday is a fact, and it is
cached as one so a screen that keeps asking does not keep spending.

The rest are faults, and which side is at fault decides the status code:

| Google | Ours | Why |
| --- | --- | --- |
| `OVER_QUERY_LIMIT`, `OVER_DAILY_LIMIT`, `UNKNOWN_ERROR` | 503 | A retry may clear it |
| `REQUEST_DENIED`, `INVALID_REQUEST`, `NOT_FOUND` | 502 | A retry will not |
| Network failure, timeout | 503 | Ours to fix |

`error_message` is logged and never returned: it names the key, and telling a
caller *which* lever they pulled is how a probe becomes a map of the
configuration. Requests carry an 8-second timeout, so an unresponsive upstream
does not hold a request open indefinitely.

---

## 5. Verification

```
$ npm test
Test Suites: 42 passed, 42 total
Tests:       900 passed, 900 total

$ npm run test:e2e
Test Suites: 7 passed, 7 total
Tests:       123 passed, 123 total
```

The new suites, and what each is actually pinning down:

- **`polyline.spec.ts`** — decodes Google's own documented example. The decoder
  moved from the app (`@mapbox/polyline`, now removed) to here, and this is what
  says the reimplementation agrees with the reference.
- **`ttl-cache.spec.ts`** — expiry, LRU eviction, in-flight sharing, and that a
  cached `null` is not re-fetched while a *failed* request is. Caching a failure
  would strand a screen; not caching "no route" would bill for it repeatedly.
- **`google-maps.client.spec.ts`** — the status table above, and that the key
  never appears in a message the caller sees.
- **`directions.service.spec.ts`** — leg totalling, cache key composition, and
  that a mode with no route is left out of the durations map rather than
  reported as zero seconds. Zero would render as "instant" in the mode selector.
- **`geocoding.service.spec.ts`** — component picking, the `Dropped pin`
  fallback, and that a supplied address short-circuits the lookup.
- **`road-route.service.spec.ts`** — visibility scoping, and that a road with
  fewer than two waypoints costs nothing.
- **`road.controller.spec.ts`** — which handler each URL reaches.
  `/road/:id/route` is the same shape as the existing `/road/waypoint/:id`, and
  Express matches in registration order, so this is the test that would notice a
  wildcard swallowing its neighbour.
- **`test/maps.e2e-spec.ts`** — the whole stack with Google stubbed at the HTTP
  client: that the endpoints answer without a token, that a malformed request is
  turned away before anything is spent, and that a `key` field in the body is
  stripped rather than forwarded.

On the app side, `mapsService.test.ts` asserts the requests go to our API rather
than to `googleapis.com`, that a signed-out caller still gets an answer, and that
the envelope is unwrapped.

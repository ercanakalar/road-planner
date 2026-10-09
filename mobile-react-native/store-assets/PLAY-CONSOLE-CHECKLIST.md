# Publishing Travel Routes on Google Play

Store graphics and listing text were redone on 9 October 2026 from the current
`master` build, captured on a Pixel 8 Pro emulator against a local backend
filled with demo routes. No production data appears in them. Work through the
sections in order; the first one is the important one.

## 0. Before you upload

| # | What | Why it matters | What to do |
| --- | --- | --- | --- |
| 1 | **Rebuild the AAB.** The bundle in `apk-output/` (9 Oct, 16:05) predates the Turkish localisation fix made alongside these assets: route stop counts, "published routes", the copy hint on community routes and a few other strings were hard-coded in English and showed in English to Turkish users. | The Turkish screenshots show the fixed text; the store should match the app. | Review and commit the changes under `src/` (11 files, `git diff -- src`), then `OUTPUT_FORMAT=aab docker compose -f docker-compose.apk.yml run --rm build-apk`. |
| 2 | **The production Discover feed is still seed data.** On 9 Oct `GET /api/road/discover` returned "Seed route 4", "Seed route 2", "Seed route 6", "Rotam"… | It is the first thing on the Home tab, for the reviewer and for every new user. | Archive or delete those routes in the production database before the first upload (they come from `npm run seed:user-roads`, which titles them "Seed route N"). |
| 3 | **Privacy policy at a public URL.** The page is in `frontend/` (`/privacy`, English and Turkish, with a `#delete-account` section). `road-map.com.tr` did not resolve when checked on 9 Oct. | Mandatory field in both the store listing and Data safety. | Use the live Vercel URL of `/privacy` (or fix the domain), and `…/privacy#delete-account` as the account-deletion URL. |
| 4 | **Make account deletion easy to find.** The in-app path exists (Profile › KVKK consent › withdraw consent erases the account), but it is labelled as consent withdrawal. | Play requires in-app deletion to be "readily discoverable"; a reviewer looking for "Delete account" will not find it. | Add a *Delete account* row in Profile that opens the same withdrawal flow. Not usually a first-submission rejection, but it is the policy. |
| 5 | **Play App Signing changes the signing certificate.** Google re-signs with its own key; your keystore becomes the upload key. | Google sign-in and share-link app links are keyed to the installed certificate. | After the first upload: *Setup → App signing*. Add that SHA-1 to the Android OAuth client and that SHA-256 to `/.well-known/assetlinks.json` on the share-link host. Test both from the internal-testing install. |

Found while capturing; worth fixing, not blockers:

- **Public transport for a whole route is always "—"** once a route has more
  than two stops. `hooks/map/useRouteDirections.ts` sends the middle stops as
  `waypoints` for every mode, and Google's Directions API does not support
  waypoints for transit. A single section (two stops) works. Summing the
  per-section transit times would fix it. The listing copy and screenshots
  only promise transit times for sections.
- **Dark theme keeps a light basemap**, so the dark-theme route colours sit on
  a light map. Screenshots use the light theme.
- **The Travel map colours bounding rectangles**, not country outlines. It is
  described in the listing but kept out of the screenshots.
- The Home *Favourites* tile counts only your own hearted routes, so someone
  who has saved five routes by other people sees 0.

## 1. Assets in this folder

| Play Console field | File | Spec |
| --- | --- | --- |
| App icon | `play-store-icon.png` | 512×512, 32-bit PNG ✔ |
| Feature graphic (en-US) | `feature-graphic-en.png` | 1024×500, 24-bit PNG, no alpha ✔ |
| Feature graphic (tr-TR) | `feature-graphic-tr.png` | same, Turkish tagline |
| Phone screenshots (en-US) | `screenshots/phone/en/01…08-*.png` | 8 × 1080×1920 (9:16), 24-bit PNG ✔ |
| Phone screenshots (tr-TR) | `screenshots/phone/tr/01…08-*.png` | same, Turkish UI, content and captions |
| Store listing text | `listing/en-US.md`, `listing/tr-TR.md` | name, short and full description, release notes, captions, all within limits |
| Source for the graphics | `source/` | templates, fonts and render script; see `source/README.md` |

Upload the screenshots in file-name order: the first two or three are the
ones most people see without scrolling.

**Tablet screenshots** are optional and were left out. The app is a portrait
phone layout, and Google asks for tablet screenshots to show the app running
on a tablet; phone images re-framed on a tablet canvas are what the old
`tablet7/` and `tablet10/` folders held. Without tablet screenshots the phone
ones are shown to tablet users, which is the honest presentation for this app.

**Promo video** is optional and there is none (`video/` is empty). Play takes
a YouTube URL if you make one later.

## 2. Store settings

| Field | Value |
| --- | --- |
| App category | Maps & Navigation (Travel & Local also fits; Maps & Navigation has fewer large trip planners competing) |
| Tags | Pick up to five from Play's list, for example: Trip planner, Route planner, Navigation, Travel, Maps |
| Contact email | Required and shown publicly |
| Website | Optional; the `/privacy` site is fine |
| Pricing | Free (cannot be changed to paid later) |
| Contains ads | No |
| In-app purchases | No |

## 3. App access (reviewer credentials)

The Map tab works signed out, but Routes, Favourites, sharing and publishing
need an account. Choose *"All or some functionality is restricted"* and add:

    Email:    playreview@travelroutes.net
    Password: PlayReview2026
    Notes:    Sign in from Profile → Sign in. Map tab works without signing in.
              Google sign-in is optional; email/password is enough.

This account was created on production on 20 Sep. Sign in with it once before
submitting to make sure it still works; keep it after review.

## 4. App content declarations

**Privacy policy**: the hosted `/privacy` URL (see §0.3).

**Ads**: No.

**App access**: restricted; credentials above.

**Content rating (IARC)**: category *Utility, Productivity, Communication, or
Other*. **No** to violence, sexuality, language, controlled substances and
gambling. **Yes** to *users can interact or exchange content* (published
routes carry a title, description and author name). **No** to *shares the
user's current location with other users*: published stops are places the
user chose, not where they are. Expected result: Everyone / PEGI 3.

**Target audience**: *18 and over* is the simplest honest answer and keeps the
app out of the Families programme.

**News, COVID-19, government, financial features, health**: No / None.

**Data safety**:

| Question | Answer |
| --- | --- |
| Does your app collect or share any of the required user data types? | Yes |
| Is all collected data encrypted in transit? | Yes |
| Do you provide a way for users to request deletion? | Yes: in the app, and the `#delete-account` URL |
| **Location → Approximate / Precise** | Collected, not shared. Optional. App functionality. (Stops a user saves carry coordinates; the live position for follow mode stays on the phone.) |
| **Personal info → Name** | Collected, not shared. Optional. App functionality, Account management. |
| **Personal info → Email address** | Collected, not shared. Required for an account. Account management. |
| **Personal info → User IDs** | Collected, not shared. Account management. |
| **Photos and videos → Photos** | Collected, not shared. Optional (profile picture). App functionality. |
| **App activity → App interactions** | **Collected, not shared. Required. Analytics, App functionality.** The backend records which features are used (route calculated, search along a route, favourite toggled…), linked to the account when signed in, and shows them back under *Your statistics*. New since the September checklist. |
| **App activity → Other user-generated content** | Collected, not shared. Optional. App functionality (route titles and descriptions). |
| **App info and performance** | Not collected (no crash-reporting SDK) |
| **Device or other IDs** | Not collected |
| Everything else (financial, health, messages, contacts, calendar, audio, files, web browsing, search history, installed apps) | Not collected |

Google Maps Platform receives coordinates and search text as a service
provider acting for you, which the form does not count as sharing. Routes a
user publishes are shown to other users of the app, which is not sharing in
the form's sense either; the privacy policy says both.

**Advertising ID**: not used. Answer No.

**Foreground service**: none declared (blocked in `app.json`), so the form
does not appear. If it does, the build is stale.

**User-generated content**: users publish routes with free text that others
see, so Play's UGC policy applies and expects a way to report content and
block users. Neither exists yet; worth adding as the community grows.

## 5. Release setup

1. *Setup → App signing*: accept Play App Signing, then §0.5.
2. *Store presence → Main store listing*: paste `listing/en-US.md`, upload the
   icon, `feature-graphic-en.png` and `screenshots/phone/en/`. Add Turkish
   (tr-TR) as a translation, paste `listing/tr-TR.md` and upload
   `feature-graphic-tr.png` and `screenshots/phone/tr/` there. Without the
   Turkish graphics, Turkish users see the English ones.
3. *Store presence → Store settings*: §2.
4. *Testing → Closed testing*: the tester list and the 12-testers-for-14-days
   rule are in `testers/README.md`.
5. *Testing → Internal testing*: upload the rebuilt AAB and install from the
   Play link. This is the only way to try the app signed with Google's key:
   check Google sign-in and share links here.
6. *Production → Countries*: Türkiye at minimum; the app is not region-locked.
7. Create the release, paste the release notes from the listing files (Play
   takes both languages in one box as `<en-US>…</en-US>` and
   `<tr-TR>…</tr-TR>`), and roll out.

Each later upload needs a higher `android.versionCode` in `app.json` (it is
`1` now).

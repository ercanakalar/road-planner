# Publishing Travel Routes on Google Play

Everything in this folder was produced on 20 September 2026 from the release
build in `apk-output/`, running against the production API on Cloud Run.
Work through the sections in order; the first one is the important one.

## 0. Fix before submitting

These were found while running the release build. Each will cost a rejection,
a bad first impression, or both.

| # | What | Why it matters | Where |
| --- | --- | --- | --- |
| 1 | **The production Discover feed is full of seed data** — "Test Route 3145", author "test44", stops named "Start point → Destination". Search shows the same. | It is the first thing on the Home tab, for reviewers and users alike. | Backend database: archive or delete every route whose author is a `test*` user before the first upload. |
| 2 | **No in-app account deletion.** Deletion is by email only. | Play's *account deletion* policy requires an in-app path **and** a web link for any app that lets users create an account. The web link is covered (see §3); the in-app path is not. | Add a "Delete account" action under *Profile › Edit profile* backed by a `DELETE /user/me` endpoint. Until then, expect a policy notice — not always an outright rejection at first submission, but it will come. |
| 3 | **Privacy policy must be at a public URL.** | Mandatory field; the in-app KVKK notice does not count. | Host `privacy-policy.html` (GitHub Pages, Cloud Storage bucket, any static host). Put its URL in *Store listing → Privacy policy* **and** *App content → Data safety*. Use the `#delete-account` anchor for *App content → Data deletion*. |
| 4 | **Upload an AAB, not the APK.** | Play accepts app bundles only. | `OUTPUT_FORMAT=aab docker compose -f docker-compose.apk.yml run --rm build-apk` → `apk-output/travel-routes-release.aab`. (Added in this change.) |
| 5 | **Play App Signing changes the signing certificate.** Google re-signs with an app-signing key it generates; the keystore in `~/.keystores` becomes the *upload* key only. | Google sign-in (OAuth Android client) and share-link app links (`assetlinks.json`) are keyed by SHA-1/SHA-256 of the *installed* certificate, which will be Google's. | After the first upload: *Play Console → Setup → App signing → App signing key certificate*. Add **that** SHA-1 to the Android OAuth client (keep the upload key's too, for local builds) and **that** SHA-256 to `/.well-known/assetlinks.json` on the share-link host. |
| 6 | **Unused permissions were in the release manifest** — CAMERA, RECORD_AUDIO, SYSTEM_ALERT_WINDOW, USE_BIOMETRIC, RECEIVE_BOOT_COMPLETED, and a `foregroundServiceType="location"` service. | Camera/microphone in the manifest of an app that uses neither invites review questions; the location foreground service triggers a mandatory declaration form plus demo video. | Fixed in `app.json` (`blockedPermissions`, image-picker options) and `plugins/withoutLocationService.js`. **Rebuild** — the APK in `apk-output/` predates this. |
| 7 | Sign-up said "At least 6 characters" and validated 6; the API requires 8 with a letter and a digit. | A reviewer trying a short password got a server error instead of a hint. | Fixed in `hooks/auth/useSignUpForm.ts` — part of the same rebuild. |

Smaller things noticed, not blockers: the map basemap stays light in dark
theme (the custom style is not applied on this device); the *Travel map*
colours in bounding rectangles rather than country outlines, so it was left
out of the screenshots; the "Transit" mode showed "—" for the Istanbul route.

## 1. Assets in this folder

| Play Console field | File | Spec |
| --- | --- | --- |
| App icon | `play-store-icon.png` | 512×512 PNG ✔ |
| Feature graphic | `feature-graphic.png` | 1024×500 PNG ✔ |
| Phone screenshots (en-US) | `screenshots/phone/en/01…08.png` | 1080×1920, 8 images ✔ (2–8 required, 16:9–9:16, ≤ 2:1) |
| Phone screenshots (tr-TR) | `screenshots/phone/tr/` | same, Turkish captions |
| 7-inch tablet screenshots | `screenshots/tablet7/{en,tr}/` | 1200×1920 |
| 10-inch tablet screenshots | `screenshots/tablet10/{en,tr}/` | 1600×2560 |
| Promo video | `video/promo-2x.mp4` | 56 s, 1080×2404, no audio. Play wants a **YouTube URL**: upload it (unlisted is fine, ads off, not age-restricted), paste the link. Optional field. |
| Store listing text | `listing/en-US.md`, `listing/tr-TR.md` | title, short/full description, release notes, category |
| Privacy policy | `privacy-policy.html` | host it, see §0.3 |

The tablet images are the phone captures re-framed on a larger canvas; the app
is portrait-only and renders the same UI on tablets. Regenerate everything with
`python3 <scratch>/compose.py store-assets/screenshots` after recapturing —
the raw captures are not kept in the repo.

## 2. App access (reviewer credentials)

The Map tab works signed out, but Routes, Favourites, sharing and publishing
need an account. Choose *"All or some functionality is restricted"* and add:

    Email:    playreview@travelroutes.net
    Password: PlayReview2026
    Notes:    Sign in from Profile → Sign in. Map tab works without signing in.
              Google sign-in is optional; email/password is enough.

This account exists on production (created today) and owns one public route,
"Old City to the Bosphorus". Change the password after review if you like;
keep the account.

## 3. App content declarations

**Privacy policy** — the hosted URL of `privacy-policy.html`.

**Ads** — No, the app contains no ads.

**App access** — restricted; credentials above.

**Content rating (IARC questionnaire)** — category *Utility, Productivity,
Communication, or Other*. Answer **No** to violence, sexuality, language,
controlled substances, gambling. **Yes** to *"users can interact or exchange
content"* (published routes carry a title, description and author name) and
*"shares the user's current location with other users"* → **No** (location is
never shared; published stops are places the user typed, not where they are).
Expected result: Everyone / PEGI 3.

**Target audience** — *18 and over* is the simplest honest answer and keeps
the app out of the Families programme. (13–17 would also be truthful, but
then every under-18 question has to be answered as well.)

**News app** — No. **COVID-19 contact tracing** — No. **Government app** — No.
**Financial features** — None. **Health** — None.

**Data safety** — the form, section by section:

| Question | Answer |
| --- | --- |
| Does your app collect or share any of the required user data types? | Yes |
| Is all collected data encrypted in transit? | Yes |
| Do you provide a way for users to request deletion? | Yes — the `#delete-account` URL |
| **Location → Approximate location** | Collected, not shared. Optional (user can deny). Purpose: App functionality. Not processed ephemerally (start/end coordinates are stored with the route). |
| **Location → Precise location** | Same as above |
| **Personal info → Name** | Collected, not shared. Optional. App functionality, Account management. |
| **Personal info → Email address** | Collected, not shared. Required for account holders. Account management. |
| **Personal info → User IDs** | Collected (account id), not shared. Account management. |
| **Photos and videos → Photos** | Collected, not shared. Optional (profile picture). App functionality. |
| **App activity → Other user-generated content** | Collected, not shared*. Optional. App functionality. (route titles/descriptions) |
| **App info and performance → Crash logs / Diagnostics** | Not collected (no crash-reporting SDK) |
| **Device or other IDs** | Not collected |
| Financial info, Health, Messages, Contacts, Calendar, Audio, Files, Web browsing, Search history, Installed apps | Not collected |

\* Google's definition of "shared" is transfer to a third party. Google Maps
Platform receives coordinates and search text as a *service provider* acting
on your instructions, which the form lets you exclude. Routes a user
publishes are shown to other users of the same app, which is also not
"sharing" in the form's sense — but say so in the privacy policy (done).

**Advertising ID** — the app does not use it (no ads/analytics SDK). Answer No.

**Foreground service permissions** — after the rebuild in §0.6 the manifest
no longer declares one, so the form does not appear. If it does, the build
is stale.

**User-generated content.** Because users can publish routes with free-text
titles and descriptions that others see, Play's UGC policy technically
applies. It expects a way to report content and to block users. Neither
exists today. This is worth adding before the app has many users; it is not
usually checked at first submission for a small app, but it is a policy.

## 4. Release setup

1. `Setup → App signing`: accept Play App Signing (default). Then do §0.5.
2. `Setup → App integrity`: nothing to do.
3. `Store presence → Main store listing`: paste `listing/en-US.md`; add a
   Turkish translation and paste `listing/tr-TR.md`; upload icon, feature
   graphic, the phone and tablet screenshots for each language.
4. `Store presence → Store settings`: category *Maps & Navigation*, contact
   email (public), tags.
5. `Monetise → Pricing`: Free (cannot be changed to paid later).
6. `Release → Testing → Internal testing`: upload the AAB here first, add
   yourself as a tester, install from the Play link. This is the only way to
   see the app signed with Google's key — check Google sign-in and share links
   *here* before production.
7. `Release → Production → Countries`: pick countries (Türkiye at minimum;
   "all" is fine, the app is not region-locked).
8. Create the production release, paste the release notes, roll out. The
   first review takes anywhere from a few hours to about a week.

Each later upload needs a higher `android.versionCode` in `app.json` (it is
`1` now) — Play rejects a bundle with a code it has already seen.

## 5. Not needed / not applicable

- Google Play *Developer verification* for the package (the `withAdiRegistration`
  plugin) is separate from Play publishing and already handled in this repo.
- No 3rd-party SDK disclosures: the only SDKs are Expo/React Native, Google
  Maps and Google Sign-In.
- No age-gating, no subscriptions, no in-app purchases.

# Step 8 — Google sign-in that finishes, and a profile to show for it

Two problems, one visible and one not.

The visible one: the account picker opened, the user chose an account, and the
app stayed on the sign-in screen with the button spinning. Nothing was logged,
nothing was shown, and the flow had no state it could be nudged out of.

The invisible one: on the occasions it *did* complete, the account it created
held an email address and nothing else. The profile screen had a name to render
and no name to render in it.

---

## The app never learned that the exchange had failed

`expo-auth-session`'s Google provider does not return an id token on a phone.
`useIdTokenAuthRequest` falls back to the authorization-code flow on native and
then exchanges the code for tokens *inside the library*:

```js
exchangeRequest.performAsync(discovery).then((authentication) => {
  setFullResult({ ...result, params: { id_token: authentication?.idToken ?? '' } });
});
```

There is no `.catch`. When Google refuses the code — a client id belonging to
another platform, a redirect URI the OAuth client does not know, a signing
certificate that does not match, no route to `oauth2.googleapis.com` — the
promise rejects, `setFullResult` is never called, and the hook's response stays
`null` forever. The app was watching that response:

```ts
useEffect(() => {
  if (!response) return;      // ← never runs
  setIsPrompting(false);      // ← so this never runs either
  ...
```

So `isBusy` stayed true and the button spun until the screen was closed. Every
one of those causes is a configuration mistake with a specific fix, and none of
them reached anyone.

The second half of it: `GoogleSignInButton` destructured `isAvailable`,
`isBusy` and `signIn` from the hook and left `error` behind. Even the failures
the hook *did* record — a response of type `error`, a rejected API call — were
recorded into a state nothing rendered.

### Now

The app runs the exchange itself (`exchangeCodeAsync`, `shouldAutoExchangeCode:
false`), with a timeout, a catch, and a message for each outcome. Backing out of
the picker is still not an error; everything else says what happened, under the
button and in the log under a `[google-sign-in]` prefix. A spent authorization
code is released on failure, so a second attempt is a real attempt.

Expo Go is refused up front rather than allowed to fail this way: it is one
shared app under one shared package name, Google's redirect to
`net.travelroutes.travelroutes:/oauthredirect` cannot reach it, and no
configuration changes that.

## The token's audience had to be one particular client id

Native sign-in accepted only the ids in `GOOGLE_NATIVE_CLIENT_IDS`. A token
addressed to the project's *web* client — what a native sign-in SDK asks for,
and what half the setup instructions on the internet produce — was refused with
a bare 401, from a server that had verified the signature and knew exactly why
it was unhappy.

### Now

`GOOGLE_CLIENT_ID` is accepted alongside them. Both belong to the same Google
project, which is the property that matters; a client id from another project is
still rejected. And when verification fails on an audience the server was never
told about, the log says which one:

```
Rejected Google id token: Wrong recipient. The token is addressed to
123-web.apps.googleusercontent.com, which is not among the accepted client ids
(456-android.apps.googleusercontent.com) — add it to GOOGLE_NATIVE_CLIENT_IDS
if it belongs to this project
```

The claim is read without verifying the token, purely to name the mismatch, and
only client ids are ever written out.

`GoogleService.onModuleInit` now logs at boot which halves of Google sign-in are
configured, so a half-configured server can be diagnosed before a phone is
picked up.

## The account had an email and nothing else

`getEmailFromIdToken` returned a `string`. `signInWithGoogle(email)` wrote that
string and created a session. The id token it discarded carried `name`,
`given_name`, `family_name` and `picture`; `User` had `firstName`, `lastName`
and `photo` sitting empty; and `GoogleAuthClient` had already declared all four
fields for the browser flow, which also threw them away.

### Now

Both paths build the same `GoogleProfile` — one mapper, since the id token and
the userinfo response carry the same fields under the same names — and
`signInWithGoogle` persists it:

- A new account is created with whatever Google returned.
- An existing account has only its **empty** fields filled in. A name or an
  avatar the user set here is theirs; signing in again is not a request to
  replace it.
- The one exception is an avatar that came from Google in the first place, which
  is refreshed on each sign-in because `googleusercontent.com` URLs rotate and
  the stored one stops resolving.

Only `https` avatars are stored: the URL is handed straight to the phone's image
loader, and anything else would either fail to load or be a scheme the client was
never meant to follow. A display name is preferred structured (`given_name` +
`family_name`) and split on the first space otherwise — wrong for some names, but
a first name the user can correct beats an empty profile.

The response carries the stored profile as well as the session, so what was saved
is visible without a second call.

## Verified

- `google.service.spec.ts` — profile extraction from both Google responses, the
  audience list, the mismatch hint, name splitting and avatar validation.
- `auth.service.spec.ts` — what is written for a new account, what is left alone
  on an existing one, and the avatar-refresh exception.
- No schema migration: `firstName`, `lastName` and `photo` already existed.

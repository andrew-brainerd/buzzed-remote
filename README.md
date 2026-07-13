# Buzzed Remote

Tauri 2 desktop/iOS app for [Buzzed](../docs/specs/buzzed.md) — the ring-in buzzer for anime intro quizzes.

Its one irreplaceable job: **pause the Roku when someone rings in.** brainerd-api runs on Heroku and can
never reach a private LAN IP, so the ECP call has to come from a client in the room. That's this app.

Forked from `watch-remote` (same Rust ECP layer, Firebase login, and API proxy).

## What it does (thin slice)

- Firebase email/password sign-in
- Add a Roku by IP (validated against the device before it's saved)
- Join a game by code, or open one you're already in
- Big buzzer + live scoreboard
- **Host only:** cast the video to the TV, start the game, and drive pause/resume on every ring-in

Create the game on the web (`/buzzed/new` — pick the **Roku TV** target and enter the Roku's IP), then open
it here.

## The bit that matters

**Roku's ECP has no pause key — `keypress/Play` is a play/pause TOGGLE.** Fire it twice and the video is
playing again. So `utils/rokuControl.ts` never toggles blind: it reads `/query/media-player` first and only
sends the keypress when the device isn't already where we want it. That makes it idempotent — a retry, a
duplicate event, or a reconcile can't flip the video the wrong way.

Verified on-device (Ernest, YouTube 2.26.74): the YouTube app *does* report `state="play"|"pause"` and a
live position, and Play toggles cleanly.

**Only the host's app drives the TV.** Everyone else — app or web — is a pure buzzer, so exactly one client
ever sends a keypress. Friends don't need to install anything; they can buzz from `/buzzed` on their phone.

## Setup

```sh
pnpm install
cp .env.example .env   # Firebase web config + VITE_PUSHER_APP_KEY (same values as next-portfolio)
pnpm dev               # tauri dev (desktop)
pnpm verify            # lint + typecheck + test
```

The API base defaults to prod on mobile and local (`https://127.0.0.1:5002/api`) on desktop — see
`stores/configStore.ts`. Run brainerd-api with `pnpm dev` for the local one.

## Auth

Native clients can't hold a browser session cookie, so the app signs in with the Firebase SDK and sends the
resulting **ID token** as a bearer. `brainerd-api`'s `firebaseAuthMiddleware` tries `verifySessionCookie`
first and falls back to `verifyIdToken` — the two are distinguishable by their `iss` claim, so one is never
mistaken for the other.

All HTTP goes through the Rust proxy (`brainerd_api` command) rather than `fetch` from the webview: it
sidesteps CORS entirely and lets debug builds accept the local self-signed cert.

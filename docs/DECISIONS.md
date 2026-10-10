# Decisions

Notable choices, newest last. Each one says what was decided and why, so a
later change can tell whether the reason still holds.

## 2026-10-10 — An installed app with OAuth, not a script app

Reddit has no personal access tokens. Of its app types, a "script" app holds
a secret and is meant for scripts run by its developer; an "installed" app has
a client ID only and is meant for phones. Perch is an installed app: the
person signs in on Reddit's own page in Safari's sign-in sheet, and the app
keeps a permanent refresh token in the Keychain. The password never reaches
the app, two-factor sign-in works, and the access can be revoked from
Reddit's settings. Signing out revokes the refresh token too.

New apps need Reddit's approval since late 2025, so the app is built against
a fake Reddit first, and its screenshots go with the application.

## 2026-10-10 — A private sign-in session

The sign-in sheet runs as a private (ephemeral) session: Reddit's page shares
no cookies with Safari. It means signing in to Reddit in the sheet even when
Safari is signed in, which happens once, since the refresh token lasts. In
return iOS skips its "wants to use reddit.com to sign in" alert, which also
lets the simulator walkthrough sign in against the fake without it.

## 2026-10-10 — The client ID is typed on the phone

An installed app's client ID is not a secret, but this repository is public
and personal, as pokecollector-app is: nothing about the owner's Reddit app
goes into the code or the build. The first-run screen asks for it, and it is
kept in the Keychain beside the refresh token.

## 2026-10-10 — Anonymous mode uses application-only tokens

Reddit's unauthenticated `.json` endpoints are heavily rate-limited and often
blocked. Anonymous mode instead gets an application-only token (the
`installed_client` grant) with a random device ID kept on the phone: the same
API, the same rate limit, no account. It shows Popular, Browse and any
subreddit; Home and Saved, which need an account, leave the tab bar.

## 2026-10-10 — Schemas by hand, checked child by child

Reddit publishes no OpenAPI spec, so unlike pokecollector-app there is no
generated client. `src/api/schemas.ts` describes only the fields the app
reads, with loose objects and defaults. Listings are checked one child at a
time, so one post Reddit sends in an odd shape is dropped, not the page.

## 2026-10-10 — The swiper opens over the feed

The design showed four views: list, cards, grid and swiper. The swiper is
fullscreen, with a close button, so it is a modal over the feed rather than a
fourth way to lay it out: the feed's view buttons and its grid tiles open it,
and it reads the same cached pages the feed loaded. Settings' "new feeds open
as" offers list, cards and grid.

## 2026-10-10 — A small Markdown renderer of our own

Posts and comments are Reddit Markdown. The JavaScript renderers for React
Native are large, old, or both, and miss Reddit's spoilers and superscript.
`src/utils/markdown.ts` parses the subset Reddit uses into blocks and runs
that `src/components/markdown.tsx` draws with native text, and anything it
does not understand is shown as text. Tables are the known gap.

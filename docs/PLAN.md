# Perch — Build Plan

A personal, read-only Reddit reader for iOS. Built with **Expo (React
Native)**, compiled on a **GitHub Actions macOS runner**, and installed with
**SideStore** using a free Apple ID, exactly as
[pokecollector-app](https://github.com/jrmcdonald/pokecollector-app) is.

> **For Claude Code:** Read this whole file before starting. Work phase by
> phase and tick checkboxes as you go. Where this plan conflicts with what
> Reddit's API actually does, the API wins; note the difference in
> `docs/DECISIONS.md`.

---

## 1. Goals and non-goals

**Goal:** a clean, fast reader for one person's Reddit:

- The home feed (subscriptions), Popular, and any subreddit
- Posts with their media (images, galleries, Reddit video, links) and comments
- Saving and unsaving posts and comments, and a Saved tab to read them back
- Image modes: large cards, a grid, and a fullscreen swiper, alongside the list
- Light and dark mode, following the phone or set in Settings
- NSFW and spoiler media covered until tapped; NSFW posts hideable entirely
- Signed-in mode, and an anonymous mode with no account

**Non-goals:** voting, commenting, posting, messages, notifications,
moderation, multiple accounts, iPad, Android, App Store release. None of
these will be added: the API application promises read and save only.

**Constraints:**

- No Mac. iOS builds happen in CI.
- No paid Apple Developer account: apps expire after 7 days (SideStore
  refreshes them), at most 3 sideloaded apps, at most 10 App IDs a week, no
  push notifications.
- Reddit no longer issues API keys on request. Since late 2025 an app needs
  Reddit's approval (the Responsible Builder Policy). The first build exists
  partly as evidence for that application (§6).
- Reddit allows 100 requests a minute per client ID.

---

## 2. Architecture

```
iPhone app (Expo / React Native)
   │  sign-in: Safari's sign-in sheet (ASWebAuthenticationSession, private session)
   │    → https://www.reddit.com/api/v1/authorize.compact  (installed app, duration=permanent)
   │    ← perch://oauth/callback?state=…&code=…
   │  tokens: POST https://www.reddit.com/api/v1/access_token   (Basic <client ID>:)
   │    authorization_code → refresh token, kept in the Keychain
   │    refresh_token      → an hour's access token
   │    installed_client   → an anonymous access token, with a random device ID
   ▼
https://oauth.reddit.com  (Authorization: Bearer <access token>, raw_json=1)
```

- **One client, one token at a time.** `src/api/client.ts` refreshes the
  access token as it expires, shares one refresh between concurrent requests,
  retries once on a 401, and reads `X-Ratelimit-*` to wait or fail before
  Reddit refuses.
- **Nothing personal in the build.** The client ID is typed in on first run
  and kept in the Keychain with the refresh token and device ID. The repo is
  public.
- **Cache first.** TanStack Query with its cache persisted to AsyncStorage: a
  feed is fresh for five minutes, subscriptions for an hour, and the last
  feeds show offline and on a cold start.
- **Tests against a fake Reddit.** `e2e/server` serves made-up data on
  Reddit's own paths, sign-in included. A simulator build points every Reddit
  address at it (`REDDIT_ORIGIN`), and the walkthrough signs in, visits every
  screen, screenshots and audits each.

---

## 3. Screens

| Screen    | Route             | Notes                                                     |
| --------- | ----------------- | --------------------------------------------------------- |
| First run | `welcome`         | Client ID; Sign in with Reddit; Browse anonymously        |
| Home      | `(tabs)/home`     | `/best`; hidden in anonymous mode                         |
| Popular   | `(tabs)/popular`  | `/r/popular`, global; "Anonymous" badge in that mode      |
| Browse    | `(tabs)/browse`   | Subreddit search; subscriptions when signed in            |
| Saved     | `(tabs)/saved`    | Posts / comments, filter; hidden in anonymous mode        |
| Settings  | `(tabs)/settings` | Account, theme, default view, autoplay, NSFW and spoilers |
| Subreddit | `r/[name]`        | About header, then its feed                               |
| Post      | `post/[id]`       | Media, Markdown body, comments; `?focus=` for one thread  |
| Swiper    | `swiper`          | Fullscreen modal over a feed's cached pages               |

Every feed has a sort (Best/Hot/New/Top with a period/Rising) and a view
(list, cards, grid) remembered per feed, plus a button that opens the swiper.

---

## 4. Phases

### Phase 0 — Access and scaffold

- [x] README describing the app and its API use, for the application
- [x] Repo scaffold: Expo SDK 57, TypeScript strict, lint, format, Jest
- [x] CI, iOS build, release and simulator workflows; Renovate; release-please
- [x] Default branch `main`, as in pokecollector-app
- [ ] Apply for API access, with the README and the simulator screenshots
- [ ] First dev client build; commit the `native/Podfile.lock` it prints

### Phase 1 — Client and sign-in

- [x] OAuth installed-app flow, refresh token in the Keychain, revoke on sign-out
- [x] Anonymous mode with application-only tokens
- [x] Client: token refresh, 401 retry, rate limit, error mapping
- [x] zod schemas for listings, posts, comments, subreddits, tokens
- [ ] Try on the phone with a real client ID, once Reddit approves the app

### Phase 2 — Feeds

- [x] Home, Popular, subreddits; sorts with periods; infinite scroll
- [x] List, cards and grid views, remembered per feed
- [x] NSFW and spoiler covers; hiding NSFW posts
- [x] Light and dark palettes, with contrast tests
- [ ] Mark posts already opened (dimmed titles)

### Phase 3 — Posts and comments

- [x] Images, galleries, Reddit video and GIFs, link cards
- [x] Markdown renderer: paragraphs, quotes, lists, code, emphasis, links, spoilers
- [x] Comment tree with collapsing, "load more", "continue this thread"
- [ ] Pinch to zoom in the swiper and on a post's image
- [ ] Tables in Markdown

### Phase 4 — Saved and image modes

- [x] Saved posts and comments, filter, save and unsave everywhere
- [x] Fullscreen swiper over any feed, from the grid or the view buttons
- [ ] Muted subreddits and keywords

### Phase 5 — Polish

- [ ] Walkthrough screenshots approved; accessibility audit clean at both sizes
- [ ] SideStore source and first release
- [ ] Share sheet: open a reddit.com link in Perch (an app extension costs an App ID)

---

## 5. Settings

Kept in AsyncStorage (`src/settings/preferences.ts`), nothing secret:
theme, show NSFW, cover NSFW, cover spoilers, default view, each feed's view,
video autoplay (always, on Wi-Fi, never) and the comment sort.

---

## 6. The API application

Reddit reviews each request for API access. What it asks for, and what this
repo gives it:

- **What the app does:** the README, and the simulator screenshots in
  `e2e/screenshots/` once approved (every screen, signed in and anonymous,
  light and dark).
- **App type and redirect URI:** installed app, `perch://oauth/callback`.
- **Scopes:** `identity read mysubreddits history save`, each justified in the
  README.
- **Volume:** one user, well under 100 requests a minute, cached on the phone.
- **Data:** nothing leaves the phone except requests to Reddit; nothing is
  shared, sold or used for training.

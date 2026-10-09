# Perch

A personal, read-only Reddit reader for iOS. One user, sideloaded onto one
phone, never published to the App Store.

Perch is for reading: your home feed, Popular, any subreddit, posts and their
comments, and the posts you save. It does not post, comment, vote, message or
moderate, and it has no ads, analytics or tracking.

> **Status:** planning. The app is not built yet. This README describes what it
> will do and exactly how it will use Reddit's API.

## Features

- Home feed (your subscriptions), Popular, and browsing any subreddit
- Posts and threaded comments
- Save and unsave posts and comments; a Saved tab to read them back
- Three image modes alongside the normal list: large cards, a thumbnail grid
  and a fullscreen swiper
- Light and dark mode, following the system or set by hand
- NSFW and spoiler media covered until tapped
- Signed-in mode, and an anonymous mode that browses Popular and subreddits
  with no account

## How it uses Reddit's API

Perch is a non-commercial, single-user client of the Reddit Data API, used
within Reddit's Developer Terms and Data API Terms.

| | |
| --- | --- |
| App type | Installed app (no client secret) |
| Users | One: the developer |
| Sign-in | OAuth 2 authorization code flow in Safari's secure sign-in sheet (`ASWebAuthenticationSession`). The app never sees the Reddit password. |
| Redirect URI | `perch://oauth/callback` |
| Token storage | The refresh token is kept in the iOS Keychain on the device, and is revoked on sign-out |
| Anonymous mode | Application-only OAuth (`https://oauth.reddit.com/grants/installed_client`), with no user account |
| User-Agent | `ios:perch:<version> (by /u/<developer>)` |

### Scopes

| Scope | Why |
| --- | --- |
| `identity` | Show which account is signed in |
| `read` | Read feeds, subreddits, posts and comments |
| `mysubreddits` | Build the home feed and list subscriptions |
| `history` | Read the signed-in user's saved posts and comments |
| `save` | Save and unsave posts and comments |

No other scopes are requested. In particular, Perch never asks for `submit`,
`vote`, `edit`, `privatemessages` or any moderation scope.

### Requests and rate limits

- Well under Reddit's limit of 100 requests a minute. Reading normally means a
  handful of requests a minute, one for each page of a feed or comment thread.
- Responses are cached on the device, and Perch honours the
  `X-Ratelimit-*` headers, backing off before reaching the limit.
- Images and video are loaded from the URLs that Reddit's API returns.

### Data

- Nothing leaves the phone except requests to Reddit itself. There is no
  server, analytics, crash reporting or third-party SDK that collects data.
- Reddit content is cached on the device only to make the app fast and to cut
  requests. It is never shared, sold, used to train models or kept off the
  device.
- Deleted content is not archived: cached items are refreshed from Reddit, and
  anything Reddit no longer returns is dropped.

## Built with

[Expo](https://expo.dev) and React Native, written in TypeScript. iOS builds
run on GitHub Actions, and the app is installed with SideStore.

## Not affiliated with Reddit

Perch is an independent personal project. It is not made, endorsed or supported
by Reddit, Inc. "Reddit" is a trademark of Reddit, Inc.

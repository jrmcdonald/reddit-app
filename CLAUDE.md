# CLAUDE.md

Context for Claude Code sessions working on this repo. It is public, and
licensed under the Unlicense.

## What this repo is

Perch: a personal, read-only Reddit reader for iOS (Expo / React Native). It
talks to Reddit's Data API as an OAuth "installed app", signed in with the
owner's account or anonymously. Built and released the same way as
[pokecollector-app](https://github.com/jrmcdonald/pokecollector-app). Read
`docs/PLAN.md` before starting work and `docs/DECISIONS.md` before changing an
approach.

## Expo has changed — do not trust your training data

This is Expo SDK 57 (React Native 0.86, TypeScript 6). APIs you remember may be
renamed or gone. Check the installed package's types in `node_modules`, or the
versioned docs at `https://docs.expo.dev/versions/v57.0.0/`.

## Commands

```bash
npm start                     # Metro for the dev client (the normal loop)
npm run lint                  # expo lint
npm run typecheck             # tsc --noEmit (app, e2e and scripts)
npm run format                # prettier --write .
npm test                      # jest
EXPO_OFFLINE=1 npx expo install <pkg>   # add a dependency at the SDK's version
```

Run lint, typecheck, format check and tests before declaring anything done. CI
runs the same.

`EXPO_OFFLINE=1` matters in Claude Code on the web: the network policy blocks
`api.expo.dev`, and without it `expo install` fails. The SessionStart hook
(`.claude/hooks/session-start.sh`) sets it, with `EXPO_NO_TELEMETRY`, and runs
`npm install` at the start of every web session.

## Dependencies

Renovate (`renovate.json`) automerges minor and patch updates of ordinary
JavaScript dependencies and action digests. Everything Expo decides the
version of (React, React Native, `expo-*`, native modules) is one "Expo SDK"
group that Renovate raises only when asked from its Dependency Dashboard. An
SDK upgrade is `npx expo install expo@^<next> && npx expo install --fix`, then
an iOS build, and committing the new `native/Podfile.lock` that the Simulator
build prints.

## Releases

release-please (`.github/workflows/release.yml`) reads commit messages, so
they follow [Conventional Commits](https://www.conventionalcommits.org): `feat:`
and `fix:` are what users see in the changelog and SideStore; `docs:`,
`test:`, `ci:`, `refactor:` and `chore:` are hidden. Never set the version by
hand: merging release-please's "chore: release x.y.z" pull request does, and
the Release workflow then builds that commit and attaches the IPA and the
SideStore source (`scripts/release/`) to the GitHub release. The default
branch is `master`.

## Layout

- `src/app/` — Expo Router routes only. Every file is a screen.
- `src/api/` — the only code that talks to Reddit: `client.ts` (tokens,
  retries, rate limit, error mapping), `oauth.ts` (sign-in and token grants),
  `config.ts` (addresses, scopes, redirect URI, User-Agent), `endpoints.ts`,
  `schemas.ts` (zod, written by hand: Reddit publishes no spec).
- `src/auth/` — Keychain storage for the client ID, refresh token and device ID.
- `src/session/` — the session (who the app is talking to Reddit as),
  TanStack Query setup, saves and covered-media state.
- `src/settings/` — the person's preferences (theme, NSFW, views).
- `src/utils/` — pure helpers: Reddit's posts and comment trees turned into
  what screens draw, Markdown, links, formatting.
- `src/components/`, `src/hooks/`, `src/theme/`.
- `native/Podfile.lock` — the pods' lock, copied into the generated `ios/` by
  `scripts/ci/pod-install.sh` in CI (committed once the first build prints it).
- `e2e/` — the simulator tests: a fake Reddit with made-up data, and an
  XCUITest walkthrough that screenshots and audits each screen. See
  `e2e/README.md`. Its Node code has its own `tsconfig.json`, so Node's types
  stay out of the app's; `npm run typecheck` checks both. The screenshots it
  approves are the evidence of what the app does, for Reddit's API review.

## Rules

- TypeScript strict, no `any`. zod validates the fields the app depends on,
  with loose objects so new Reddit fields never break it, and listings
  checked child by child so one odd post is dropped, not the page.
- Screens never call `fetch`. Everything goes through `src/api` and hooks.
- **This repository is public.** Never commit a client ID, token, username,
  password or anything else personal — not in code, config, tests or docs.
  Use made-up names and `example.com`. The client ID is entered on the phone
  and lives in the Keychain with the refresh token.
- **Read and save only.** The app asks for `identity read mysubreddits history
save` and nothing else. Never add posting, voting, commenting, messaging or
  moderation: the README and the API application promise it, and Reddit's
  approval of the app rests on it.
- Be frugal with requests. Reddit allows 100 a minute per client ID. Prefer
  long `staleTime`s and the persisted cache, pages of 50 or more, and never
  per-row requests. Images load from the URLs Reddit returns.
- `ios/` is generated by `expo prebuild` and gitignored. Configure native
  behaviour in `app.config.ts` and config plugins.
- **Native changes cost a CI build and a reinstall.** A new native
  dependency, an SDK bump or an `app.config.ts` change means a new dev client
  from the `iOS build` workflow. Say so clearly in the commit message. Prefer
  JavaScript-only libraries and Expo's own modules.
- Don't change the bundle IDs or the redirect URI (`perch://oauth/callback`,
  registered with the Reddit app). A free Apple ID can register only ten App
  IDs a week.
- Accessibility is tested. A colour used somewhere new gets a line in
  `src/theme/__tests__/contrast.test.ts`, for both palettes (WCAG 2.2 AA: 4.5:1
  text, 3:1 control edges). A control needs a role and an accessible name. A
  plain `View` given a role or label to be read needs `accessible` too, or iOS
  ignores it (but not a container of buttons: that would hide them). Test new
  controls with React Native Testing Library queries by role and name.
- Update `docs/API.md` when the app starts using a new endpoint and
  `docs/DECISIONS.md` for notable choices.

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
does not understand is shown as text.

## 2026-10-10 — Inline titles on the tab screens, not large titles

The tab screens first used iOS's large titles, as pokecollector-app does.
On the iOS 26 simulator the large title's space appeared but its text never
did, in light and dark, with the title coloured by its style or by the tint.
The same title in the navigation bar shows, so the tab screens use that,
like every other screen. Worth trying large titles again after an Expo SDK
upgrade.

## 2026-10-10 — Audit text with no element is noted, not failed

On iOS 26 a feed shows faintly through the tab bar and the home indicator's
edge. Apple's audit can read that text from the screen's pixels without
finding the element it belongs to, which is the post's row further up.
Which post sits there depends on everything above it: the inline tab titles
moved a cards-view title under the bar and failed a run. These findings,
"Potentially inaccessible text" with no element, are written to `audit.tsv`
marked "not counted" and do not fail the walkthrough. Every finding on an
element still does, so a missing label or clipped text is still caught.

## 2026-10-10 — Tables sized from their text, not measured

Markdown tables draw row by row, each column as wide as its longest cell
(about 8.5 points a character, between 56 and 240, scaled with the text
size), so rows line up without measuring every cell first. A longer cell
wraps within its column, and a table wider than the screen scrolls
sideways. VoiceOver reads each row as one element, each cell after its
column's heading ("Count: 2"), except a row with a link, whose cells it
reads one by one so the link can be followed.

## 2026-10-10 — Opened posts are remembered on the phone

Reddit records visited posts only for paying accounts, and never for
anonymous mode, so Perch keeps its own list: the ids of the last 3,000
posts opened, in AsyncStorage (`src/session/opened.ts`), the oldest
forgotten first. A post counts as opened when its screen opens, from a feed,
the swiper or a link. Feeds grey its title and VoiceOver says "opened".
Settings can turn the dimming off or forget the list. It is the same for
every account on the phone: it records what was read here, not who read it.

## 2026-10-10 — Muting is filtered on the phone

Reddit's own filtering of subreddits changes the account, which the app's
read-and-save scopes are not for, and it has no muted words at all, so
Perch keeps both lists in its settings and filters what it has loaded. A muted subreddit leaves Home and Popular but
not its own page: opening it is asking for its posts. A muted word or
phrase matches whole words in the title or flair, in any case, in every
feed; the swiper uses the same filter as the feed beneath it. Saved is not
filtered: a saved post was wanted. Muting costs no requests, but a page
where every post is muted shows fewer posts.

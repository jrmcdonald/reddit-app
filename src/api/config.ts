/**
 * Where Reddit is, and who the app says it is.
 *
 * Reddit splits itself in two: sign-in and tokens on www.reddit.com, the API
 * on oauth.reddit.com. A simulator test build (REDDIT_ORIGIN in
 * app.config.ts) points both at one fake server, which serves the same paths.
 */
import Constants from 'expo-constants';

export interface RedditEndpoints {
  /** The sign-in and consent page, the compact one made for phones. */
  authorize: string;
  token: string;
  revoke: string;
  /** Origin of the API proper, which takes a bearer token. */
  api: string;
}

export function endpointsFor(testOrigin: string | null | undefined): RedditEndpoints {
  const www = testOrigin ?? 'https://www.reddit.com';
  return {
    authorize: `${www}/api/v1/authorize.compact`,
    token: `${www}/api/v1/access_token`,
    revoke: `${www}/api/v1/revoke_token`,
    api: testOrigin ?? 'https://oauth.reddit.com',
  };
}

function configuredOrigin(): string | null {
  const value: unknown = Constants.expoConfig?.extra?.redditOrigin;
  return typeof value === 'string' && value ? value : null;
}

export const ENDPOINTS = endpointsFor(configuredOrigin());

/**
 * The address Reddit sends the browser back to after sign-in. Registered
 * with the Reddit app, character for character. Both builds use it: the
 * sign-in sheet hands the redirect straight back to the app that opened it,
 * whatever schemes the app itself answers to.
 */
export const REDIRECT_URI = 'perch://oauth/callback';

/**
 * Only what the app does: who is signed in, reading, the subscriptions for
 * the home feed, the saved listing (history), and saving. Never submit,
 * vote, edit or messages.
 */
export const SCOPES = ['identity', 'read', 'mysubreddits', 'history', 'save'] as const;

/**
 * Reddit asks every client for a unique, descriptive User-Agent:
 * `<platform>:<app ID>:<version> (by /u/<username>)`.
 */
export function userAgent(username?: string | null): string {
  const id = Constants.expoConfig?.ios?.bundleIdentifier ?? 'perch';
  const version = Constants.expoConfig?.version ?? '0.0.0';
  const by = username ? ` (by /u/${username})` : '';
  return `ios:${id}:v${version}${by}`;
}

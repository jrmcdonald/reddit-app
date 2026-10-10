/**
 * The app's own Reddit client, signing in and reading every screen's data
 * from the fake Reddit. If these pass, the simulator walkthrough fails only
 * for reasons on the phone, never because the fake and the app disagree.
 */
import { RedditClient } from '../../../src/api/client';
import { endpointsFor, REDIRECT_URI } from '../../../src/api/config';
import {
  fetchFeed,
  fetchMe,
  fetchMoreChildren,
  fetchSaved,
  fetchSubreddit,
  fetchSubscriptions,
  fetchThread,
  searchSubreddits,
  setSaved,
} from '../../../src/api/endpoints';
import { AuthError, ClientError, NotFoundError } from '../../../src/api/errors';
import { anonymousAccess, authorizeUrl, exchangeCode, readRedirect } from '../../../src/api/oauth';
import { expandMore, findMore, flatten } from '../../../src/utils/comments';
import { CLIENT_ID, REFRESH_TOKEN, USERNAME } from '../fixtures.ts';
import { createRouter } from '../routes.ts';
import { routerFetch } from './router-fetch.ts';

const ORIGIN = 'https://localhost:8443';
const endpoints = endpointsFor(ORIGIN);

function setUp() {
  const route = createRouter(ORIGIN);
  const { fetch, calls } = routerFetch(route);
  return { route, fetch, calls };
}

function userClient(fetch: typeof globalThis.fetch) {
  return new RedditClient(
    { kind: 'user', clientId: CLIENT_ID, refreshToken: REFRESH_TOKEN, username: USERNAME },
    { fetch, endpoints },
  );
}

function anonymousClient(fetch: typeof globalThis.fetch) {
  return new RedditClient(
    { kind: 'anonymous', clientId: CLIENT_ID, deviceId: 'abcdef0123456789abcdef01' },
    { fetch, endpoints },
  );
}

describe('signing in against the fake Reddit', () => {
  it('follows the authorization code flow to a refresh token', async () => {
    const { route, fetch } = setUp();
    const state = 'state-123';
    const authorize = new URL(authorizeUrl(CLIENT_ID, state, endpoints));
    expect(authorize.searchParams.get('redirect_uri')).toBe(REDIRECT_URI);
    expect(authorize.searchParams.get('duration')).toBe('permanent');
    expect(authorize.searchParams.get('scope')).toBe('identity read mysubreddits history save');

    const reply = route({
      method: 'GET',
      url: `${authorize.pathname}${authorize.search}`,
      headers: {},
      body: '',
    });
    if (!('location' in reply)) throw new Error('expected a redirect');
    const redirect = readRedirect(reply.location, state);
    if (redirect.type !== 'code') throw new Error(`expected a code, got ${redirect.type}`);

    const grant = await exchangeCode(CLIENT_ID, redirect.code, fetch, endpoints);
    expect(grant.refreshToken).toBe(REFRESH_TOKEN);
    expect(grant.scopes).toContain('save');
  });

  it('refuses another client ID, as Reddit would', async () => {
    const { route, fetch } = setUp();
    const authorize = new URL(authorizeUrl('someoneelse0000001', 's', endpoints));
    const reply = route({
      method: 'GET',
      url: `${authorize.pathname}${authorize.search}`,
      headers: {},
      body: '',
    });
    if (!('location' in reply)) throw new Error('expected a redirect');
    expect(readRedirect(reply.location, 's').type).toBe('error');
    await expect(exchangeCode('someoneelse0000001', 'x', fetch, endpoints)).rejects.toBeInstanceOf(
      ClientError,
    );
  });

  it('turns a dead refresh token into an AuthError', async () => {
    const { fetch } = setUp();
    const client = new RedditClient(
      { kind: 'user', clientId: CLIENT_ID, refreshToken: 'revoked' },
      { fetch, endpoints },
    );
    await expect(fetchMe(client)).rejects.toBeInstanceOf(AuthError);
  });

  it('gets an anonymous token with a device ID', async () => {
    const { fetch } = setUp();
    const grant = await anonymousAccess(CLIENT_ID, 'abcdef0123456789abcdef01', fetch, endpoints);
    expect(grant.refreshToken).toBeUndefined();
  });
});

describe('reading every screen from the fake Reddit', () => {
  it('fetches one token and reuses it', async () => {
    const { fetch, calls } = setUp();
    const client = userClient(fetch);
    await fetchMe(client);
    await fetchFeed(client, { kind: 'home' }, 'best', 'day', null);
    expect(calls.filter((c) => c.url === '/api/v1/access_token')).toHaveLength(1);
    const api = calls.filter((c) => c.url !== '/api/v1/access_token');
    expect(api.every((c) => c.url.includes('raw_json=1'))).toBe(true);
    expect(api.every((c) => c.headers['user-agent']?.includes(`(by /u/${USERNAME})`))).toBe(true);
  });

  it('has a home feed with every kind of post', async () => {
    const { fetch } = setUp();
    const page = await fetchFeed(userClient(fetch), { kind: 'home' }, 'best', 'day', null);
    const kinds = new Set(page.items.map((p) => p.media.kind));
    expect([...kinds].sort()).toEqual(['gallery', 'image', 'link', 'none', 'video']);
    expect(page.items[0]?.stickied).toBe(true);
    expect(page.items.some((p) => p.nsfw)).toBe(true);
    expect(page.items.some((p) => p.saved)).toBe(true);
    const gallery = page.items.find((p) => p.media.kind === 'gallery');
    expect(gallery?.media.kind === 'gallery' && gallery.media.items).toHaveLength(6);
  });

  it('has Popular, with a spoiler, for anonymous mode too', async () => {
    const { fetch } = setUp();
    const page = await fetchFeed(anonymousClient(fetch), { kind: 'popular' }, 'hot', 'day', null);
    expect(page.items.some((p) => p.spoiler)).toBe(true);
    expect(page.items.length).toBeGreaterThan(5);
  });

  it('keeps account endpoints from anonymous mode', async () => {
    const { fetch } = setUp();
    await expect(fetchMe(anonymousClient(fetch))).rejects.toMatchObject({ status: 403 });
  });

  it('has a subreddit, its posts and a search for it', async () => {
    const { fetch } = setUp();
    const client = anonymousClient(fetch);
    const about = await fetchSubreddit(client, 'FogAndFells');
    expect(about.subscribers).toBeGreaterThan(1000);
    const page = await fetchFeed(
      client,
      { kind: 'subreddit', name: 'FogAndFells' },
      'hot',
      'day',
      null,
    );
    expect(page.items.every((p) => p.subreddit === 'FogAndFells')).toBe(true);
    expect((await searchSubreddits(client, 'kitchen')).map((s) => s.name)).toEqual([
      'TinyKitchens',
    ]);
    await expect(fetchSubreddit(client, 'NoSuchPlace')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('has a thread with nesting, an OP reply and a "load more"', async () => {
    const { fetch } = setUp();
    const client = userClient(fetch);
    const thread = await fetchThread(client, 'pf002', 'confidence');
    expect(thread.post.title).toMatch(/medieval sailors/);
    const rows = flatten(thread.comments, new Set());
    expect(rows.map((r) => r.depth)).toEqual([0, 1, 2, 1, 2, 0]);
    expect(rows.some((r) => r.kind === 'comment' && r.comment.op)).toBe(true);
    const more = rows.find((r) => r.kind === 'more');
    expect(more?.kind === 'more' && more.count).toBe(2);

    const placeholder = findMore(thread.comments, more?.kind === 'more' ? more.id : '');
    const things = await fetchMoreChildren(
      client,
      'pf002',
      placeholder?.children ?? [],
      'confidence',
    );
    const expanded = flatten(expandMore(thread.comments, placeholder?.id ?? '', things), new Set());
    expect(expanded.filter((r) => r.kind === 'more')).toHaveLength(0);
    expect(expanded).toHaveLength(7);
  });

  it('has saved posts and a saved comment, and saves for the run', async () => {
    const { fetch } = setUp();
    const client = userClient(fetch);
    const posts = await fetchSaved(client, USERNAME, 'links', null);
    expect(posts.items.length).toBe(3);
    const comments = await fetchSaved(client, USERNAME, 'comments', null);
    expect(comments.items[0]?.kind === 'comment' && comments.items[0].comment.postTitle).toMatch(
      /medieval/,
    );

    await setSaved(client, 't3_pf009', true);
    const after = await fetchFeed(client, { kind: 'home' }, 'best', 'day', null);
    expect(after.items.find((p) => p.id === 'pf009')?.saved).toBe(true);
  });

  it('lists the subscriptions alphabetically', async () => {
    const { fetch } = setUp();
    const names = (await fetchSubscriptions(userClient(fetch))).map((s) => s.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    expect(names).toContain('FogAndFells');
  });
});

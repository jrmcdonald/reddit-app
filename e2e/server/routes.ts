/**
 * The fake Reddit: sign-in, tokens and every read the app makes, answered
 * from the fixtures, on the same paths as reddit.com and oauth.reddit.com.
 * Saving and unsaving are accepted and remembered for the run, so the
 * walkthrough can show a post being saved.
 *
 * Pure, so the tests can call it without a socket; `fake-server.ts` puts it
 * behind HTTPS.
 */
import {
  ANONYMOUS_TOKEN,
  AUTH_CODE,
  buildFixtures,
  CLIENT_ID,
  REFRESH_TOKEN,
  USER_TOKEN,
} from './fixtures.ts';
import { iconPlaceholder, photoPlaceholder } from './png.ts';

export type Reply =
  | { status: number; json: unknown; headers?: Record<string, string> }
  | { status: number; png: Buffer }
  | { status: 302; location: string }
  | { status: number; empty: true };

export interface Request {
  method: string;
  /** Path and query, as the request line has it. */
  url: string;
  headers: Record<string, string | undefined>;
  body: string;
}

/** What Reddit says about the rate limit, on every API answer. */
const RATE_LIMIT = {
  'x-ratelimit-remaining': '99.0',
  'x-ratelimit-used': '1',
  'x-ratelimit-reset': '540',
};

const ok = (json: unknown): Reply => ({ status: 200, json, headers: RATE_LIMIT });
const notFound = (): Reply => ({ status: 404, json: { message: 'Not Found', error: 404 } });

function basicClient(header: string | undefined): string | null {
  const match = /^Basic\s+(.+)$/i.exec(header ?? '');
  if (!match?.[1]) return null;
  const [id] = Buffer.from(match[1], 'base64').toString('utf8').split(':');
  return id ?? null;
}

export function createRouter(origin: string, now?: number) {
  const fixtures = buildFixtures(origin, now);
  const saved = new Map<string, boolean>();
  const images = new Map<string, Buffer>();
  const cached = (key: string, draw: () => Buffer) => {
    let png = images.get(key);
    if (!png) {
      png = draw();
      images.set(key, png);
    }
    return png;
  };

  /** A listing with the run's saves and unsaves applied. */
  const withSaves = (listing: unknown): unknown => {
    const data = (
      listing as { data: { children: { kind: string; data: Record<string, unknown> }[] } }
    ).data;
    return {
      ...(listing as object),
      data: {
        ...data,
        children: data.children.map((child) => {
          const name = String(child.data.name);
          return saved.has(name)
            ? { ...child, data: { ...child.data, saved: saved.get(name) } }
            : child;
        }),
      },
    };
  };

  return function route(request: Request): Reply {
    const url = new URL(request.url, origin);
    const path = url.pathname.replace(/\/$/, '') || '/';
    const method = request.method.toUpperCase();
    const query = url.searchParams;

    // Pictures need no token, as Reddit's CDN's don't.
    const media = path.match(/^\/media\/([A-Za-z0-9]+)\/(\d+)x(\d+)\.png$/);
    if (method === 'GET' && media) {
      const [, key = '', w, h] = media;
      const width = Number(w);
      const height = Number(h);
      if (width < 1 || height < 1 || width > 1200 || height > 2000) return notFound();
      return { status: 200, png: cached(path, () => photoPlaceholder(key, width, height)) };
    }
    const icon = path.match(/^\/icons\/([A-Za-z0-9_]+)\.png$/);
    if (method === 'GET' && icon) {
      return { status: 200, png: cached(path, () => iconPlaceholder(icon[1] ?? '')) };
    }

    // Sign-in: Reddit's page would ask the person; the fake agrees at once,
    // sending the browser straight back to the app.
    if (method === 'GET' && path === '/api/v1/authorize.compact') {
      const redirect = query.get('redirect_uri') ?? '';
      const state = query.get('state') ?? '';
      const target = new URL(redirect);
      target.searchParams.set('state', state);
      if (query.get('client_id') !== CLIENT_ID)
        target.searchParams.set('error', 'unauthorized_client');
      else if (query.get('response_type') !== 'code')
        target.searchParams.set('error', 'unsupported_response_type');
      else target.searchParams.set('code', AUTH_CODE);
      return { status: 302, location: target.toString() };
    }

    if (method === 'POST' && path === '/api/v1/access_token') {
      if (basicClient(request.headers.authorization) !== CLIENT_ID) {
        return { status: 401, json: { message: 'Unauthorized', error: 401 } };
      }
      const form = new URLSearchParams(request.body);
      const grant = form.get('grant_type');
      const scope = 'identity read mysubreddits history save';
      if (grant === 'authorization_code') {
        if (form.get('code') !== AUTH_CODE)
          return { status: 200, json: { error: 'invalid_grant' } };
        return {
          status: 200,
          json: {
            access_token: USER_TOKEN,
            token_type: 'bearer',
            expires_in: 86400,
            refresh_token: REFRESH_TOKEN,
            scope,
          },
        };
      }
      if (grant === 'refresh_token') {
        if (form.get('refresh_token') !== REFRESH_TOKEN) {
          return { status: 200, json: { error: 'invalid_grant' } };
        }
        return {
          status: 200,
          json: { access_token: USER_TOKEN, token_type: 'bearer', expires_in: 86400, scope },
        };
      }
      if (grant === 'https://oauth.reddit.com/grants/installed_client') {
        const device = form.get('device_id') ?? '';
        if (device.length < 20 || device.length > 30) {
          return { status: 200, json: { error: 'invalid_request' } };
        }
        return {
          status: 200,
          json: {
            access_token: ANONYMOUS_TOKEN,
            token_type: 'bearer',
            expires_in: 86400,
            scope: '*',
          },
        };
      }
      return { status: 200, json: { error: 'unsupported_grant_type' } };
    }

    if (method === 'POST' && path === '/api/v1/revoke_token') return { status: 204, empty: true };

    const token = /^Bearer\s+(.+)$/i.exec(request.headers.authorization ?? '')?.[1];
    if (token !== USER_TOKEN && token !== ANONYMOUS_TOKEN) {
      return { status: 401, json: { message: 'Unauthorized', error: 401 } };
    }
    const user = token === USER_TOKEN;
    // What Reddit answers an application-only token on an account's endpoint.
    const needsUser = (): Reply | null =>
      user ? null : { status: 403, json: { message: 'Forbidden', error: 403 } };

    if (method === 'POST' && (path === '/api/save' || path === '/api/unsave')) {
      const refused = needsUser();
      if (refused) return refused;
      const id = new URLSearchParams(request.body).get('id') ?? '';
      if (!/^t[13]_[a-z0-9]+$/.test(id)) return { status: 400, json: { message: 'Bad Request' } };
      saved.set(id, path === '/api/save');
      return ok({});
    }
    if (method !== 'GET') return { status: 405, json: { message: 'Method Not Allowed' } };

    if (path === '/api/v1/me') return needsUser() ?? ok(fixtures.me);
    if (
      path === '/best' ||
      path === '/hot' ||
      path === '/new' ||
      path === '/top' ||
      path === '/rising'
    ) {
      return needsUser() ?? ok(withSaves(fixtures.feed('home')));
    }
    if (path === '/subreddits/mine/subscriber') return needsUser() ?? ok(fixtures.subscriptions);
    if (path === '/subreddits/search') return ok(fixtures.searchSubreddits(query.get('q') ?? ''));
    if (path === '/api/morechildren') {
      const postId = (query.get('link_id') ?? '').replace(/^t3_/, '');
      const children = (query.get('children') ?? '').split(',').filter(Boolean);
      return ok(fixtures.moreChildren(postId, children));
    }

    const savedListing = path.match(/^\/user\/([A-Za-z0-9_-]+)\/saved$/);
    if (savedListing) {
      const refused = needsUser();
      if (refused) return refused;
      return ok(withSaves(fixtures.saved(query.get('type'))));
    }

    const subredditFeed = path.match(/^\/r\/([A-Za-z0-9_]+)(?:\/(hot|new|top|rising))?$/);
    if (subredditFeed) {
      const name = subredditFeed[1] ?? '';
      if (name.toLowerCase() === 'popular') return ok(withSaves(fixtures.feed('popular')));
      if (!fixtures.about(name)) return notFound();
      return ok(withSaves(fixtures.feed(name)));
    }
    const about = path.match(/^\/r\/([A-Za-z0-9_]+)\/about$/);
    if (about) {
      const found = fixtures.about(about[1] ?? '');
      return found ? ok(found) : notFound();
    }
    const thread = path.match(/^\/comments\/([a-z0-9]+)(?:\/_\/([a-z0-9]+))?$/);
    if (thread) {
      const found = fixtures.thread(thread[1] ?? '');
      if (!found) return notFound();
      const [postListing, comments] = found;
      return ok([withSaves(postListing), comments]);
    }
    return notFound();
  };
}

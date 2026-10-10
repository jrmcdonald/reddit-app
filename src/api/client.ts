/**
 * The only code that talks to Reddit's API. It holds the sign-in (a refresh
 * token, or an anonymous device ID), keeps a current access token, and turns
 * Reddit's answers into data or the errors in `errors.ts`.
 *
 * - One access token at a time: concurrent requests share a single refresh.
 * - A 401 drops the access token and retries once with a new one; if the
 *   refresh token itself is refused, that is an `AuthError` for the session.
 * - Reddit allows 100 requests a minute per client ID and says how many are
 *   left in `X-Ratelimit-*` headers. With none left, a request waits for the
 *   window to reset if that is a few seconds away, and fails with a
 *   `RateLimitError` otherwise, rather than being refused by Reddit.
 */
import type { z } from 'zod';

import { ENDPOINTS, userAgent, type RedditEndpoints } from './config';
import {
  ApiError,
  AuthError,
  NetworkError,
  NotFoundError,
  RateLimitError,
  ResponseError,
} from './errors';
import { anonymousAccess, refreshAccess, type AccessToken, type Fetch } from './oauth';

export type Auth =
  | { kind: 'user'; clientId: string; refreshToken: string; username?: string | null }
  | { kind: 'anonymous'; clientId: string; deviceId: string };

export interface ClientOptions {
  fetch?: Fetch;
  endpoints?: RedditEndpoints;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

type Query = Record<string, string | number | boolean | undefined | null>;

/** The longest a request waits for the rate limit window to reset. */
const MAX_WAIT_MS = 5000;

export class RedditClient {
  readonly auth: Auth;
  private readonly fetchFn: Fetch;
  private readonly endpoints: RedditEndpoints;
  private readonly now: () => number;
  private readonly sleep: (ms: number) => Promise<void>;
  private access: AccessToken | null = null;
  private refreshing: Promise<AccessToken> | null = null;
  /** Requests left in the current window, and when it resets (ms since epoch). */
  private remaining: number | null = null;
  private resetAt: number | null = null;
  private username: string | null;

  constructor(auth: Auth, options: ClientOptions = {}) {
    this.auth = auth;
    this.fetchFn = options.fetch ?? fetch;
    this.endpoints = options.endpoints ?? ENDPOINTS;
    this.now = options.now ?? Date.now;
    this.sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
    this.username = auth.kind === 'user' ? (auth.username ?? null) : null;
  }

  get signedIn(): boolean {
    return this.auth.kind === 'user';
  }

  /** The signed-in account's name, for the User-Agent, once known. */
  setUsername(name: string) {
    this.username = name;
  }

  /** An access token already in hand, from signing in, so it is not fetched again. */
  prime(access: AccessToken) {
    this.access = access;
  }

  async get<S extends z.ZodType>(path: string, schema: S, query: Query = {}): Promise<z.infer<S>> {
    const body = await this.send('GET', path, query);
    const parsed = schema.safeParse(body);
    if (!parsed.success) throw new ResponseError();
    return parsed.data;
  }

  async post(path: string, form: Record<string, string>): Promise<unknown> {
    return this.send('POST', path, {}, form);
  }

  /** A current access token, fetching one if there is none or it has expired. */
  private token(): Promise<AccessToken> {
    if (this.access && this.access.expiresAt > this.now()) return Promise.resolve(this.access);
    if (!this.refreshing) {
      const grant =
        this.auth.kind === 'user'
          ? refreshAccess(
              this.auth.clientId,
              this.auth.refreshToken,
              this.fetchFn,
              this.endpoints,
              this.now,
            )
          : anonymousAccess(
              this.auth.clientId,
              this.auth.deviceId,
              this.fetchFn,
              this.endpoints,
              this.now,
            );
      this.refreshing = grant
        .then((result) => {
          this.access = result.access;
          return result.access;
        })
        .finally(() => {
          this.refreshing = null;
        });
    }
    return this.refreshing;
  }

  private async waitForRateLimit() {
    if (this.remaining === null || this.resetAt === null || this.remaining >= 1) return;
    const wait = this.resetAt - this.now();
    if (wait <= 0) return;
    if (wait > MAX_WAIT_MS) throw new RateLimitError(Math.ceil(wait / 1000));
    await this.sleep(wait);
  }

  private noteRateLimit(response: Response) {
    const remaining = Number.parseFloat(response.headers.get('x-ratelimit-remaining') ?? '');
    const reset = Number.parseFloat(response.headers.get('x-ratelimit-reset') ?? '');
    if (Number.isFinite(remaining)) this.remaining = remaining;
    if (Number.isFinite(reset)) this.resetAt = this.now() + reset * 1000;
  }

  private async send(
    method: 'GET' | 'POST',
    path: string,
    query: Query,
    form?: Record<string, string>,
    retried = false,
  ): Promise<unknown> {
    await this.waitForRateLimit();
    const access = await this.token();
    const url = new URL(path, this.endpoints.api);
    url.searchParams.set('raw_json', '1');
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
    let response: Response;
    try {
      response = await this.fetchFn(url.toString(), {
        method,
        headers: {
          Authorization: `Bearer ${access.token}`,
          'User-Agent': userAgent(this.username),
          ...(form ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
        },
        body: form ? new URLSearchParams(form).toString() : undefined,
      });
    } catch {
      throw new NetworkError();
    }
    this.noteRateLimit(response);

    if (response.status === 401 && !retried) {
      this.access = null;
      return this.send(method, path, query, form, true);
    }
    if (response.status === 401) throw new AuthError();
    if (response.status === 429) {
      const reset = Number.parseFloat(response.headers.get('x-ratelimit-reset') ?? '');
      throw new RateLimitError(Number.isFinite(reset) ? Math.ceil(reset) : undefined);
    }
    if (response.status === 403) {
      throw new ApiError('This is private, quarantined or banned, so the app cannot show it.', 403);
    }
    if (response.status === 404) throw new NotFoundError();
    if (response.status >= 500) {
      throw new ApiError(`Reddit is having trouble (${response.status}). Try again soon.`, 500);
    }
    if (!response.ok) throw new ApiError(`Reddit answered ${response.status}.`, response.status);
    if (response.status === 204) return null;
    const text = await response.text();
    if (!text) return null;
    try {
      return JSON.parse(text) as unknown;
    } catch {
      // Reddit answers some requests it dislikes with an HTML page.
      throw new ResponseError();
    }
  }
}

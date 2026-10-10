import { z } from 'zod';

import { RedditClient } from '../client';
import { endpointsFor } from '../config';
import { ApiError, NetworkError, NotFoundError, RateLimitError } from '../errors';

const endpoints = endpointsFor('https://reddit.example.com');
const Ok = z.object({ ok: z.boolean() });

type Answer = { status: number; body?: unknown; headers?: Record<string, string> };

/** A fetch that answers tokens itself and API calls from `answers`, in order. */
function fake(answers: Answer[]) {
  const calls: { url: string; auth: string }[] = [];
  let tokens = 0;
  const fetchFn = async (url: string, init: RequestInit) => {
    const headers = init.headers as Record<string, string>;
    if (url.endsWith('/api/v1/access_token')) {
      tokens += 1;
      return respond({ status: 200, body: { access_token: `token-${tokens}`, expires_in: 3600 } });
    }
    calls.push({ url, auth: headers.Authorization ?? '' });
    const next = answers.shift();
    if (!next) throw new TypeError('Network request failed');
    return respond(next);
  };
  return { fetch: fetchFn as unknown as typeof fetch, calls, tokens: () => tokens };
}

function respond(answer: Answer) {
  const text = answer.body === undefined ? '' : JSON.stringify(answer.body);
  const headers = answer.headers ?? {};
  return {
    status: answer.status,
    ok: answer.status >= 200 && answer.status < 300,
    headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
    text: async () => text,
    json: async () => JSON.parse(text) as unknown,
  } as unknown as Response;
}

function client(
  f: ReturnType<typeof fake>,
  extra: { now?: () => number; sleep?: (ms: number) => Promise<void> } = {},
) {
  return new RedditClient(
    { kind: 'anonymous', clientId: 'perchwalkthrough01', deviceId: 'abcdef0123456789abcdef01' },
    { fetch: f.fetch, endpoints, ...extra },
  );
}

describe('RedditClient', () => {
  it('retries once with a new token after a 401', async () => {
    const f = fake([{ status: 401 }, { status: 200, body: { ok: true } }]);
    await expect(client(f).get('/x', Ok)).resolves.toEqual({ ok: true });
    expect(f.calls.map((c) => c.auth)).toEqual(['Bearer token-1', 'Bearer token-2']);
  });

  it('shares one token fetch between requests made together', async () => {
    const f = fake([
      { status: 200, body: { ok: true } },
      { status: 200, body: { ok: true } },
    ]);
    const c = client(f);
    await Promise.all([c.get('/a', Ok), c.get('/b', Ok)]);
    expect(f.tokens()).toBe(1);
  });

  it('waits out a nearly reset rate limit window, and refuses a long one', async () => {
    let now = 1_000_000;
    const slept: number[] = [];
    const f = fake([
      {
        status: 200,
        body: { ok: true },
        headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '3' },
      },
      {
        status: 200,
        body: { ok: true },
        headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '60' },
      },
    ]);
    const c = client(f, {
      now: () => now,
      sleep: async (ms) => {
        slept.push(ms);
        now += ms;
      },
    });
    await c.get('/a', Ok);
    await c.get('/b', Ok);
    expect(slept).toEqual([3000]);
    await expect(c.get('/c', Ok)).rejects.toBeInstanceOf(RateLimitError);
  });

  it('maps Reddit’s answers to errors a screen can tell apart', async () => {
    const f = fake([
      { status: 404 },
      { status: 403 },
      { status: 503 },
      { status: 429, headers: { 'x-ratelimit-reset': '42' } },
      { status: 200, body: { ok: 'not a boolean' } },
    ]);
    const c = client(f);
    await expect(c.get('/a', Ok)).rejects.toBeInstanceOf(NotFoundError);
    await expect(c.get('/b', Ok)).rejects.toMatchObject({ status: 403 });
    await expect(c.get('/c', Ok)).rejects.toMatchObject({ status: 500 });
    await expect(c.get('/d', Ok)).rejects.toMatchObject({ retryAfter: 42 });
    await expect(c.get('/e', Ok)).rejects.toBeInstanceOf(ApiError);
    await expect(c.get('/f', Ok)).rejects.toBeInstanceOf(NetworkError);
  });

  it('asks for raw JSON and leaves out empty query values', async () => {
    const f = fake([{ status: 200, body: { ok: true } }]);
    await client(f).get('/r/x/hot', Ok, { limit: 50, after: null, t: undefined, q: '' });
    expect(f.calls[0]?.url).toBe('https://reddit.example.com/r/x/hot?raw_json=1&limit=50');
  });
});

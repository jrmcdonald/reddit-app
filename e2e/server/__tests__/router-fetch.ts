/**
 * A `fetch` that answers from the fake Reddit's router, with no socket, so
 * the app's own client can be tested against it end to end.
 */
import type { Reply, Request } from '../routes.ts';

export interface Call {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string;
}

function headersOf(init: RequestInit | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [name, value] of Object.entries((init?.headers ?? {}) as Record<string, string>)) {
    out[name.toLowerCase()] = value;
  }
  return out;
}

export function routerFetch(route: (request: Request) => Reply) {
  const calls: Call[] = [];
  const fetchFn = async (input: string | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const call = {
      method: init?.method ?? 'GET',
      url: `${url.pathname}${url.search}`,
      headers: headersOf(init),
      body: typeof init?.body === 'string' ? init.body : '',
    };
    calls.push(call);
    const reply = route(call);
    const headers: Record<string, string> =
      'json' in reply ? { 'content-type': 'application/json', ...reply.headers } : {};
    if ('location' in reply) headers.location = reply.location;
    const text = 'json' in reply ? JSON.stringify(reply.json) : '';
    return {
      status: reply.status,
      ok: reply.status >= 200 && reply.status < 300,
      headers: { get: (name: string) => headers[name.toLowerCase()] ?? null },
      text: async () => text,
      json: async () => JSON.parse(text) as unknown,
    } as unknown as Response;
  };
  return { fetch: fetchFn as unknown as typeof fetch, calls };
}

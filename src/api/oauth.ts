/**
 * Reddit's OAuth 2, for an "installed app": a client ID and no secret.
 *
 * - Signed in: the authorization code grant with `duration=permanent`. The
 *   person signs in on Reddit's own page, in Safari's sign-in sheet, and
 *   the app gets a refresh token, which never expires unless revoked. Access
 *   tokens last an hour and are fetched again from it as needed.
 * - Anonymous: application-only, the `installed_client` grant, with a
 *   random device ID that stays on the phone. No account involved.
 *
 * Reddit's token endpoint takes the client ID as HTTP Basic auth with an
 * empty password. It does not support PKCE; the `state` parameter is what
 * ties a redirect to the sign-in that asked for it.
 *
 * Pure apart from the `fetch` it is given, so the tests can drive it.
 */
import { ENDPOINTS, REDIRECT_URI, SCOPES, userAgent, type RedditEndpoints } from './config';
import { ApiError, AuthError, ClientError, NetworkError, ResponseError } from './errors';
import { TokenError, TokenResponseSchema } from './schemas';

export type Fetch = typeof fetch;

export interface AccessToken {
  token: string;
  /** Milliseconds since the epoch. */
  expiresAt: number;
}

export function authorizeUrl(
  clientId: string,
  state: string,
  endpoints: RedditEndpoints = ENDPOINTS,
): string {
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    state,
    redirect_uri: REDIRECT_URI,
    duration: 'permanent',
    scope: SCOPES.join(' '),
  });
  return `${endpoints.authorize}?${params.toString()}`;
}

export type RedirectResult =
  { type: 'code'; code: string } | { type: 'denied' } | { type: 'error'; message: string };

/**
 * Reads the address Reddit sent the browser back to. A state that does not
 * match is refused: the redirect did not come from this sign-in.
 */
export function readRedirect(url: string, expectedState: string): RedirectResult {
  const query = url.includes('?') ? url.slice(url.indexOf('?') + 1).split('#')[0] : '';
  const params = new URLSearchParams(query);
  if (params.get('state') !== expectedState) {
    return { type: 'error', message: 'The sign-in came back without the right state. Try again.' };
  }
  const error = params.get('error');
  if (error === 'access_denied') return { type: 'denied' };
  if (error) return { type: 'error', message: describeAuthorizeError(error) };
  const code = params.get('code');
  if (!code) return { type: 'error', message: 'Reddit sent no sign-in code. Try again.' };
  return { type: 'code', code };
}

function describeAuthorizeError(error: string): string {
  switch (error) {
    case 'invalid_request':
    case 'unsupported_response_type':
    case 'invalid_scope':
      return `Reddit refused the sign-in request (${error}).`;
    default:
      return `Reddit could not sign you in (${error}). Check the client ID and the app’s redirect URI.`;
  }
}

export interface TokenGrant {
  access: AccessToken;
  refreshToken?: string;
  scopes: string[];
}

async function requestToken(
  clientId: string,
  form: Record<string, string>,
  fetchFn: Fetch,
  endpoints: RedditEndpoints,
  now: () => number,
): Promise<TokenGrant> {
  let response: Response;
  try {
    response = await fetchFn(endpoints.token, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${base64(`${clientId}:`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': userAgent(),
      },
      body: new URLSearchParams(form).toString(),
    });
  } catch {
    throw new NetworkError();
  }
  if (response.status === 401) throw new ClientError();
  if (response.status === 429) throw new ApiError('Reddit is busy. Try again in a minute.', 429);
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new ResponseError(`Reddit's sign-in answered ${response.status}.`);
  }
  const failure = TokenError.safeParse(body);
  if (failure.success) {
    if (failure.data.error === 'invalid_grant') throw new AuthError();
    if (failure.data.error === 'unauthorized_client' || failure.data.error === 'invalid_client') {
      throw new ClientError();
    }
    throw new ApiError(`Reddit refused the sign-in (${failure.data.error}).`, response.status);
  }
  if (!response.ok) throw new ResponseError(`Reddit's sign-in answered ${response.status}.`);
  const parsed = TokenResponseSchema.safeParse(body);
  if (!parsed.success) throw new ResponseError();
  return {
    access: {
      token: parsed.data.access_token,
      // A minute early, so a token is never sent as it expires.
      expiresAt: now() + (parsed.data.expires_in - 60) * 1000,
    },
    refreshToken: parsed.data.refresh_token,
    scopes: parsed.data.scope?.split(/[\s,]+/).filter(Boolean) ?? [],
  };
}

export function exchangeCode(
  clientId: string,
  code: string,
  fetchFn: Fetch = fetch,
  endpoints: RedditEndpoints = ENDPOINTS,
  now: () => number = Date.now,
): Promise<TokenGrant> {
  return requestToken(
    clientId,
    { grant_type: 'authorization_code', code, redirect_uri: REDIRECT_URI },
    fetchFn,
    endpoints,
    now,
  );
}

export function refreshAccess(
  clientId: string,
  refreshToken: string,
  fetchFn: Fetch = fetch,
  endpoints: RedditEndpoints = ENDPOINTS,
  now: () => number = Date.now,
): Promise<TokenGrant> {
  return requestToken(
    clientId,
    { grant_type: 'refresh_token', refresh_token: refreshToken },
    fetchFn,
    endpoints,
    now,
  );
}

export function anonymousAccess(
  clientId: string,
  deviceId: string,
  fetchFn: Fetch = fetch,
  endpoints: RedditEndpoints = ENDPOINTS,
  now: () => number = Date.now,
): Promise<TokenGrant> {
  return requestToken(
    clientId,
    { grant_type: 'https://oauth.reddit.com/grants/installed_client', device_id: deviceId },
    fetchFn,
    endpoints,
    now,
  );
}

/**
 * Revokes the refresh token on sign-out, so it is useless even if a copy
 * survived somewhere. Best effort: signing out never fails because of it.
 */
export async function revoke(
  clientId: string,
  refreshToken: string,
  fetchFn: Fetch = fetch,
  endpoints: RedditEndpoints = ENDPOINTS,
): Promise<void> {
  try {
    await fetchFn(endpoints.revoke, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${base64(`${clientId}:`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': userAgent(),
      },
      body: new URLSearchParams({
        token: refreshToken,
        token_type_hint: 'refresh_token',
      }).toString(),
    });
  } catch {
    // Offline: the token stays valid on Reddit until revoked there, under
    // Settings › Account › Apps on reddit.com.
  }
}

/** A client ID is 14 to 30 letters, digits, dashes and underscores. */
export function isClientId(value: string): boolean {
  return /^[A-Za-z0-9_-]{14,30}$/.test(value);
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Base64 of an ASCII string. Hermes has `btoa`, Jest's environment may not. */
export function base64(text: string): string {
  let out = '';
  for (let i = 0; i < text.length; i += 3) {
    const a = text.charCodeAt(i);
    const b = i + 1 < text.length ? text.charCodeAt(i + 1) : NaN;
    const c = i + 2 < text.length ? text.charCodeAt(i + 2) : NaN;
    const n = (a << 16) | ((b || 0) << 8) | (c || 0);
    out += ALPHABET[(n >> 18) & 63];
    out += ALPHABET[(n >> 12) & 63];
    out += Number.isNaN(b) ? '=' : ALPHABET[(n >> 6) & 63];
    out += Number.isNaN(c) ? '=' : ALPHABET[n & 63];
  }
  return out;
}

/**
 * Who the app is talking to Reddit as: nobody yet (the first-run screen), the
 * signed-in account, or anonymously. Holds the one `RedditClient` the
 * screens' queries use.
 */
import * as WebBrowser from 'expo-web-browser';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { RedditClient } from '@/api/client';
import { REDIRECT_URI } from '@/api/config';
import { fetchMe } from '@/api/endpoints';
import { ApiError } from '@/api/errors';
import { authorizeUrl, exchangeCode, readRedirect, revoke } from '@/api/oauth';
import { loadStored, randomHex, saveStored, type Stored } from '@/auth/storage';

import { clearQueryCache, setAuthLostHandler } from './query';

export type Session =
  | { status: 'loading' }
  /** No mode chosen: the first-run screen. `notice` says why, after a lost sign-in. */
  | { status: 'choosing'; notice: string | null }
  | { status: 'ready'; mode: 'user'; client: RedditClient; username: string; cacheId: string }
  | { status: 'ready'; mode: 'anonymous'; client: RedditClient; cacheId: 'anonymous' };

export type SignInResult = { ok: true } | { ok: false; cancelled: boolean; message: string };

export interface SessionContextValue {
  session: Session;
  /** The saved client ID, to prefill the first-run screen and Settings. */
  clientId: string | null;
  /** The account kept while browsing anonymously, to switch back to. */
  savedUsername: string | null;
  signIn(clientId: string): Promise<SignInResult>;
  browseAnonymously(clientId: string): Promise<void>;
  /** From anonymous back to the stored account, without signing in again. */
  switchToAccount(): Promise<void>;
  signOut(): Promise<void>;
  /** Called when Reddit refuses the stored sign-in. */
  reportAuthLost(): void;
}

/** Exported for tests, which provide a session without signing in. */
export const SessionContext = createContext<SessionContextValue | null>(null);

function sessionFrom(stored: Stored, notice: string | null = null): Session {
  if (stored.clientId && stored.mode === 'user' && stored.account) {
    return {
      status: 'ready',
      mode: 'user',
      client: new RedditClient({
        kind: 'user',
        clientId: stored.clientId,
        refreshToken: stored.account.refreshToken,
        username: stored.account.username,
      }),
      username: stored.account.username,
      cacheId: stored.account.cacheId,
    };
  }
  if (stored.clientId && stored.mode === 'anonymous') {
    return {
      status: 'ready',
      mode: 'anonymous',
      client: new RedditClient({
        kind: 'anonymous',
        clientId: stored.clientId,
        deviceId: stored.deviceId,
      }),
      cacheId: 'anonymous',
    };
  }
  return { status: 'choosing', notice };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<Stored | null>(null);
  const [session, setSession] = useState<Session>({ status: 'loading' });
  const storedRef = useRef<Stored | null>(null);

  const commit = useCallback(async (next: Stored, notice: string | null = null) => {
    await saveStored(next);
    storedRef.current = next;
    setStored(next);
    setSession(sessionFrom(next, notice));
  }, []);

  useEffect(() => {
    let active = true;
    loadStored()
      .then(async (loaded) => {
        if (!active) return;
        // A first launch makes a device ID; keep it from then on.
        await saveStored(loaded);
        storedRef.current = loaded;
        setStored(loaded);
        setSession(sessionFrom(loaded));
      })
      .catch(() => {
        if (active) setSession({ status: 'choosing', notice: null });
      });
    return () => {
      active = false;
    };
  }, []);

  const signIn = useCallback(
    async (clientId: string): Promise<SignInResult> => {
      const current = storedRef.current;
      if (!current) return { ok: false, cancelled: false, message: 'Still starting up.' };
      const state = randomHex(16);
      const result = await WebBrowser.openAuthSessionAsync(
        authorizeUrl(clientId, state),
        REDIRECT_URI,
        // A private session: Reddit's sign-in page shares no cookies with
        // Safari, and iOS skips its "wants to use reddit.com to sign in" alert.
        { preferEphemeralSession: true },
      );
      if (result.type !== 'success') {
        return { ok: false, cancelled: true, message: 'Sign-in was cancelled.' };
      }
      const redirect = readRedirect(result.url, state);
      if (redirect.type === 'denied') {
        return { ok: false, cancelled: true, message: 'You chose not to allow access on Reddit.' };
      }
      if (redirect.type === 'error')
        return { ok: false, cancelled: false, message: redirect.message };
      try {
        const grant = await exchangeCode(clientId, redirect.code);
        if (!grant.refreshToken) {
          return {
            ok: false,
            cancelled: false,
            message: 'Reddit did not grant lasting access. Try signing in again.',
          };
        }
        const client = new RedditClient({
          kind: 'user',
          clientId,
          refreshToken: grant.refreshToken,
        });
        client.prime(grant.access);
        const me = await fetchMe(client);
        await clearQueryCache();
        await commit({
          ...current,
          clientId,
          mode: 'user',
          account: { refreshToken: grant.refreshToken, username: me.name, cacheId: randomHex(8) },
        });
        return { ok: true };
      } catch (error) {
        return {
          ok: false,
          cancelled: false,
          message: error instanceof ApiError ? error.message : 'Signing in failed. Try again.',
        };
      }
    },
    [commit],
  );

  const browseAnonymously = useCallback(
    async (clientId: string) => {
      const current = storedRef.current;
      if (!current) return;
      await commit({ ...current, clientId, mode: 'anonymous' });
    },
    [commit],
  );

  const switchToAccount = useCallback(async () => {
    const current = storedRef.current;
    if (!current?.account) return;
    await commit({ ...current, mode: 'user' });
  }, [commit]);

  const signOut = useCallback(async () => {
    const current = storedRef.current;
    if (!current) return;
    if (current.clientId && current.account) {
      await revoke(current.clientId, current.account.refreshToken);
    }
    await clearQueryCache();
    await commit({ ...current, account: null, mode: null });
  }, [commit]);

  const reportAuthLost = useCallback(() => {
    const current = storedRef.current;
    if (!current || current.mode !== 'user') return;
    // The refresh token is dead; keep the client ID so signing in again is one tap.
    void commit(
      { ...current, account: null, mode: null },
      'Reddit no longer accepts your sign-in. Sign in again, or browse anonymously.',
    );
  }, [commit]);

  useEffect(() => setAuthLostHandler(reportAuthLost), [reportAuthLost]);

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      clientId: stored?.clientId ?? null,
      savedUsername: stored?.account?.username ?? null,
      signIn,
      browseAnonymously,
      switchToAccount,
      signOut,
      reportAuthLost,
    }),
    [session, stored, signIn, browseAnonymously, switchToAccount, signOut, reportAuthLost],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession outside SessionProvider');
  return value;
}

/** The session once it is ready; screens behind the first-run screen only. */
export function useReadySession(): Extract<Session, { status: 'ready' }> {
  const { session } = useSession();
  if (session.status !== 'ready') throw new Error('useReadySession before the session is ready');
  return session;
}

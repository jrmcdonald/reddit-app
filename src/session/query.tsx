/**
 * TanStack Query, with its cache persisted so the last-seen feeds show
 * offline and on a cold start.
 *
 * Defaults lean towards fewer requests: Reddit allows 100 a minute per
 * client ID. Nothing refetches on focus; a feed is fresh for five minutes,
 * and pull to refresh is how to ask for newer.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { MutationCache, QueryCache, QueryClient, onlineManager } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import type { ReactNode } from 'react';

import { AuthError, ClientError, NotFoundError, RateLimitError } from '@/api/errors';

onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => setOnline(state.isConnected !== false)),
);

const ONE_DAY = 24 * 60 * 60 * 1000;

let onAuthLost: () => void = () => undefined;

/** What to do when Reddit refuses the stored sign-in; the session sets it. */
export function setAuthLostHandler(handler: () => void) {
  onAuthLost = handler;
}

function noticeAuthLost(error: unknown) {
  if (error instanceof AuthError) onAuthLost();
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: noticeAuthLost }),
  mutationCache: new MutationCache({ onError: noticeAuthLost }),
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: ONE_DAY,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Retrying these cannot help: they need the person, or time.
        if (
          error instanceof AuthError ||
          error instanceof ClientError ||
          error instanceof NotFoundError
        ) {
          return false;
        }
        if (error instanceof RateLimitError) return failureCount < 1;
        return failureCount < 2;
      },
      retryDelay: (attempt, error) =>
        error instanceof RateLimitError && error.retryAfter
          ? error.retryAfter * 1000
          : Math.min(1000 * 2 ** attempt, 15_000),
    },
    mutations: { retry: false },
  },
});

const persister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'perch.query-cache.v1',
  throttleTime: 2000,
});

export function QueryProvider({ children }: { children: ReactNode }) {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister, maxAge: ONE_DAY, buster: 'perch-1' }}>
      {children}
    </PersistQueryClientProvider>
  );
}

/** Drops cached Reddit data, in memory and on disk. For signing in and out. */
export async function clearQueryCache(): Promise<void> {
  queryClient.clear();
  await persister.removeClient();
}

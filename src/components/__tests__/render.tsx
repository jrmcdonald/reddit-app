/** Renders a component inside the providers the app's screens have. */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import type { ReactElement } from 'react';

import { RedditClient } from '@/api/client';
import { RevealedProvider } from '@/session/revealed';
import { SavedProvider } from '@/session/saved';
import { SessionContext, type Session, type SessionContextValue } from '@/session/session';

export async function renderInApp(ui: ReactElement, mode: 'user' | 'anonymous' = 'user') {
  const client = new RedditClient({
    kind: 'anonymous',
    clientId: 'perchwalkthrough01',
    deviceId: 'abcdef0123456789abcdef01',
  });
  const post = jest.spyOn(client, 'post').mockResolvedValue({});
  const session: Session =
    mode === 'user'
      ? { status: 'ready', mode: 'user', client, username: 'someone', cacheId: 'test' }
      : { status: 'ready', mode: 'anonymous', client, cacheId: 'anonymous' };
  const value: SessionContextValue = {
    session,
    clientId: 'perchwalkthrough01',
    savedUsername: mode === 'user' ? 'someone' : null,
    signIn: jest.fn(),
    browseAnonymously: jest.fn(),
    switchToAccount: jest.fn(),
    signOut: jest.fn(),
    reportAuthLost: jest.fn(),
  };
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const result = await render(
    <QueryClientProvider client={queryClient}>
      <SessionContext.Provider value={value}>
        <RevealedProvider>
          <SavedProvider>{ui}</SavedProvider>
        </RevealedProvider>
      </SessionContext.Provider>
    </QueryClientProvider>,
  );
  return { ...result, post };
}

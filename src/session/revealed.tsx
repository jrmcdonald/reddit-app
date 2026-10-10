/**
 * Which covered posts (NSFW, spoilers) the person has tapped to show. One
 * tap shows the post everywhere it appears, until the app restarts.
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

import { usePreferences } from '@/settings/preferences';
import type { Post } from '@/utils/posts';

interface RevealedContextValue {
  revealed: ReadonlySet<string>;
  reveal(id: string): void;
}

const RevealedContext = createContext<RevealedContextValue>({
  revealed: new Set(),
  reveal: () => undefined,
});

export function RevealedProvider({ children }: { children: ReactNode }) {
  const [revealed, setRevealed] = useState<ReadonlySet<string>>(new Set());
  const reveal = useCallback((id: string) => {
    setRevealed((previous) => new Set(previous).add(id));
  }, []);
  const value = useMemo(() => ({ revealed, reveal }), [revealed, reveal]);
  return <RevealedContext.Provider value={value}>{children}</RevealedContext.Provider>;
}

/** Why a post's media is covered, if it is: settings decide, a tap undoes. */
export function useCover(post: Pick<Post, 'id' | 'nsfw' | 'spoiler'>) {
  const preferences = usePreferences();
  const { revealed, reveal } = useContext(RevealedContext);
  const reason =
    post.nsfw && preferences.coverNsfw
      ? 'nsfw'
      : post.spoiler && preferences.coverSpoilers
        ? 'spoiler'
        : null;
  const covered = reason !== null && !revealed.has(post.id);
  return { covered, reason, reveal: () => reveal(post.id) };
}

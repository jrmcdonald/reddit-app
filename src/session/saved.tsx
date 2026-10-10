/**
 * Saving and unsaving, shown at once everywhere the post or comment appears.
 *
 * A post is in many cached pages at once (Home, a subreddit, Saved), each
 * holding Reddit's `saved` flag from when it loaded. Rather than rewrite
 * them all, a save made here is remembered by fullname and wins over the
 * flag until the app restarts, by which time the pages have been refetched.
 */
import { useMutation } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { Alert } from 'react-native';

import { setSaved } from '@/api/endpoints';
import { ApiError } from '@/api/errors';

import { queryClient } from './query';
import { useReadySession } from './session';

interface SavedContextValue {
  overrides: ReadonlyMap<string, boolean>;
  set(fullname: string, saved: boolean): void;
}

const SavedContext = createContext<SavedContextValue>({
  overrides: new Map(),
  set: () => undefined,
});

export function SavedProvider({ children }: { children: ReactNode }) {
  const [overrides, setOverrides] = useState<ReadonlyMap<string, boolean>>(new Map());
  const set = useCallback((fullname: string, saved: boolean) => {
    setOverrides((previous) => new Map(previous).set(fullname, saved));
  }, []);
  const value = useMemo(() => ({ overrides, set }), [overrides, set]);
  return <SavedContext.Provider value={value}>{children}</SavedContext.Provider>;
}

/**
 * Whether a post or comment is saved, and a toggle. Anonymous mode cannot
 * save: `canSave` is false there and the control is not shown.
 */
export function useSavedState(fullname: string, fromReddit: boolean) {
  const session = useReadySession();
  const { overrides, set } = useContext(SavedContext);
  const saved = overrides.get(fullname) ?? fromReddit;
  const mutation = useMutation({
    mutationFn: (next: boolean) => setSaved(session.client, fullname, next),
    onMutate: (next) => {
      set(fullname, next);
      Haptics.selectionAsync().catch(() => undefined);
    },
    onError: (error, next) => {
      set(fullname, !next);
      Alert.alert(
        next ? 'Not saved' : 'Not unsaved',
        error instanceof ApiError ? error.message : 'Reddit did not answer. Try again.',
      );
    },
    onSuccess: () => {
      // The Saved tab's list is now out of date; it refetches when next shown.
      void queryClient.invalidateQueries({ queryKey: ['saved'], refetchType: 'none' });
    },
  });
  const toggle = useCallback(() => mutation.mutate(!saved), [mutation, saved]);
  return { saved, toggle, canSave: session.mode === 'user' };
}

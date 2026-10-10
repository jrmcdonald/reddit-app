/**
 * Every query the screens make, in one place, with their keys. Keys start
 * with what the data is and include the session's opaque cache id, so one
 * account's cached pages are never shown to another, or to anonymous mode.
 */
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';

import {
  fetchFeed,
  fetchSaved,
  fetchSubreddit,
  fetchSubscriptions,
  fetchThread,
  searchSubreddits,
  type CommentSort,
  type Feed,
  type Period,
  type Sort,
} from '@/api/endpoints';
import { useReadySession } from '@/session/session';

export function feedKey(feed: Feed): string {
  return feed.kind === 'subreddit' ? `r/${feed.name.toLowerCase()}` : feed.kind;
}

export function useFeed(feed: Feed, sort: Sort, period: Period) {
  const session = useReadySession();
  return useInfiniteQuery({
    queryKey: ['feed', session.cacheId, feedKey(feed), sort, sort === 'top' ? period : null],
    queryFn: ({ pageParam }) => fetchFeed(session.client, feed, sort, period, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.after,
    // Up to ten pages (500 posts) kept, so a long scroll does not grow the
    // persisted cache without end.
    maxPages: 10,
  });
}

export function useThread(postId: string, sort: CommentSort, focus: string | null) {
  const session = useReadySession();
  return useQuery({
    queryKey: ['thread', session.cacheId, postId, sort, focus],
    queryFn: () => fetchThread(session.client, postId, sort, focus),
    placeholderData: keepPreviousData,
  });
}

export function useSavedListing(type: 'links' | 'comments') {
  const session = useReadySession();
  const username = session.mode === 'user' ? session.username : null;
  return useInfiniteQuery({
    queryKey: ['saved', session.cacheId, type],
    queryFn: ({ pageParam }) => {
      if (!username) throw new Error('Saved needs a signed-in account');
      return fetchSaved(session.client, username, type, pageParam);
    },
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.after,
    enabled: !!username,
    maxPages: 10,
  });
}

export function useSubscriptions() {
  const session = useReadySession();
  return useQuery({
    queryKey: ['subscriptions', session.cacheId],
    queryFn: () => fetchSubscriptions(session.client),
    enabled: session.mode === 'user',
    // Subscriptions change rarely; an hour is plenty fresh.
    staleTime: 60 * 60 * 1000,
  });
}

export function useSubredditSearch(query: string) {
  const session = useReadySession();
  const q = query.trim();
  return useQuery({
    queryKey: ['subreddit-search', session.cacheId, q.toLowerCase()],
    queryFn: () => searchSubreddits(session.client, q),
    enabled: q.length >= 2,
    placeholderData: keepPreviousData,
  });
}

export function useSubreddit(name: string) {
  const session = useReadySession();
  return useQuery({
    queryKey: ['subreddit', session.cacheId, name.toLowerCase()],
    queryFn: () => fetchSubreddit(session.client, name),
    staleTime: 60 * 60 * 1000,
  });
}

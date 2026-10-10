import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useMemo, useState, type ReactElement } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import type { Feed as FeedSpec, Period, Sort } from '@/api/endpoints';
import { feedKey, useFeed } from '@/hooks/queries';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { setFeedView, usePreferences, viewFor } from '@/settings/preferences';
import { spacing, useColors } from '@/theme';
import { defaultSort, feedParam } from '@/utils/feeds';
import { isVisual, type Post } from '@/utils/posts';

import { PostCard } from '../post/post-card';
import { PostRow } from '../post/post-row';
import { PostTile } from '../post/post-tile';
import { EmptyState, ErrorState, LoadingState } from '../states';
import { FeedControls } from './feed-controls';

const GRID_COLUMNS = 3;

/**
 * A feed of posts (Home, Popular or a subreddit) in the view chosen for it:
 * a list, large cards, or a grid of pictures. Pages load as the end comes
 * near; pull to refresh fetches the first page again.
 */
export function Feed({
  feed,
  header,
  emptyMessage,
}: {
  feed: FeedSpec;
  /** Above the controls: a subreddit's description, say. */
  header?: ReactElement | null;
  emptyMessage?: string;
}) {
  const colors = useColors();
  const preferences = usePreferences();
  const { width } = useWindowDimensions();
  const [sort, setSort] = useState<Sort>(defaultSort(feed));
  const [period, setPeriod] = useState<Period>('day');
  const key = feedKey(feed);
  const view = viewFor(preferences, key);
  const query = useFeed(feed, sort, period);
  const { refreshing, onRefresh } = usePullToRefresh(query.refetch);
  const showSubreddit = feed.kind !== 'subreddit';

  const posts = useMemo(() => {
    const all = query.data?.pages.flatMap((page) => page.items) ?? [];
    // Pages can overlap when posts move between fetches; show each once.
    const seen = new Set<string>();
    return all.filter((post) => {
      if (seen.has(post.id)) return false;
      seen.add(post.id);
      if (post.nsfw && !preferences.showNsfw) return false;
      if (view === 'grid' && !isVisual(post.media)) return false;
      return true;
    });
  }, [query.data, preferences.showNsfw, view]);

  const openSwiper = (start?: Post) =>
    router.push({
      pathname: '/swiper',
      params: { feed: feedParam(feed), sort, period, ...(start ? { start: start.id } : {}) },
    });

  const tile = Math.floor(width / GRID_COLUMNS) - 2;

  const controls = (
    <View>
      {header}
      <FeedControls
        sort={sort}
        period={period}
        sorts={
          feed.kind === 'home'
            ? ['best', 'hot', 'new', 'top', 'rising']
            : ['hot', 'new', 'top', 'rising']
        }
        onSort={(nextSort, nextPeriod) => {
          setSort(nextSort);
          setPeriod(nextPeriod);
        }}
        view={view}
        onView={(next) => setFeedView(key, next)}
        onSwiper={() => openSwiper()}
      />
    </View>
  );

  const empty = query.isPending ? (
    <LoadingState label="Loading posts" />
  ) : query.isError ? (
    <ErrorState error={query.error} onRetry={() => query.refetch()} />
  ) : (
    <EmptyState
      title={view === 'grid' ? 'No pictures here' : 'Nothing here'}
      message={
        view === 'grid'
          ? 'None of these posts has a picture or video. Try the list.'
          : (emptyMessage ?? 'There are no posts to show.')
      }
    />
  );

  return (
    <FlashList
      // A new key per view: the grid's columns cannot change in place.
      key={view}
      data={posts}
      keyExtractor={(post) => post.id}
      numColumns={view === 'grid' ? GRID_COLUMNS : 1}
      renderItem={({ item, index }) =>
        view === 'grid' ? (
          <PostTile post={item} size={tile} onPress={() => openSwiper(posts[index])} />
        ) : view === 'cards' ? (
          <PostCard post={item} showSubreddit={showSubreddit} />
        ) : (
          <PostRow post={item} showSubreddit={showSubreddit} />
        )
      }
      ListHeaderComponent={controls}
      ListEmptyComponent={empty}
      ListFooterComponent={
        query.isFetchingNextPage ? (
          <View style={styles.footer}>
            <ActivityIndicator
              color={colors.textSecondary}
              accessibilityLabel="Loading more posts"
            />
          </View>
        ) : (
          <View style={styles.footer} />
        )
      }
      onEndReached={() => {
        if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
      }}
      onEndReachedThreshold={1.5}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      style={{ backgroundColor: colors.background }}
    />
  );
}

const styles = StyleSheet.create({
  footer: { paddingVertical: spacing.lg, minHeight: spacing.xl },
});

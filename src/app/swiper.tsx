import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
  type ViewToken,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SwiperPage } from '@/components/feed/swiper-page';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { useFeed } from '@/hooks/queries';
import { usePreferences } from '@/settings/preferences';
import { minTapTarget, spacing } from '@/theme';
import { defaultSort, parseFeed, parsePeriod, parseSort } from '@/utils/feeds';
import { isVisual, type Post } from '@/utils/posts';

/**
 * A feed's pictures and videos full screen, one post at a time: swipe up for
 * the next, sideways through a gallery. Opened from a feed's view buttons,
 * or a grid tile; it reads the same cached pages the feed loaded, and loads
 * more as it nears the end.
 */
export default function SwiperScreen() {
  const params = useLocalSearchParams<{
    feed?: string;
    sort?: string;
    period?: string;
    start?: string;
  }>();
  const feed = parseFeed(params.feed);
  const sort = parseSort(params.sort, defaultSort(feed));
  const period = parsePeriod(params.period);
  const query = useFeed(feed, sort, period);
  const preferences = usePreferences();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [overlays, setOverlays] = useState(true);
  const [index, setIndex] = useState(0);

  const posts = useMemo(() => {
    const seen = new Set<string>();
    return (query.data?.pages.flatMap((page) => page.items) ?? []).filter((post: Post) => {
      if (seen.has(post.id) || !isVisual(post.media)) return false;
      seen.add(post.id);
      return preferences.showNsfw || !post.nsfw;
    });
  }, [query.data, preferences.showNsfw]);

  // Where to open: the tapped tile's post, once, and then wherever the person is.
  const [initialIndex] = useState(() => {
    const found = params.start ? posts.findIndex((post) => post.id === params.start) : 0;
    return Math.max(found, 0);
  });

  // FlatList wants the same function for its whole life.
  const onViewable = useCallback(({ viewableItems }: { viewableItems: ViewToken<Post>[] }) => {
    const first = viewableItems[0];
    if (first?.index !== null && first?.index !== undefined) setIndex(first.index);
  }, []);

  const feedName =
    feed.kind === 'home' ? 'Home' : feed.kind === 'popular' ? 'Popular' : `r/${feed.name}`;

  return (
    <View style={styles.screen}>
      {/* White, over the black backdrop, whatever the app's theme. */}
      <StatusBar style="light" />
      <FlatList
        data={posts}
        keyExtractor={(post) => post.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        initialScrollIndex={initialIndex}
        getItemLayout={(_, i) => ({ length: height, offset: height * i, index: i })}
        windowSize={3}
        initialNumToRender={2}
        maxToRenderPerBatch={2}
        onViewableItemsChanged={onViewable}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        onEndReached={() => {
          if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
        }}
        onEndReachedThreshold={3}
        renderItem={({ item, index: i }) => (
          <SwiperPage
            post={item}
            width={width}
            height={height}
            active={i === index}
            overlays={overlays}
            onToggleOverlays={() => setOverlays((shown) => !shown)}
          />
        )}
        ListEmptyComponent={
          <View style={[styles.empty, { width, height }]}>
            <ThemedText style={styles.white}>
              {query.isPending ? 'Loading…' : 'No pictures or videos in this feed.'}
            </ThemedText>
          </View>
        }
      />
      {overlays ? (
        <View
          style={[styles.top, { paddingTop: insets.top + spacing.xs }]}
          pointerEvents="box-none">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={() => router.back()}
            style={styles.round}>
            <Icon name="xmark" size={20} tint="#FFFFFF" />
          </Pressable>
          <View
            style={styles.pill}
            accessible
            accessibilityLabel={`${feedName}, ${index + 1} of ${posts.length}`}>
            <ThemedText variant="label" style={styles.white}>
              {feedName} · {posts.length ? index + 1 : 0} of {posts.length}
            </ThemedText>
          </View>
          <View style={styles.spacer} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000000' },
  white: { color: '#FFFFFF' },
  empty: { alignItems: 'center', justifyContent: 'center' },
  top: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  round: {
    width: minTapTarget,
    height: minTapTarget,
    borderRadius: minTapTarget / 2,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  spacer: { width: minTapTarget },
});

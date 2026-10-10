import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import type { SavedItem } from '@/api/endpoints';
import { Markdown } from '@/components/markdown';
import { PostRow } from '@/components/post/post-row';
import { SaveButton } from '@/components/post/save-button';
import { SearchField } from '@/components/search-field';
import { Segmented } from '@/components/segmented';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { ThemedText } from '@/components/themed-text';
import { useSavedListing } from '@/hooks/queries';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { spacing, useColors } from '@/theme';
import type { Comment } from '@/utils/comments';
import { age } from '@/utils/format';

type Tab = 'links' | 'comments';

/**
 * Saved posts and comments, newest save first, with a filter by text or
 * subreddit over what has loaded. Reddit lists only the 1,000 most recent.
 */
export default function SavedScreen() {
  const colors = useColors();
  const [tab, setTab] = useState<Tab>('links');
  const [filter, setFilter] = useState('');
  const query = useSavedListing(tab);
  const { refreshing, onRefresh } = usePullToRefresh(query.refetch);

  const items = useMemo(() => {
    const all = query.data?.pages.flatMap((page) => page.items) ?? [];
    const needle = filter
      .trim()
      .toLowerCase()
      .replace(/^\/?r\//, '');
    if (!needle) return all;
    return all.filter((item) => matches(item, needle));
  }, [query.data, filter]);

  const header = (
    <View style={styles.header}>
      <Segmented<Tab>
        label="Saved"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'links', label: 'Posts' },
          { value: 'comments', label: 'Comments' },
        ]}
      />
      <SearchField label="Filter saved" value={filter} onChangeText={setFilter} />
    </View>
  );

  return (
    <FlashList
      key={tab}
      data={items}
      keyExtractor={(item) => (item.kind === 'post' ? item.post.fullname : item.comment.fullname)}
      getItemType={(item) => item.kind}
      renderItem={({ item }) =>
        item.kind === 'post' ? (
          <PostRow post={item.post} />
        ) : (
          <SavedComment comment={item.comment} />
        )
      }
      ListHeaderComponent={header}
      ListEmptyComponent={
        query.isPending ? (
          <LoadingState label="Loading saved" />
        ) : query.isError ? (
          <ErrorState error={query.error} onRetry={() => query.refetch()} />
        ) : filter ? (
          <EmptyState title="No matches" message="Nothing saved matches that filter." />
        ) : (
          <EmptyState
            title={tab === 'links' ? 'No saved posts' : 'No saved comments'}
            message="Tap the bookmark on a post or comment to save it here."
          />
        )
      }
      ListFooterComponent={
        <View style={styles.footer}>
          {query.isFetchingNextPage ? <ActivityIndicator color={colors.textSecondary} /> : null}
          {items.length ? (
            <ThemedText variant="caption" color="textSecondary" style={styles.note}>
              Reddit lists only your 1,000 most recent saves.
            </ThemedText>
          ) : null}
        </View>
      }
      onEndReached={() => {
        if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
      }}
      onEndReachedThreshold={1.5}
      keyboardDismissMode="on-drag"
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      style={{ backgroundColor: colors.background }}
    />
  );
}

function matches(item: SavedItem, needle: string): boolean {
  if (item.kind === 'post') {
    const { post } = item;
    return (
      post.title.toLowerCase().includes(needle) || post.subreddit.toLowerCase().includes(needle)
    );
  }
  const { comment } = item;
  return (
    comment.body.toLowerCase().includes(needle) ||
    (comment.subreddit ?? '').toLowerCase().includes(needle) ||
    (comment.postTitle ?? '').toLowerCase().includes(needle)
  );
}

function SavedComment({ comment }: { comment: Comment }) {
  const colors = useColors();
  const open = () => {
    if (comment.postId) {
      router.push({ pathname: '/post/[id]', params: { id: comment.postId, focus: comment.id } });
    }
  };
  return (
    <View
      style={[
        styles.comment,
        { backgroundColor: colors.surface, borderBottomColor: colors.border },
      ]}>
      <View style={styles.commentHead}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Comment by ${comment.author} in r/${comment.subreddit ?? ''} on ${comment.postTitle ?? 'a post'}. Opens the thread`}
          onPress={open}
          style={styles.commentLink}>
          <ThemedText variant="caption" color="textSecondary" numberOfLines={2}>
            <ThemedText variant="caption" style={styles.strong}>
              {comment.author}
            </ThemedText>
            {` in r/${comment.subreddit ?? ''} · ${age(comment.createdUtc)}`}
            {comment.postTitle ? ` · on “${comment.postTitle}”` : ''}
          </ThemedText>
        </Pressable>
        <SaveButton fullname={comment.fullname} saved={comment.saved} size={18} />
      </View>
      <Markdown source={comment.body} size="small" />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { padding: spacing.md, paddingTop: spacing.xs, gap: spacing.sm + 4 },
  footer: { paddingVertical: spacing.lg, gap: spacing.sm, alignItems: 'center' },
  note: { textAlign: 'center', paddingHorizontal: spacing.md },
  comment: {
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    paddingBottom: spacing.sm + 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 2,
  },
  commentHead: { flexDirection: 'row', alignItems: 'center' },
  commentLink: { flex: 1, minHeight: 44, justifyContent: 'center' },
  strong: { fontWeight: '600' },
});

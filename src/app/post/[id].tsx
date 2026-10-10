import { FlashList } from '@shopify/flash-list';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActionSheetIOS, Alert, Pressable, StyleSheet, View } from 'react-native';

import { COMMENT_SORTS, fetchMoreChildren, type CommentSort } from '@/api/endpoints';
import { ApiError } from '@/api/errors';
import { CommentRow, MoreRow } from '@/components/comments/comment-row';
import { Markdown } from '@/components/markdown';
import { PostBadges } from '@/components/post/badges';
import { PostMedia } from '@/components/post/post-media';
import { SaveButton } from '@/components/post/save-button';
import { ShareButton } from '@/components/post/share-button';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { useThread } from '@/hooks/queries';
import { useReadySession } from '@/session/session';
import { updatePreferences, usePreferences } from '@/settings/preferences';
import { minTapTarget, spacing, useColors } from '@/theme';
import { expandMore, findMore, flatten, type Node } from '@/utils/comments';
import { age, ageSpoken, compact, plural } from '@/utils/format';
import type { Post } from '@/utils/posts';

const SORT_LABELS: Record<CommentSort, string> = {
  confidence: 'Best',
  top: 'Top',
  new: 'New',
  controversial: 'Controversial',
  old: 'Old',
  qa: 'Q&A',
};

/** A post, its media and text, and its comments as one scrolling list. */
export default function PostScreen() {
  const { id = '', focus } = useLocalSearchParams<{ id: string; focus?: string }>();
  const session = useReadySession();
  const colors = useColors();
  const preferences = usePreferences();
  const sort = preferences.commentSort;
  const thread = useThread(id, sort, focus ?? null);

  // Comments loaded behind "load more" placeholders, in the order they were
  // loaded, grafted onto Reddit's tree where each placeholder was.
  const [loaded, setLoaded] = useState<{ moreId: string; things: unknown[] }[]>([]);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());
  const [loadingMore, setLoadingMore] = useState<string | null>(null);
  const tree = useMemo(
    () =>
      loaded.reduce<Node[]>(
        (nodes, { moreId, things }) => expandMore(nodes, moreId, things),
        thread.data?.comments ?? [],
      ),
    [thread.data, loaded],
  );
  const rows = useMemo(() => flatten(tree, collapsed, expanded), [tree, collapsed, expanded]);

  const toggle = (commentId: string, collapsedNow: boolean) => {
    if (collapsedNow) {
      setCollapsed((set) => {
        const next = new Set(set);
        next.delete(commentId);
        return next;
      });
      setExpanded((set) => new Set(set).add(commentId));
    } else {
      setCollapsed((set) => new Set(set).add(commentId));
    }
  };

  const loadMore = async (moreId: string) => {
    const more = findMore(tree, moreId);
    if (!more) return;
    setLoadingMore(moreId);
    try {
      const things = await fetchMoreChildren(session.client, id, more.children, sort);
      setLoaded((current) => [...current, { moreId, things }]);
    } catch (error) {
      Alert.alert(
        'Could not load more replies',
        error instanceof ApiError ? error.message : 'Reddit did not answer. Try again.',
      );
    } finally {
      setLoadingMore(null);
    }
  };

  const chooseSort = () => {
    const options = COMMENT_SORTS.map((s) => SORT_LABELS[s]);
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: 'Sort comments by',
        options: [...options, 'Cancel'],
        cancelButtonIndex: options.length,
      },
      (index) => {
        const chosen = COMMENT_SORTS[index];
        if (chosen) updatePreferences({ commentSort: chosen });
      },
    );
  };

  const post = thread.data?.post;
  const title = post ? `r/${post.subreddit}` : '';

  if (!post) {
    return (
      <>
        <Stack.Screen options={{ title }} />
        {thread.isError ? (
          <ErrorState error={thread.error} onRetry={() => thread.refetch()} />
        ) : (
          <LoadingState label="Loading the post" />
        )}
      </>
    );
  }

  const header = (
    <View>
      <PostHeader post={post} />
      {focus ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace({ pathname: '/post/[id]', params: { id } })}
          style={[styles.banner, { backgroundColor: colors.surfaceRaised }]}>
          <ThemedText variant="label" style={{ color: colors.accent }}>
            Showing one thread · View all comments
          </ThemedText>
        </Pressable>
      ) : null}
      <View style={[styles.commentBar, { borderColor: colors.border }]}>
        <ThemedText variant="label">{plural(post.comments, 'comment')}</ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Sort comments: ${SORT_LABELS[sort]}`}
          onPress={chooseSort}
          style={styles.sortButton}>
          <ThemedText variant="label" style={{ color: colors.accent }}>
            {SORT_LABELS[sort]}
          </ThemedText>
          <Icon name="chevron.down" size={12} color="accent" />
        </Pressable>
      </View>
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title }} />
      <FlashList
        data={rows}
        keyExtractor={(row) => row.key}
        getItemType={(row) => row.kind}
        renderItem={({ item }) =>
          item.kind === 'comment' ? (
            <CommentRow row={item} onToggle={() => toggle(item.comment.id, item.collapsed)} />
          ) : (
            <MoreRow
              row={item}
              postId={id}
              loading={loadingMore === item.id}
              onLoad={() => void loadMore(item.id)}
            />
          )
        }
        ListHeaderComponent={header}
        ListEmptyComponent={
          thread.isFetching ? (
            <LoadingState label="Loading comments" />
          ) : (
            <EmptyState title="No comments yet" />
          )
        }
        ListFooterComponent={<View style={styles.footer} />}
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: colors.background }}
      />
    </>
  );
}

function PostHeader({ post }: { post: Post }) {
  const colors = useColors();
  const ratio =
    post.upvoteRatio !== null ? ` · ${Math.round(post.upvoteRatio * 100)}% upvoted` : '';
  return (
    <View style={[styles.post, { backgroundColor: colors.surface }]}>
      <View style={styles.padded}>
        <ThemedText variant="caption" color="textSecondary">
          <ThemedText
            variant="caption"
            accessibilityRole="link"
            onPress={() => router.push({ pathname: '/r/[name]', params: { name: post.subreddit } })}
            style={[styles.strong, { color: colors.accent }]}>
            r/{post.subreddit}
          </ThemedText>
          {` · u/${post.author} · `}
          <ThemedText
            variant="caption"
            color="textSecondary"
            accessibilityLabel={ageSpoken(post.createdUtc)}>
            {age(post.createdUtc)}
          </ThemedText>
        </ThemedText>
        <ThemedText variant="title" accessibilityRole="header" style={styles.title}>
          {post.title}
        </ThemedText>
        <PostBadges post={post} />
      </View>
      <PostMedia post={post} />
      {post.body ? (
        <View style={styles.padded}>
          <Markdown source={post.body} />
        </View>
      ) : null}
      {post.removed ? (
        <ThemedText color="textSecondary" style={styles.padded}>
          This post was removed.
        </ThemedText>
      ) : null}
      <View style={styles.actions}>
        <ThemedText variant="caption" color="textSecondary" style={styles.stats}>
          ↑ {compact(post.score)}
          {ratio}
          {post.locked ? ' · locked' : ''}
        </ThemedText>
        <ShareButton post={post} />
        <SaveButton fullname={post.fullname} saved={post.saved} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  post: { paddingTop: spacing.md, gap: spacing.sm + 4 },
  padded: { paddingHorizontal: spacing.md, gap: spacing.sm },
  title: { fontSize: 22, lineHeight: 28 },
  strong: { fontWeight: '600' },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
  },
  stats: { flex: 1 },
  banner: { minHeight: minTapTarget, paddingHorizontal: spacing.md, justifyContent: 'center' },
  commentBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sortButton: {
    minHeight: minTapTarget,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.sm,
  },
  footer: { height: spacing.xl * 2 },
});

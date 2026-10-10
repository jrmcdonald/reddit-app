import { router } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { spacing, useColors } from '@/theme';
import { plainText } from '@/utils/markdown-plain';
import type { Post } from '@/utils/posts';

import { ThemedText } from '../themed-text';
import { PostBadges } from './badges';
import { postLabel } from './label';
import { MediaThumb } from './media-thumb';
import { PostSource, PostStats } from './meta';
import { SaveButton } from './save-button';

const THUMB = 76;

/**
 * A post in the list view: source, title, a text post's opening, score and
 * comments, with a thumbnail and the save button on the right. The text is
 * one button that opens the post; the thumbnail and save button are their
 * own, beside it, so VoiceOver can reach each.
 */
export function PostRow({ post, showSubreddit = true }: { post: Post; showSubreddit?: boolean }) {
  const colors = useColors();
  const open = () => router.push({ pathname: '/post/[id]', params: { id: post.id } });
  const preview = post.media.kind === 'none' && post.body ? plainText(post.body) : '';
  const hasThumb = post.media.kind !== 'none';
  return (
    <View
      style={[styles.row, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={postLabel(post, { subreddit: showSubreddit })}
        onPress={open}
        style={({ pressed }) => [styles.main, pressed && { opacity: 0.6 }]}>
        <PostSource post={post} showSubreddit={showSubreddit} />
        <ThemedText variant="postTitle">{post.title}</ThemedText>
        <PostBadges post={post} />
        {preview ? (
          <ThemedText variant="caption" color="textSecondary" numberOfLines={2}>
            {preview}
          </ThemedText>
        ) : null}
        <PostStats post={post} />
      </Pressable>
      <View style={styles.side}>
        {hasThumb ? (
          <MediaThumb post={post} width={THUMB} style={styles.thumb} onPress={open} decorative />
        ) : null}
        <SaveButton fullname={post.fullname} saved={post.saved} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    paddingVertical: spacing.sm + 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  main: { flex: 1, gap: 6 },
  side: { alignItems: 'center', justifyContent: 'space-between', gap: spacing.xs },
  thumb: { width: THUMB, height: THUMB, marginRight: spacing.sm },
});

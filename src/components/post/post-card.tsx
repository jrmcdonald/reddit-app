import { router } from 'expo-router';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { spacing, useColors } from '@/theme';
import { plainText } from '@/utils/markdown-plain';
import { thumbnailOf, type Post } from '@/utils/posts';

import { ThemedText } from '../themed-text';
import { PostBadges } from './badges';
import { postLabel } from './label';
import { MediaThumb } from './media-thumb';
import { PostSource, PostStats } from './meta';
import { SaveButton } from './save-button';
import { ShareButton } from './share-button';

/** The tallest a card's picture gets, as a share of its width: a tall photo is cropped. */
const MAX_HEIGHT = 1.25;

/**
 * A post in the cards view: the media full width, as large as it is
 * sensible, with the title above and the actions below.
 */
export function PostCard({ post, showSubreddit = true }: { post: Post; showSubreddit?: boolean }) {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const open = () => router.push({ pathname: '/post/[id]', params: { id: post.id } });
  const picture = thumbnailOf(post.media);
  const aspect = picture?.aspect ?? (post.media.kind === 'video' ? post.media.clip.aspect : 0);
  const height = aspect ? Math.min(width / aspect, width * MAX_HEIGHT) : 0;
  const preview = post.media.kind === 'none' && post.body ? plainText(post.body) : '';
  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={postLabel(post, { subreddit: showSubreddit })}
        onPress={open}
        style={({ pressed }) => [styles.head, pressed && { opacity: 0.6 }]}>
        <PostSource post={post} showSubreddit={showSubreddit} />
        <ThemedText variant="postTitle">{post.title}</ThemedText>
        <PostBadges post={post} />
        {preview ? (
          <ThemedText color="textSecondary" numberOfLines={4}>
            {preview}
          </ThemedText>
        ) : null}
      </Pressable>
      {height ? (
        <MediaThumb
          post={post}
          width={width}
          rounded={false}
          style={{ height }}
          onPress={open}
          decorative
        />
      ) : null}
      <View style={styles.actions}>
        <PostStats post={post} />
        <View style={styles.spacer} />
        <ShareButton post={post} />
        <SaveButton fullname={post.fullname} saved={post.saved} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.sm },
  head: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm + 4,
    paddingBottom: spacing.sm,
    gap: 6,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
  },
  spacer: { flex: 1 },
});

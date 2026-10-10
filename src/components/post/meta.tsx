import { StyleSheet, View } from 'react-native';

import { useColors } from '@/theme';
import { age, compact } from '@/utils/format';
import type { Post } from '@/utils/posts';

import { Icon } from '../icon';
import { ThemedText } from '../themed-text';

/** "r/sub · 4h", or "u/author · 4h" inside a subreddit. Read as part of the row. */
export function PostSource({
  post,
  showSubreddit = true,
}: {
  post: Post;
  showSubreddit?: boolean;
}) {
  return (
    <ThemedText variant="caption" color="textSecondary" numberOfLines={1}>
      <ThemedText variant="caption" style={styles.strong}>
        {showSubreddit ? `r/${post.subreddit}` : `u/${post.author}`}
      </ThemedText>
      {` · ${age(post.createdUtc)}`}
    </ThemedText>
  );
}

/** Score and comment count, read-only: the app never votes. */
export function PostStats({ post, domain = true }: { post: Post; domain?: boolean }) {
  const colors = useColors();
  return (
    <View style={styles.stats}>
      <View style={styles.stat}>
        <Icon name="arrow.up" size={12} tint={colors.textSecondary} />
        <ThemedText variant="caption" color="textSecondary">
          {compact(post.score)}
        </ThemedText>
      </View>
      <View style={styles.stat}>
        <Icon name="bubble.left" size={12} tint={colors.textSecondary} />
        <ThemedText variant="caption" color="textSecondary">
          {compact(post.comments)}
        </ThemedText>
      </View>
      {domain && post.media.kind === 'link' ? (
        <ThemedText variant="caption" color="textSecondary" numberOfLines={1} style={styles.domain}>
          {post.media.domain}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  strong: { fontWeight: '600' },
  stats: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  domain: { flexShrink: 1 },
});

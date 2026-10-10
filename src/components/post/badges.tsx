import { StyleSheet, View } from 'react-native';

import { useColors } from '@/theme';
import type { Post } from '@/utils/posts';

import { ThemedText } from '../themed-text';

/** NSFW, Spoiler, Pinned and the post's flair, as small outlined labels. */
export function PostBadges({ post, flair = true }: { post: Post; flair?: boolean }) {
  const colors = useColors();
  const items: { text: string; color: string }[] = [];
  if (post.stickied) items.push({ text: 'Pinned', color: colors.accent });
  if (post.nsfw) items.push({ text: 'NSFW', color: colors.warning });
  if (post.spoiler) items.push({ text: 'Spoiler', color: colors.textSecondary });
  if (flair && post.flair) items.push({ text: post.flair, color: colors.textSecondary });
  if (!items.length) return null;
  return (
    <View style={styles.row}>
      {items.map((item) => (
        <View key={item.text} style={[styles.badge, { borderColor: item.color }]}>
          <ThemedText variant="badge" numberOfLines={1} style={{ color: item.color }}>
            {item.text}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  badge: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    maxWidth: 200,
  },
});

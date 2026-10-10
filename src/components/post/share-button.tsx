import { Pressable, StyleSheet } from 'react-native';

import { minTapTarget, useColors } from '@/theme';
import type { Post } from '@/utils/posts';

import { Icon } from '../icon';
import { sharePost } from './share';

export function ShareButton({
  post,
  tint,
  size = 20,
}: {
  post: Post;
  tint?: string;
  size?: number;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Share"
      hitSlop={4}
      onPress={() => sharePost(post)}
      style={styles.button}>
      <Icon name="square.and.arrow.up" size={size} tint={tint ?? colors.textSecondary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: minTapTarget,
    minHeight: minTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

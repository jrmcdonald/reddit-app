import { StyleSheet } from 'react-native';

import type { Post } from '@/utils/posts';

import { postLabel } from './label';
import { MediaThumb } from './media-thumb';

/** A post in the grid view: its picture, square. Tapping opens the swiper there. */
export function PostTile({ post, size, onPress }: { post: Post; size: number; onPress(): void }) {
  return (
    <MediaThumb
      post={post}
      width={size}
      rounded={false}
      badges
      style={[styles.tile, { width: size, height: size }]}
      onPress={onPress}
      label={postLabel(post)}
    />
  );
}

const styles = StyleSheet.create({
  tile: { margin: 1 },
});

import { Image } from 'expo-image';
import {
  PixelRatio,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { useCover } from '@/session/revealed';
import { radius, spacing, type as typeScale, useColors } from '@/theme';
import { pick, thumbnailOf, type Post } from '@/utils/posts';

import { Icon } from '../icon';
import { ThemedText } from '../themed-text';

/**
 * A post's picture at a given size: its image, a gallery's first, or a
 * video's poster, with a badge for galleries and videos. Covered when the
 * post is NSFW or a spoiler and Settings says so: the image is not even
 * downloaded until the cover is tapped.
 *
 * `width` is the laid-out width in points, to pick the smallest rendition
 * that is sharp at it. With `onPress`, tapping the (uncovered) picture does
 * that; otherwise it is decoration, hidden from VoiceOver, and the row
 * around it carries the post's name.
 */
export function MediaThumb({
  post,
  width,
  style,
  rounded = true,
  badges = true,
  onPress,
  fit = 'cover',
  label,
  decorative = false,
}: {
  post: Post;
  width: number;
  style?: StyleProp<ViewStyle>;
  rounded?: boolean;
  badges?: boolean;
  onPress?(): void;
  fit?: 'cover' | 'contain';
  /** What VoiceOver says for the picture as a button; by default, what kind of media it is. */
  label?: string;
  /**
   * Beside a button that already opens the post (a row's text): still
   * tappable, but not read out a second time.
   */
  decorative?: boolean;
}) {
  const colors = useColors();
  const reduceMotion = useReduceMotion();
  const { covered, reason, reveal } = useCover(post);
  const picture = thumbnailOf(post.media);
  const corner = rounded ? { borderRadius: radius.md } : null;

  if (covered) {
    const what = reason === 'nsfw' ? 'NSFW' : 'Spoiler';
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Show ${what === 'NSFW' ? 'NSFW' : 'spoiler'} media`}
        onPress={reveal}
        style={[styles.box, styles.cover, corner, { backgroundColor: colors.cover }, style]}>
        <Icon name="eye.slash" size={width < 120 ? 18 : 26} tint={colors.onCover} />
        <ThemedText variant="badge" style={{ color: colors.onCover }}>
          {width < 120 ? what : `${what} · Tap to show`}
        </ThemedText>
      </Pressable>
    );
  }

  const source = picture ? pick(picture, width * PixelRatio.get()) : null;
  const badge = badges ? badgeFor(post) : null;
  const body = (
    <>
      {source ? (
        <Image
          source={{ uri: source.url }}
          style={StyleSheet.absoluteFill}
          contentFit={fit}
          recyclingKey={post.id}
          transition={reduceMotion ? 0 : 150}
          accessibilityIgnoresInvertColors
        />
      ) : (
        <Icon
          name={post.media.kind === 'link' ? 'link' : 'text.alignleft'}
          size={22}
          color="textSecondary"
        />
      )}
      {badge ? (
        <View style={styles.badge}>
          <Icon name={badge.icon} size={10} tint="#FFFFFF" />
          <ThemedText variant="badge" style={styles.badgeText}>
            {badge.text}
          </ThemedText>
        </View>
      ) : null}
    </>
  );

  if (onPress && decorative) {
    return (
      <Pressable
        accessible={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        onPress={onPress}
        style={[styles.box, corner, { backgroundColor: colors.placeholder }, style]}>
        {body}
      </Pressable>
    );
  }
  if (onPress) {
    return (
      <Pressable
        accessibilityRole="imagebutton"
        accessibilityLabel={label ?? describeMedia(post)}
        onPress={onPress}
        style={[styles.box, corner, { backgroundColor: colors.placeholder }, style]}>
        {body}
      </Pressable>
    );
  }
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.box, corner, { backgroundColor: colors.placeholder }, style]}>
      {body}
    </View>
  );
}

function badgeFor(post: Post): { icon: 'square.on.square' | 'play.fill'; text: string } | null {
  if (post.media.kind === 'gallery' && post.media.items.length > 1) {
    return { icon: 'square.on.square', text: `${post.media.items.length}` };
  }
  if (post.media.kind === 'video') {
    const seconds = post.media.clip.duration;
    if (post.media.clip.gif) return { icon: 'play.fill', text: 'GIF' };
    return { icon: 'play.fill', text: seconds ? duration(seconds) : 'Video' };
  }
  return null;
}

export function duration(seconds: number): string {
  const s = Math.round(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** What VoiceOver says for a post's picture. */
export function describeMedia(post: Post): string {
  switch (post.media.kind) {
    case 'gallery':
      return `Gallery of ${post.media.items.length} images`;
    case 'video':
      return post.media.clip.gif ? 'Animated image' : 'Video';
    case 'image':
      return 'Image';
    case 'link':
      return `Link to ${post.media.domain}`;
    default:
      return 'Text post';
  }
}

const styles = StyleSheet.create({
  box: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  cover: { gap: spacing.xs, padding: spacing.xs },
  badge: {
    position: 'absolute',
    right: 4,
    bottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  badgeText: { ...typeScale.badge, color: '#FFFFFF' },
});

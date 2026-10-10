import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, PixelRatio, Pressable, StyleSheet, View } from 'react-native';

import { useAutoplay } from '@/hooks/use-autoplay';
import { useCover } from '@/session/revealed';
import { useReadySession } from '@/session/session';
import { minTapTarget, spacing, type as typeScale } from '@/theme';
import { age, compact } from '@/utils/format';
import { pick, type Picture, type Post } from '@/utils/posts';

import { Icon } from '../icon';
import { ThemedText } from '../themed-text';
import { ZoomableImage } from '../zoomable-image';
import { ClipPlayer } from '../post/clip-player';
import { describeMedia } from '../post/media-thumb';
import { SaveButton } from '../post/save-button';
import { sharePost } from '../post/share';

const WHITE = '#FFFFFF';

/**
 * One post in the swiper, filling the screen: its picture, gallery or video,
 * with the title, source and actions over it. A tap on the picture hides
 * and shows them.
 */
export function SwiperPage({
  post,
  width,
  height,
  active,
  overlays,
  onToggleOverlays,
  onZoomChange,
}: {
  post: Post;
  width: number;
  height: number;
  /** On screen: only this page's video plays. */
  active: boolean;
  overlays: boolean;
  onToggleOverlays(): void;
  /** Zoomed in on a picture: the swiper stops swiping until it zooms out. */
  onZoomChange(zoomed: boolean): void;
}) {
  const session = useReadySession();
  const { covered, reason, reveal } = useCover(post);
  const autoplay = useAutoplay();
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const zoom = (next: boolean) => {
    setZoomed(next);
    onZoomChange(next);
  };
  const media = post.media;

  let body;
  if (covered) {
    body = (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={reason === 'nsfw' ? 'Show NSFW media' : 'Show spoiler media'}
        onPress={reveal}
        style={styles.cover}>
        <Icon name="eye.slash" size={34} tint={WHITE} />
        <ThemedText variant="label" style={styles.white}>
          {reason === 'nsfw' ? 'NSFW' : 'Spoiler'} · Tap to show
        </ThemedText>
      </Pressable>
    );
  } else if (media.kind === 'gallery') {
    body = (
      <FlatList
        horizontal
        pagingEnabled
        data={media.items}
        keyExtractor={(_, index) => `${post.id}-${index}`}
        showsHorizontalScrollIndicator={false}
        scrollEnabled={!zoomed}
        onMomentumScrollEnd={(event) =>
          setGalleryIndex(Math.round(event.nativeEvent.contentOffset.x / width))
        }
        renderItem={({ item, index }) => (
          <FullPicture
            picture={item.picture}
            width={width}
            height={height}
            label={`Image ${index + 1} of ${media.items.length}${item.caption ? `: ${item.caption}` : ''}`}
            onPress={onToggleOverlays}
            onZoomChange={zoom}
            // Another picture in the gallery, or another post: zoom back out.
            reset={`${active}-${galleryIndex}`}
          />
        )}
      />
    );
  } else if (media.kind === 'video') {
    body = (
      <Pressable
        accessible={false}
        onPress={onToggleOverlays}
        style={{ width, height, justifyContent: 'center' }}>
        <ClipPlayer clip={media.clip} playing={active && autoplay} style={{ width, height }} />
      </Pressable>
    );
  } else if (media.kind === 'image') {
    body = (
      <FullPicture
        picture={media.picture}
        width={width}
        height={height}
        label={describeMedia(post)}
        onPress={onToggleOverlays}
        onZoomChange={zoom}
        reset={active}
      />
    );
  } else {
    body = <View style={{ width, height }} />;
  }

  const openComments = () => router.push({ pathname: '/post/[id]', params: { id: post.id } });

  return (
    <View style={[styles.page, { width, height }]}>
      {body}
      {overlays ? (
        <>
          <View style={styles.rail}>
            {session.mode === 'user' ? (
              <View style={styles.railButton}>
                <SaveButton fullname={post.fullname} saved={post.saved} size={26} tint={WHITE} />
              </View>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${post.comments} comments`}
              onPress={openComments}
              style={styles.railButton}>
              <Icon name="bubble.left" size={26} tint={WHITE} />
              <ThemedText variant="badge" style={styles.white}>
                {compact(post.comments)}
              </ThemedText>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Share"
              onPress={() => sharePost(post)}
              style={styles.railButton}>
              <Icon name="square.and.arrow.up" size={26} tint={WHITE} />
            </Pressable>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${post.title}, r/${post.subreddit}. Opens the post and its comments`}
            onPress={openComments}
            style={styles.caption}>
            {media.kind === 'gallery' && media.items.length > 1 ? (
              <ThemedText variant="badge" style={styles.white}>
                {galleryIndex + 1} of {media.items.length}
              </ThemedText>
            ) : null}
            <ThemedText variant="caption" style={styles.dim}>
              <ThemedText variant="caption" style={[styles.white, styles.strong]}>
                r/{post.subreddit}
              </ThemedText>
              {` · ${age(post.createdUtc)} · ↑ ${compact(post.score)}`}
            </ThemedText>
            <ThemedText variant="postTitle" style={styles.white} numberOfLines={3}>
              {post.title}
            </ThemedText>
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

function FullPicture({
  picture,
  width,
  height,
  label,
  onPress,
  onZoomChange,
  reset,
}: {
  picture: Picture;
  width: number;
  height: number;
  label: string;
  onPress(): void;
  onZoomChange(zoomed: boolean): void;
  reset: unknown;
}) {
  const source = pick(picture, width * PixelRatio.get());
  return (
    <ZoomableImage
      uri={source.url}
      aspect={picture.aspect}
      width={width}
      height={height}
      label={label}
      hint="Double-tap to hide or show the caption. Pinch to zoom"
      onTap={onPress}
      onZoomChange={onZoomChange}
      reset={reset}
    />
  );
}

const styles = StyleSheet.create({
  page: { backgroundColor: '#000000' },
  white: { color: WHITE },
  dim: { color: '#D6D6D6' },
  strong: { fontWeight: '700' },
  cover: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  rail: {
    position: 'absolute',
    right: spacing.sm,
    bottom: 200,
    gap: spacing.md,
    alignItems: 'center',
  },
  railButton: {
    minWidth: minTapTarget + 4,
    minHeight: minTapTarget + 4,
    borderRadius: 26,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  caption: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: spacing.md,
    paddingLeft: spacing.md,
    paddingRight: 76,
    paddingBottom: spacing.xl + spacing.md,
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  badgeText: typeScale.badge,
});

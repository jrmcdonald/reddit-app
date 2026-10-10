import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import {
  FlatList,
  PixelRatio,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { useAutoplay } from '@/hooks/use-autoplay';
import { useReduceMotion } from '@/hooks/use-reduce-motion';
import { useOpenLink } from '@/hooks/use-open-link';
import { useCover } from '@/session/revealed';
import { radius, spacing, useColors } from '@/theme';
import { linkTarget } from '@/utils/links';
import { pick, type Picture, type Post } from '@/utils/posts';

import { Icon } from '../icon';
import { ThemedText } from '../themed-text';
import { ClipPlayer } from './clip-player';
import { MediaThumb } from './media-thumb';

/** The tallest a picture gets on the post screen, as a share of its width. */
const MAX_HEIGHT = 1.4;

/** A post's media at full width on its own screen. */
export function PostMedia({ post }: { post: Post }) {
  const { width } = useWindowDimensions();
  const { covered } = useCover(post);
  const autoplay = useAutoplay();
  const media = post.media;

  if (media.kind === 'none') return null;
  if (media.kind === 'link') return <LinkCard post={post} url={media.url} domain={media.domain} />;

  const aspect =
    media.kind === 'video'
      ? media.clip.aspect
      : media.kind === 'image'
        ? media.picture.aspect
        : Math.max(
            ...media.items.map((item) => item.picture.aspect).map((a) => Math.min(a, 2)),
            0.6,
          );
  const height = Math.min(width / aspect, width * MAX_HEIGHT);

  if (covered) {
    return <MediaThumb post={post} width={width} rounded={false} style={{ height }} />;
  }
  if (media.kind === 'video') {
    return (
      <View style={{ width, height, backgroundColor: '#000000' }}>
        <ClipPlayer clip={media.clip} playing={autoplay} />
      </View>
    );
  }
  if (media.kind === 'image') {
    return <FullWidthPicture picture={media.picture} width={width} height={height} label="Image" />;
  }
  return <Gallery items={media.items} width={width} height={height} />;
}

function FullWidthPicture({
  picture,
  width,
  height,
  label,
}: {
  picture: Picture;
  width: number;
  height: number;
  label: string;
}) {
  const colors = useColors();
  const reduceMotion = useReduceMotion();
  const source = pick(picture, width * PixelRatio.get());
  return (
    <Image
      source={{ uri: source.url }}
      style={{ width, height, backgroundColor: colors.placeholder }}
      contentFit="contain"
      transition={reduceMotion ? 0 : 150}
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      accessibilityIgnoresInvertColors
    />
  );
}

function Gallery({
  items,
  width,
  height,
}: {
  items: { picture: Picture; caption: string | null }[];
  width: number;
  height: number;
}) {
  const [index, setIndex] = useState(0);
  const caption = items[index]?.caption;
  return (
    <View>
      <FlatList
        horizontal
        pagingEnabled
        data={items}
        keyExtractor={(_, i) => `${i}`}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) =>
          setIndex(Math.round(event.nativeEvent.contentOffset.x / width))
        }
        renderItem={({ item, index: i }) => (
          <FullWidthPicture
            picture={item.picture}
            width={width}
            height={height}
            label={`Image ${i + 1} of ${items.length}${item.caption ? `: ${item.caption}` : ''}`}
          />
        )}
      />
      <View style={styles.galleryInfo}>
        <ThemedText variant="caption" color="textSecondary">
          {index + 1} of {items.length} · swipe for more
        </ThemedText>
        {caption ? <ThemedText variant="caption">{caption}</ThemedText> : null}
      </View>
    </View>
  );
}

function LinkCard({ post, url, domain }: { post: Post; url: string; domain: string }) {
  const colors = useColors();
  const openLink = useOpenLink();
  const internal = linkTarget(url).kind !== 'web';
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`Open link to ${domain}`}
      onPress={() =>
        internal
          ? openLink(url)
          : WebBrowser.openBrowserAsync(url, { controlsColor: colors.accent }).catch(
              () => undefined,
            )
      }
      style={[styles.link, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
      {post.media.kind === 'link' && post.media.thumbnail ? (
        <MediaThumb post={post} width={64} style={styles.linkThumb} />
      ) : (
        <View
          style={[styles.linkThumb, styles.linkIcon, { backgroundColor: colors.surfaceRaised }]}>
          <Icon name="link" size={22} color="textSecondary" />
        </View>
      )}
      <View style={styles.linkText}>
        <ThemedText variant="label" numberOfLines={1}>
          {domain}
        </ThemedText>
        <ThemedText variant="caption" color="textSecondary" numberOfLines={2}>
          {url}
        </ThemedText>
      </View>
      <Icon name="arrow.up.right.square" size={18} color="textSecondary" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  galleryInfo: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, gap: 2 },
  link: {
    marginHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
    padding: spacing.sm,
    paddingRight: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  linkThumb: { width: 64, height: 64, borderRadius: radius.sm },
  linkIcon: { alignItems: 'center', justifyContent: 'center' },
  linkText: { flex: 1, gap: 2 },
});

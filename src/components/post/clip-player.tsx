import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';

import type { Clip } from '@/utils/posts';

/**
 * A Reddit video or converted GIF. Starts muted, and only when `playing`:
 * the swiper plays the page on screen, the post screen plays when Settings
 * allows. A GIF loops without controls; a video has iOS's own.
 */
export function ClipPlayer({
  clip,
  playing,
  style,
  controls = true,
}: {
  clip: Clip;
  playing: boolean;
  style?: StyleProp<ViewStyle>;
  controls?: boolean;
}) {
  const player = useVideoPlayer(clip.hls ?? clip.mp4, (p) => {
    p.loop = clip.gif;
    p.muted = true;
  });

  useEffect(() => {
    if (playing) player.play();
    else player.pause();
  }, [player, playing]);

  return (
    <VideoView
      player={player}
      style={[styles.video, style]}
      contentFit="contain"
      nativeControls={controls && !clip.gif}
      allowsPictureInPicture={false}
      accessibilityLabel={clip.gif ? 'Animated image' : 'Video'}
    />
  );
}

const styles = StyleSheet.create({
  video: { width: '100%', height: '100%' },
});

import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDecay,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useReduceMotion } from '@/hooks/use-reduce-motion';

/** The furthest a picture zooms in, and where a double tap takes it. */
const MAX_SCALE = 5;
const DOUBLE_TAP_SCALE = 2.5;
/** Past this a picture counts as zoomed: panning moves it, not the list. */
const ZOOMED = 1.01;
const SETTLE = { duration: 220 };

/**
 * A picture that zooms: pinch, or double-tap where to look, and drag it
 * about once zoomed. Not zoomed, a drag goes to the list around it, so the
 * swiper still swipes; `onZoomChange` says when to stop the list scrolling.
 * A single tap is `onTap`, which is also what VoiceOver's double-tap does.
 */
export function ZoomableImage({
  uri,
  aspect,
  width,
  height,
  label,
  hint,
  onTap,
  onZoomChange,
  reset,
}: {
  uri: string;
  /** The picture's width over height, to keep it inside its edges when zoomed. */
  aspect: number;
  width: number;
  height: number;
  label: string;
  hint?: string;
  onTap?(): void;
  onZoomChange?(zoomed: boolean): void;
  /** Changing it zooms back out: when the page scrolls away, say. */
  reset?: unknown;
}) {
  const reduceMotion = useReduceMotion();
  const scale = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const start = useSharedValue({ scale: 1, x: 0, y: 0, focalX: 0, focalY: 0 });
  const zoomed = useSharedValue(false);

  // The picture as drawn, letterboxed inside the frame.
  const drawnWidth = Math.min(width, height * aspect);
  const drawnHeight = drawnWidth / aspect;

  const report = (next: boolean) => onZoomChange?.(next);

  useEffect(() => {
    scale.set(withTiming(1, SETTLE));
    x.set(withTiming(0, SETTLE));
    y.set(withTiming(0, SETTLE));
    if (zoomed.get()) {
      zoomed.set(false);
      onZoomChange?.(false);
    }
    // Only a new `reset` zooms out; the shared values are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reset]);

  /** How far the picture can move each way at a scale before its edge leaves the frame's. */
  const limits = (s: number) => {
    'worklet';
    return {
      x: Math.max(0, (drawnWidth * s - width) / 2),
      y: Math.max(0, (drawnHeight * s - height) / 2),
    };
  };

  const setZoomed = (next: boolean) => {
    'worklet';
    if (zoomed.get() === next) return;
    zoomed.set(next);
    scheduleOnRN(report, next);
  };

  /** Back inside the edges, or all the way out if pinched below full size. */
  const settle = () => {
    'worklet';
    if (scale.get() <= ZOOMED) {
      scale.set(withTiming(1, SETTLE));
      x.set(withTiming(0, SETTLE));
      y.set(withTiming(0, SETTLE));
      setZoomed(false);
      return;
    }
    const s = Math.min(scale.get(), MAX_SCALE);
    const limit = limits(s);
    scale.set(withTiming(s, SETTLE));
    x.set(withTiming(clamp(x.get(), limit.x), SETTLE));
    y.set(withTiming(clamp(y.get(), limit.y), SETTLE));
    setZoomed(true);
  };

  const pinch = Gesture.Pinch()
    .onStart((event) => {
      start.set({
        scale: scale.get(),
        x: x.get(),
        y: y.get(),
        focalX: event.focalX - width / 2,
        focalY: event.focalY - height / 2,
      });
    })
    .onUpdate((event) => {
      const from = start.get();
      // A little past either end while pinching; it settles back on release.
      const s = Math.min(Math.max(from.scale * event.scale, 0.8), MAX_SCALE * 1.2);
      // Keep the point under the fingers where it was, following them as they move.
      const focalX = event.focalX - width / 2;
      const focalY = event.focalY - height / 2;
      x.set(focalX - (s / from.scale) * (from.focalX - from.x));
      y.set(focalY - (s / from.scale) * (from.focalY - from.y));
      scale.set(s);
      if (s > ZOOMED) setZoomed(true);
    })
    .onEnd(settle);

  // One finger: two are the pinch's, which moves the picture itself.
  const pan = Gesture.Pan()
    .maxPointers(1)
    .manualActivation(true)
    .onTouchesMove((_event, manager) => {
      // Only a zoomed picture moves; otherwise the drag is the list's.
      if (zoomed.get()) manager.activate();
      else manager.fail();
    })
    .onStart(() => {
      start.set({ ...start.get(), x: x.get(), y: y.get() });
    })
    .onUpdate((event) => {
      x.set(start.get().x + event.translationX);
      y.set(start.get().y + event.translationY);
    })
    .onEnd((event) => {
      const limit = limits(scale.get());
      x.set(withDecay({ velocity: event.velocityX, clamp: [-limit.x, limit.x] }));
      y.set(withDecay({ velocity: event.velocityY, clamp: [-limit.y, limit.y] }));
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((event) => {
      if (zoomed.get()) {
        scale.set(withTiming(1, SETTLE));
        x.set(withTiming(0, SETTLE));
        y.set(withTiming(0, SETTLE));
        setZoomed(false);
        return;
      }
      const s = DOUBLE_TAP_SCALE;
      const limit = limits(s);
      // The tapped point comes towards the middle.
      const pointX = event.x - width / 2;
      const pointY = event.y - height / 2;
      scale.set(withTiming(s, SETTLE));
      x.set(withTiming(clamp(-pointX * (s - 1), limit.x), SETTLE));
      y.set(withTiming(clamp(-pointY * (s - 1), limit.y), SETTLE));
      setZoomed(true);
    });

  const tap = Gesture.Tap()
    .requireExternalGestureToFail(doubleTap)
    .onEnd(() => {
      if (onTap) scheduleOnRN(onTap);
    });

  const gesture = Gesture.Simultaneous(pinch, pan, Gesture.Exclusive(doubleTap, tap));

  const transform = useAnimatedStyle(() => ({
    transform: [{ translateX: x.get() }, { translateY: y.get() }, { scale: scale.get() }],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        accessible
        accessibilityRole="image"
        accessibilityLabel={label}
        accessibilityHint={hint}
        onAccessibilityTap={onTap}
        style={[styles.frame, { width, height }]}>
        <Animated.View style={[StyleSheet.absoluteFill, transform]}>
          <Image
            source={{ uri }}
            style={StyleSheet.absoluteFill}
            contentFit="contain"
            transition={reduceMotion ? 0 : 150}
            accessibilityIgnoresInvertColors
          />
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}

function clamp(value: number, limit: number) {
  'worklet';
  return Math.min(Math.max(value, -limit), limit);
}

const styles = StyleSheet.create({
  // Zoomed in, the picture stays inside its page.
  frame: { overflow: 'hidden' },
});

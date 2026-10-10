import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  FlatList,
  Modal,
  PixelRatio,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { minTapTarget, spacing } from '@/theme';
import { pick, type Picture } from '@/utils/posts';

import { Icon } from '../icon';
import { ThemedText } from '../themed-text';
import { ZoomableImage } from '../zoomable-image';

const WHITE = '#FFFFFF';

export interface ViewerItem {
  picture: Picture;
  caption: string | null;
}

/**
 * A post's pictures full screen, over the post: pinch or double-tap to
 * zoom, swipe sideways through a gallery, tap to hide the close button and
 * caption. Shown while it is rendered: render it to open it.
 */
export function ImageViewer({
  items,
  start,
  onClose,
}: {
  items: ViewerItem[];
  start: number;
  onClose(): void;
}) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(start);
  const [zoomed, setZoomed] = useState(false);
  const [overlays, setOverlays] = useState(true);
  const caption = items[index]?.caption;

  return (
    <Modal
      visible
      animationType="fade"
      presentationStyle="overFullScreen"
      transparent
      onRequestClose={onClose}>
      {/* A modal is its own window on iOS: gestures need their own root in it. */}
      <GestureHandlerRootView style={styles.screen}>
        <StatusBar style="light" />
        <FlatList
          horizontal
          pagingEnabled
          data={items}
          keyExtractor={(_, i) => `${i}`}
          initialScrollIndex={start}
          getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
          showsHorizontalScrollIndicator={false}
          scrollEnabled={!zoomed}
          onMomentumScrollEnd={(event) =>
            setIndex(Math.round(event.nativeEvent.contentOffset.x / width))
          }
          renderItem={({ item, index: i }) => (
            <ZoomableImage
              uri={pick(item.picture, width * PixelRatio.get()).url}
              aspect={item.picture.aspect}
              width={width}
              height={height}
              label={
                items.length > 1
                  ? `Image ${i + 1} of ${items.length}${item.caption ? `: ${item.caption}` : ''}`
                  : (item.caption ?? 'Image')
              }
              hint="Pinch to zoom. Double-tap to hide or show the close button"
              onTap={() => setOverlays((shown) => !shown)}
              onZoomChange={setZoomed}
              reset={index}
            />
          )}
        />
        {overlays ? (
          <>
            <View
              style={[styles.top, { paddingTop: insets.top + spacing.xs }]}
              pointerEvents="box-none">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={onClose}
                style={styles.round}>
                <Icon name="xmark" size={20} tint={WHITE} />
              </Pressable>
              {items.length > 1 ? (
                <View style={styles.pill}>
                  <ThemedText variant="label" style={styles.white}>
                    {index + 1} of {items.length}
                  </ThemedText>
                </View>
              ) : null}
              <View style={styles.spacer} />
            </View>
            {caption ? (
              <View
                style={[styles.caption, { paddingBottom: insets.bottom + spacing.md }]}
                pointerEvents="none">
                <ThemedText variant="caption" style={styles.white}>
                  {caption}
                </ThemedText>
              </View>
            ) : null}
          </>
        ) : null}
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000000' },
  white: { color: WHITE },
  top: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  round: {
    width: minTapTarget,
    height: minTapTarget,
    borderRadius: minTapTarget / 2,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  spacer: { width: minTapTarget },
  caption: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
});

import { Pressable, StyleSheet } from 'react-native';

import { useSavedState } from '@/session/saved';
import { minTapTarget, useColors } from '@/theme';

import { Icon } from '../icon';

/**
 * The bookmark that saves a post or comment. Not shown in anonymous mode,
 * which cannot save.
 */
export function SaveButton({
  fullname,
  saved: fromReddit,
  size = 20,
  tint,
}: {
  fullname: string;
  saved: boolean;
  size?: number;
  /** A fixed colour, for over images in the swiper. */
  tint?: string;
}) {
  const colors = useColors();
  const { saved, toggle, canSave } = useSavedState(fullname, fromReddit);
  if (!canSave) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={saved ? 'Unsave' : 'Save'}
      accessibilityState={{ selected: saved }}
      hitSlop={4}
      onPress={toggle}
      style={styles.button}>
      <Icon
        name={saved ? 'bookmark.fill' : 'bookmark'}
        size={size}
        tint={tint ?? (saved ? colors.accent : colors.textSecondary)}
      />
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

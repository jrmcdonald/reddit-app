import {
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
  type TextInputProps,
} from 'react-native';

import { minTapTarget, radius, spacing, type as typeScale, useColors } from '@/theme';

import { Icon } from './icon';

/** A search box: magnifier, the field, and a clear button from iOS. */
export function SearchField({ label, ...rest }: TextInputProps & { label: string }) {
  const colors = useColors();
  // A height of its own, from the text size, rather than the one the input
  // measures: in the Saved list's header that measure came out two or three
  // lines tall now and then, at random (the walkthrough's screenshots).
  const { fontScale } = useWindowDimensions();
  const height = Math.ceil(typeScale.body.lineHeight * fontScale) + spacing.sm * 2;
  return (
    <View
      style={[styles.box, { backgroundColor: colors.surfaceRaised, borderColor: colors.outline }]}>
      <Icon name="magnifyingglass" size={16} color="textSecondary" />
      <TextInput
        accessibilityLabel={label}
        placeholder={label}
        placeholderTextColor={colors.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        returnKeyType="search"
        multiline={false}
        numberOfLines={1}
        // No lineHeight: on iOS it misplaces a one-line input's text.
        style={[styles.input, { fontSize: typeScale.body.fontSize, height, color: colors.text }]}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: minTapTarget,
    paddingHorizontal: spacing.sm + 4,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  input: { flex: 1, paddingVertical: 0 },
});

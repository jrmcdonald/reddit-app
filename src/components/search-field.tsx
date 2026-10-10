import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { minTapTarget, radius, spacing, type as typeScale, useColors } from '@/theme';

import { Icon } from './icon';

/** A search box: magnifier, the field, and a clear button from iOS. */
export function SearchField({ label, ...rest }: TextInputProps & { label: string }) {
  const colors = useColors();
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
        // One line, as in TextField: the field never grows.
        multiline={false}
        numberOfLines={1}
        style={[styles.input, typeScale.body, { color: colors.text }]}
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
  input: { flex: 1, paddingVertical: spacing.sm },
});

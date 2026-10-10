import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Feed } from '@/components/feed/feed';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { useReadySession } from '@/session/session';
import { radius, spacing, useColors } from '@/theme';

export default function PopularScreen() {
  const session = useReadySession();
  return (
    <>
      {session.mode === 'anonymous' ? (
        <Stack.Screen options={{ headerRight: () => <AnonymousBadge /> }} />
      ) : null}
      <Feed feed={{ kind: 'popular' }} />
    </>
  );
}

/** Says, in the bar, that nothing is tied to an account. */
function AnonymousBadge() {
  const colors = useColors();
  return (
    <View
      accessible
      accessibilityLabel="Browsing anonymously"
      style={[styles.badge, { backgroundColor: colors.text }]}>
      <Icon name="eyeglasses" size={14} tint={colors.background} />
      <ThemedText variant="badge" style={{ color: colors.background }}>
        Anonymous
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: radius.lg,
  },
});

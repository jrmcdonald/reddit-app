import { Stack } from 'expo-router';

import { useColors } from '@/theme';

/**
 * A tab's own stack, so its root screen gets a native large title that
 * collapses into the bar as the list scrolls, as iOS tab screens do (HIG
 * Navigation bars). Content scroll views use
 * `contentInsetAdjustmentBehavior="automatic"` to sit under it.
 */
export function TabStack({ title }: { title: string }) {
  const colors = useColors();
  return (
    <Stack
      screenOptions={{
        headerLargeTitle: true,
        headerLargeTitleShadowVisible: false,
        headerShadowVisible: false,
        headerTintColor: colors.accent,
        headerStyle: { backgroundColor: colors.background },
        headerLargeStyle: { backgroundColor: colors.background },
        headerTitleStyle: { color: colors.text },
        headerLargeTitleStyle: { color: colors.text },
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen name="index" options={{ title }} />
    </Stack>
  );
}

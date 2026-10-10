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
        // The titles take their colour from the tint, as pokecollector-app's
        // do. With a colour in headerTitleStyle and headerLargeTitleStyle
        // instead, no large title showed on the simulator, in either theme.
        headerTintColor: colors.text,
        headerStyle: { backgroundColor: colors.background },
        headerLargeStyle: { backgroundColor: colors.background },
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen name="index" options={{ title }} />
    </Stack>
  );
}

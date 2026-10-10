import { Stack } from 'expo-router';

import { useColors } from '@/theme';

/**
 * A tab's own stack, with its title in the navigation bar. Content scroll
 * views use `contentInsetAdjustmentBehavior="automatic"` to sit under it.
 *
 * Not iOS's large titles: on the simulator they reserved their space but
 * drew no text, in either theme, whatever the title's style (see
 * docs/DECISIONS.md). The bar's own title shows, as on the post screen.
 */
export function TabStack({ title }: { title: string }) {
  const colors = useColors();
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerTintColor: colors.accent,
        headerTitleStyle: { color: colors.text },
        headerStyle: { backgroundColor: colors.background },
        contentStyle: { backgroundColor: colors.background },
      }}>
      <Stack.Screen name="index" options={{ title }} />
    </Stack>
  );
}

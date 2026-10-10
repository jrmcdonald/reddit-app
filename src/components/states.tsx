/** What a screen shows instead of content: loading, empty, or failed. */
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ApiError, ClientError, NetworkError, RateLimitError } from '@/api/errors';
import { spacing, useColors } from '@/theme';

import { Button } from './button';
import { ThemedText } from './themed-text';

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message?: string;
  action?: { title: string; onPress(): void };
}) {
  return (
    <View style={styles.centered}>
      <ThemedText variant="heading" style={styles.text}>
        {title}
      </ThemedText>
      {message ? (
        <ThemedText color="textSecondary" style={styles.text}>
          {message}
        </ThemedText>
      ) : null}
      {action ? <Button title={action.title} variant="secondary" onPress={action.onPress} /> : null}
    </View>
  );
}

/** A failed load, with a retry. */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry(): void }) {
  const title =
    error instanceof NetworkError
      ? 'Offline'
      : error instanceof RateLimitError
        ? 'Slow down'
        : error instanceof ClientError
          ? 'Client ID refused'
          : 'Something went wrong';
  const message = error instanceof ApiError ? error.message : 'Reddit sent something unexpected.';
  return (
    <EmptyState title={title} message={message} action={{ title: 'Try again', onPress: onRetry }} />
  );
}

export function LoadingState({ label = 'Loading' }: { label?: string }) {
  const colors = useColors();
  return (
    <View style={styles.centered} accessible accessibilityLabel={label}>
      <ActivityIndicator color={colors.textSecondary} />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.md,
    minHeight: 240,
  },
  text: { textAlign: 'center' },
});

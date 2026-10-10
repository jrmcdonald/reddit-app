import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import type { Subreddit } from '@/api/endpoints';
import { useColors } from '@/theme';
import { plural } from '@/utils/format';

import { ListRow } from './list-row';
import { ThemedText } from './themed-text';

/** A subreddit in a list: icon, name and members. Opens its feed. */
export function SubredditRow({ subreddit }: { subreddit: Subreddit }) {
  const subtitle = [
    subreddit.subscribers !== null ? plural(subreddit.subscribers, 'member') : null,
    subreddit.nsfw ? 'NSFW' : null,
    subreddit.title,
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <ListRow
      title={`r/${subreddit.name}`}
      subtitle={subtitle || undefined}
      leading={<SubredditIcon subreddit={subreddit} />}
      onPress={() => router.push({ pathname: '/r/[name]', params: { name: subreddit.name } })}
    />
  );
}

export function SubredditIcon({ subreddit, size = 32 }: { subreddit: Subreddit; size?: number }) {
  const colors = useColors();
  const box = { width: size, height: size, borderRadius: size / 2 };
  if (subreddit.icon) {
    return (
      <Image
        source={{ uri: subreddit.icon }}
        style={[box, { backgroundColor: colors.surfaceRaised }]}
        accessibilityIgnoresInvertColors
      />
    );
  }
  return (
    <View style={[box, styles.letter, { backgroundColor: colors.surfaceRaised }]}>
      <ThemedText variant="label" color="textSecondary">
        {subreddit.name.slice(0, 1).toUpperCase()}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  letter: { alignItems: 'center', justifyContent: 'center' },
});

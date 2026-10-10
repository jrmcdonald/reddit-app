import { Stack, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Feed } from '@/components/feed/feed';
import { SubredditIcon } from '@/components/subreddit-row';
import { ThemedText } from '@/components/themed-text';
import { useSubreddit } from '@/hooks/queries';
import { spacing } from '@/theme';
import { plural } from '@/utils/format';

/** A subreddit's posts, under its name, members and description. */
export default function SubredditScreen() {
  const { name = '' } = useLocalSearchParams<{ name: string }>();
  const about = useSubreddit(name);
  const subreddit = about.data;

  const header = (
    <View style={styles.header}>
      <View style={styles.titleRow}>
        {subreddit ? <SubredditIcon subreddit={subreddit} size={44} /> : null}
        <View style={styles.titleText}>
          <ThemedText variant="title" numberOfLines={1}>
            r/{subreddit?.name ?? name}
          </ThemedText>
          {subreddit?.subscribers !== undefined && subreddit.subscribers !== null ? (
            <ThemedText variant="caption" color="textSecondary">
              {plural(subreddit.subscribers, 'member')}
              {subreddit.nsfw ? ' · NSFW' : ''}
            </ThemedText>
          ) : null}
        </View>
      </View>
      {subreddit?.description ? (
        <ThemedText color="textSecondary" numberOfLines={4}>
          {subreddit.description}
        </ThemedText>
      ) : null}
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: `r/${subreddit?.name ?? name}`, headerLargeTitle: false }} />
      <Feed feed={{ kind: 'subreddit', name }} header={header} />
    </>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.md, gap: spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4 },
  titleText: { flex: 1 },
});

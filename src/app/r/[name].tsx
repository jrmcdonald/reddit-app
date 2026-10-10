import * as Haptics from 'expo-haptics';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Feed } from '@/components/feed/feed';
import { Icon } from '@/components/icon';
import { SubredditIcon } from '@/components/subreddit-row';
import { ThemedText } from '@/components/themed-text';
import { useSubreddit } from '@/hooks/queries';
import { isSubredditMuted, setSubredditMuted, usePreferences } from '@/settings/preferences';
import { minTapTarget, spacing } from '@/theme';
import { plural } from '@/utils/format';

/** A subreddit's posts, under its name, members and description. */
export default function SubredditScreen() {
  const { name = '' } = useLocalSearchParams<{ name: string }>();
  const about = useSubreddit(name);
  const subreddit = about.data;
  const preferences = usePreferences();
  const muted = isSubredditMuted(preferences, name);
  const shownName = subreddit?.name ?? name;

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
      {muted ? (
        <ThemedText variant="caption" color="textSecondary">
          Muted: its posts are left out of Home and Popular.
        </ThemedText>
      ) : null}
      {subreddit?.description ? (
        <ThemedText color="textSecondary" numberOfLines={4}>
          {subreddit.description}
        </ThemedText>
      ) : null}
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: `r/${shownName}`,
          headerLargeTitle: false,
          headerRight: () => (
            <MuteButton
              name={shownName}
              muted={muted}
              onPress={() => {
                setSubredditMuted(shownName, !muted);
                Haptics.selectionAsync().catch(() => undefined);
              }}
            />
          ),
        }}
      />
      <Feed feed={{ kind: 'subreddit', name }} header={header} />
    </>
  );
}

/** Mutes the subreddit in Home and Popular, or unmutes it. */
function MuteButton({ name, muted, onPress }: { name: string; muted: boolean; onPress(): void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={muted ? `Unmute r/${name}` : `Mute r/${name}`}
      accessibilityHint={
        muted
          ? 'Shows its posts in Home and Popular again'
          : 'Leaves its posts out of Home and Popular'
      }
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.headerButton, pressed && { opacity: 0.6 }]}>
      <Icon name={muted ? 'speaker.slash.fill' : 'speaker.slash'} size={20} color="accent" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  headerButton: {
    minWidth: minTapTarget,
    minHeight: minTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: { paddingHorizontal: spacing.md, paddingTop: spacing.md, gap: spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4 },
  titleText: { flex: 1 },
});

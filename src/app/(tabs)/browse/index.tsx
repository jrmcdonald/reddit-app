import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { ListRow } from '@/components/list-row';
import { SearchField } from '@/components/search-field';
import { ErrorState, LoadingState } from '@/components/states';
import { SubredditRow } from '@/components/subreddit-row';
import { ThemedText } from '@/components/themed-text';
import { useSubredditSearch, useSubscriptions } from '@/hooks/queries';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useReadySession } from '@/session/session';
import { usePreferences } from '@/settings/preferences';
import { spacing } from '@/theme';

const NAME = /^[A-Za-z0-9_]{2,21}$/;

/**
 * Find a subreddit by name, or pick one of your subscriptions. Searching
 * waits for a pause in typing, so each word is one request, not a letter.
 */
export default function BrowseScreen() {
  const session = useReadySession();
  const preferences = usePreferences();
  const [text, setText] = useState('');
  const query = useDebouncedValue(text.trim().replace(/^\/?r\//i, ''), 500);
  const search = useSubredditSearch(query);
  const subscriptions = useSubscriptions();
  const searching = query.length >= 2;
  const typedName = text.trim().replace(/^\/?r\//i, '');

  const results = (search.data ?? []).filter((s) => preferences.showNsfw || !s.nsfw);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardDismissMode="on-drag"
      keyboardShouldPersistTaps="handled">
      <View style={styles.search}>
        <SearchField
          label="Search subreddits"
          value={text}
          onChangeText={setText}
          onSubmitEditing={() => {
            if (NAME.test(typedName)) {
              router.push({ pathname: '/r/[name]', params: { name: typedName } });
            }
          }}
        />
      </View>

      {NAME.test(typedName) ? (
        <ListRow
          title={`Go to r/${typedName}`}
          onPress={() => router.push({ pathname: '/r/[name]', params: { name: typedName } })}
        />
      ) : null}

      {searching ? (
        <>
          <Section title="Subreddits" />
          {search.isPending ? (
            <LoadingState label="Searching" />
          ) : search.isError ? (
            <ErrorState error={search.error} onRetry={() => search.refetch()} />
          ) : results.length ? (
            results.map((subreddit) => <SubredditRow key={subreddit.name} subreddit={subreddit} />)
          ) : (
            <ThemedText color="textSecondary" style={styles.note}>
              No subreddits match “{query}”.
            </ThemedText>
          )}
        </>
      ) : session.mode === 'user' ? (
        <>
          <Section title="Your subscriptions" />
          {subscriptions.isPending ? (
            <LoadingState label="Loading subscriptions" />
          ) : subscriptions.isError ? (
            <ErrorState error={subscriptions.error} onRetry={() => subscriptions.refetch()} />
          ) : (
            subscriptions.data
              .filter((s) => preferences.showNsfw || !s.nsfw)
              .map((subreddit) => <SubredditRow key={subreddit.name} subreddit={subreddit} />)
          )}
        </>
      ) : (
        <ThemedText color="textSecondary" style={styles.note}>
          Type a subreddit’s name to open it, or search by topic. Anonymous mode has no
          subscriptions: nothing is tied to an account.
        </ThemedText>
      )}
    </ScrollView>
  );
}

function Section({ title }: { title: string }) {
  return (
    <ThemedText variant="overline" color="textSecondary" style={styles.section}>
      {title}
    </ThemedText>
  );
}

const styles = StyleSheet.create({
  search: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  section: { paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: spacing.xs },
  note: { padding: spacing.md },
});

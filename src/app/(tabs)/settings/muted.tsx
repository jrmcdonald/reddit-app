import { Stack } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import {
  addMutedWord,
  removeMutedWord,
  setSubredditMuted,
  usePreferences,
} from '@/settings/preferences';
import { minTapTarget, radius, spacing, type as typeScale, useColors } from '@/theme';

const NAME = /^[A-Za-z0-9_]{2,21}$/;

/**
 * Muted subreddits and words: add one by typing it, remove one with its
 * button. A muted subreddit leaves Home and Popular; a muted word or phrase
 * hides posts with it in the title or flair from every feed.
 */
export default function MutedScreen() {
  const preferences = usePreferences();
  const [word, setWord] = useState('');
  const [subreddit, setSubreddit] = useState('');
  const subredditName = subreddit.trim().replace(/^\/?r\//i, '');

  const submitWord = () => {
    if (addMutedWord(word) || !word.trim()) setWord('');
  };
  const submitSubreddit = () => {
    if (!NAME.test(subredditName)) return;
    setSubredditMuted(subredditName, true);
    setSubreddit('');
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Muted' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}>
        <Section
          title="Words"
          note="Posts with these in the title or flair are left out of every feed. Whole words, any case.">
          <AddField
            label="Mute a word or phrase"
            addLabel="Add word"
            value={word}
            onChangeText={setWord}
            onSubmit={submitWord}
            canAdd={!!word.trim()}
          />
          {preferences.mutedWords.map((muted) => (
            <MutedRow key={muted} title={muted} onRemove={() => removeMutedWord(muted)} />
          ))}
        </Section>
        <Section
          title="Subreddits"
          note="Left out of Home and Popular. Opening the subreddit still shows its posts.">
          <AddField
            label="Mute a subreddit"
            addLabel="Add subreddit"
            value={subreddit}
            onChangeText={setSubreddit}
            onSubmit={submitSubreddit}
            canAdd={NAME.test(subredditName)}
            prefix="r/"
          />
          {preferences.mutedSubreddits.map((muted) => (
            <MutedRow
              key={muted}
              title={`r/${muted}`}
              onRemove={() => setSubredditMuted(muted, false)}
            />
          ))}
        </Section>
      </ScrollView>
    </>
  );
}

function Section({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText variant="overline" color="textSecondary" style={styles.sectionTitle}>
        {title}
      </ThemedText>
      <View style={styles.sectionBody}>{children}</View>
      <ThemedText variant="caption" color="textSecondary" style={styles.note}>
        {note}
      </ThemedText>
    </View>
  );
}

function AddField({
  label,
  addLabel,
  value,
  onChangeText,
  onSubmit,
  canAdd,
  prefix,
}: {
  label: string;
  addLabel: string;
  value: string;
  onChangeText(text: string): void;
  onSubmit(): void;
  canAdd: boolean;
  prefix?: string;
}) {
  const colors = useColors();
  return (
    <View
      style={[styles.row, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      {prefix ? (
        <ThemedText
          color="textSecondary"
          accessibilityElementsHidden
          importantForAccessibility="no">
          {prefix}
        </ThemedText>
      ) : null}
      <TextInput
        accessibilityLabel={label}
        placeholder={label}
        placeholderTextColor={colors.textSecondary}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        submitBehavior="submit"
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="done"
        style={[styles.input, typeScale.body, { color: colors.text }]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={addLabel}
        accessibilityState={{ disabled: !canAdd }}
        disabled={!canAdd}
        onPress={onSubmit}
        style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.6 }]}>
        <Icon name="plus.circle.fill" size={24} color={canAdd ? 'accent' : 'textSecondary'} />
      </Pressable>
    </View>
  );
}

function MutedRow({ title, onRemove }: { title: string; onRemove(): void }) {
  const colors = useColors();
  return (
    <View
      style={[styles.row, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <ThemedText style={styles.rowTitle}>{title}</ThemedText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Unmute ${title}`}
        onPress={onRemove}
        style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.6 }]}>
        <Icon name="minus.circle.fill" size={24} color="danger" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xl },
  section: { marginTop: spacing.md },
  sectionTitle: { paddingHorizontal: spacing.md + 4, paddingBottom: spacing.xs + 2 },
  sectionBody: { marginHorizontal: spacing.md, borderRadius: radius.md, overflow: 'hidden' },
  note: { paddingHorizontal: spacing.md + 4, paddingTop: spacing.xs + 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: minTapTarget + 4,
    paddingLeft: spacing.md,
    paddingRight: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowTitle: { flex: 1, paddingVertical: spacing.sm },
  input: { flex: 1, paddingVertical: spacing.sm },
  iconButton: {
    width: minTapTarget,
    height: minTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

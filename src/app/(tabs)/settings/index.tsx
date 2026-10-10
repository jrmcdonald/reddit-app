import Constants from 'expo-constants';
import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { useState, type ReactNode } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { ListRow } from '@/components/list-row';
import { Segmented } from '@/components/segmented';
import { ThemedText } from '@/components/themed-text';
import { clearQueryCache } from '@/session/query';
import { useReadySession, useSession } from '@/session/session';
import { updatePreferences, usePreferences, type Preferences } from '@/settings/preferences';
import { radius, spacing, useColors } from '@/theme';

const REPOSITORY = 'https://github.com/jrmcdonald/reddit-app';

export default function SettingsScreen() {
  const colors = useColors();
  const session = useReadySession();
  const { clientId, savedUsername, signIn, signOut, browseAnonymously, switchToAccount } =
    useSession();
  const preferences = usePreferences();
  const [busy, setBusy] = useState(false);

  const confirmSignOut = () =>
    Alert.alert(
      'Sign out?',
      'Perch forgets your sign-in and tells Reddit to revoke it. The client ID stays.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign out', style: 'destructive', onPress: () => void signOut() },
      ],
    );

  const onSignIn = async () => {
    if (!clientId) return;
    setBusy(true);
    const result = await signIn(clientId);
    setBusy(false);
    if (!result.ok && !result.cancelled) Alert.alert('Not signed in', result.message);
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.content}
      style={{ backgroundColor: colors.background }}>
      <Group title="Account">
        {session.mode === 'user' ? (
          <>
            <ListRow
              title={`u/${session.username}`}
              subtitle="Signed in · reads and saves only"
              kind="action"
            />
            <ListRow
              title="Browse anonymously"
              subtitle="Keeps your sign-in for later"
              kind="action"
              onPress={() => clientId && void browseAnonymously(clientId)}
            />
            <ListRow title="Sign out" kind="destructive" onPress={confirmSignOut} />
          </>
        ) : (
          <>
            <ListRow
              title="Anonymous"
              subtitle="Popular and any subreddit, with no account"
              kind="action"
            />
            {savedUsername ? (
              <ListRow
                title={`Use u/${savedUsername}`}
                kind="action"
                onPress={() => void switchToAccount()}
              />
            ) : (
              <ListRow
                title={busy ? 'Signing in…' : 'Sign in with Reddit'}
                kind="action"
                onPress={busy ? undefined : () => void onSignIn()}
              />
            )}
            <ListRow
              title="Change client ID"
              subtitle={clientId ?? undefined}
              kind="action"
              onPress={() => void signOut()}
            />
          </>
        )}
      </Group>

      <Group title="Appearance">
        <View style={[styles.cell, { backgroundColor: colors.surface }]}>
          <ThemedText variant="label">Theme</ThemedText>
          <Segmented
            label="Theme"
            value={preferences.theme}
            onChange={(theme) => updatePreferences({ theme })}
            options={[
              { value: 'system', label: 'System' },
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
          />
        </View>
      </Group>

      <Group title="Feeds and media">
        <View style={[styles.cell, { backgroundColor: colors.surface }]}>
          <ThemedText variant="label">New feeds open as</ThemedText>
          <Segmented
            label="New feeds open as"
            value={preferences.defaultView}
            onChange={(defaultView) => updatePreferences({ defaultView })}
            options={[
              { value: 'list', label: 'List' },
              { value: 'cards', label: 'Cards' },
              { value: 'grid', label: 'Grid' },
            ]}
          />
        </View>
        <View style={[styles.cell, { backgroundColor: colors.surface }]}>
          <ThemedText variant="label">Play videos automatically</ThemedText>
          <Segmented
            label="Play videos automatically"
            value={preferences.autoplay}
            onChange={(autoplay) => updatePreferences({ autoplay })}
            options={[
              { value: 'always', label: 'Always' },
              { value: 'wifi', label: 'On Wi-Fi' },
              { value: 'never', label: 'Never' },
            ]}
          />
        </View>
      </Group>

      <Group title="Content">
        <Toggle
          title="Show NSFW posts"
          subtitle="Off leaves them out of every feed"
          setting="showNsfw"
          preferences={preferences}
        />
        <Toggle
          title="Cover NSFW media"
          subtitle="Tap a post’s picture to show it"
          setting="coverNsfw"
          preferences={preferences}
        />
        <Toggle
          title="Cover spoilers"
          subtitle="Pictures in posts marked as spoilers"
          setting="coverSpoilers"
          preferences={preferences}
        />
      </Group>

      <Group title="About">
        <ListRow
          title="Clear cached posts"
          subtitle="Feeds load fresh from Reddit"
          kind="action"
          onPress={() =>
            void clearQueryCache().then(() => Alert.alert('Cleared', 'Cached posts are gone.'))
          }
        />
        <ListRow
          title="Source code and privacy"
          subtitle="What Perch sends, and to whom"
          onPress={() =>
            WebBrowser.openBrowserAsync(REPOSITORY, { controlsColor: colors.accent }).catch(
              () => undefined,
            )
          }
        />
        <ListRow
          title="Version"
          kind="action"
          trailing={
            <ThemedText color="textSecondary">
              {Constants.expoConfig?.version ?? '0.0.0'} (
              {Constants.expoConfig?.ios?.buildNumber ?? '1'})
            </ThemedText>
          }
        />
      </Group>
      <View
        style={styles.footer}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants">
        <Image
          source={require('@/assets/images/icon.png')}
          style={styles.icon}
          accessibilityIgnoresInvertColors
        />
        <ThemedText variant="caption" color="textSecondary">
          Not affiliated with Reddit.
        </ThemedText>
      </View>
    </ScrollView>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.group}>
      <ThemedText variant="overline" color="textSecondary" style={styles.groupTitle}>
        {title}
      </ThemedText>
      <View style={styles.groupBody}>{children}</View>
    </View>
  );
}

function Toggle({
  title,
  subtitle,
  setting,
  preferences,
}: {
  title: string;
  subtitle: string;
  setting: 'showNsfw' | 'coverNsfw' | 'coverSpoilers';
  preferences: Preferences;
}) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.toggle,
        { backgroundColor: colors.surface, borderBottomColor: colors.border },
      ]}>
      <View
        style={styles.toggleText}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants">
        <ThemedText variant="label">{title}</ThemedText>
        <ThemedText variant="caption" color="textSecondary">
          {subtitle}
        </ThemedText>
      </View>
      <Switch
        accessibilityLabel={title}
        accessibilityHint={subtitle}
        value={preferences[setting]}
        onValueChange={(value) => updatePreferences({ [setting]: value })}
        trackColor={{ true: colors.accent }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xl },
  group: { marginTop: spacing.md },
  groupTitle: { paddingHorizontal: spacing.md + 4, paddingBottom: spacing.xs + 2 },
  groupBody: { marginHorizontal: spacing.md, borderRadius: radius.md, overflow: 'hidden' },
  cell: { padding: spacing.md, gap: spacing.sm },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toggleText: { flex: 1, gap: 2 },
  footer: { alignItems: 'center', gap: spacing.sm, marginTop: spacing.xl },
  icon: { width: 48, height: 48, borderRadius: 11 },
});

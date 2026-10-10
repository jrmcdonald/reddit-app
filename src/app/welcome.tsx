import { useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { REDIRECT_URI } from '@/api/config';
import { isClientId } from '@/api/oauth';
import { Button } from '@/components/button';
import { Icon } from '@/components/icon';
import { TextField } from '@/components/text-field';
import { ThemedText } from '@/components/themed-text';
import { useSession } from '@/session/session';
import { radius, spacing, useColors } from '@/theme';

/**
 * The first run, and after signing out: the Reddit app's client ID, then
 * sign in with Reddit or browse anonymously. Both need the client ID.
 */
export default function WelcomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { session, clientId: saved, signIn, browseAnonymously } = useSession();
  const [clientId, setClientId] = useState(saved ?? '');
  const [busy, setBusy] = useState<'signIn' | 'anonymous' | null>(null);
  const [message, setMessage] = useState<string | null>(
    session.status === 'choosing' ? session.notice : null,
  );

  const trimmed = clientId.trim();
  const valid = isClientId(trimmed);

  const onSignIn = async () => {
    setBusy('signIn');
    setMessage(null);
    const result = await signIn(trimmed);
    setBusy(null);
    if (!result.ok && !result.cancelled) setMessage(result.message);
  };

  const onAnonymous = async () => {
    setBusy('anonymous');
    await browseAnonymously(trimmed);
    setBusy(null);
  };

  return (
    <KeyboardAvoidingView
      behavior="padding"
      style={[styles.fill, { backgroundColor: colors.background }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.xl * 2, paddingBottom: insets.bottom + spacing.lg },
        ]}
        keyboardShouldPersistTaps="handled">
        <View style={styles.intro}>
          <View style={[styles.mark, { backgroundColor: colors.accent }]}>
            <Icon name="eye" size={34} tint={colors.onAccent} />
          </View>
          <ThemedText variant="title" style={styles.name}>
            Perch
          </ThemedText>
          <ThemedText color="textSecondary">
            A quiet Reddit reader. Your feeds, posts and saves, with no ads, no voting and no
            replying.
          </ThemedText>
        </View>

        <TextField
          label="Reddit app client ID"
          hint={`From your installed app at reddit.com/prefs/apps, with the redirect URI ${REDIRECT_URI}. Kept in the Keychain on this phone.`}
          value={clientId}
          onChangeText={setClientId}
          placeholder="e.g. AbC123xYz-example"
          returnKeyType="done"
          textContentType="none"
          autoComplete="off"
        />
        {trimmed && !valid ? (
          <ThemedText variant="caption" style={{ color: colors.danger }}>
            A client ID is 14 to 30 letters, numbers, dashes and underscores.
          </ThemedText>
        ) : null}

        <View style={styles.spacer} />

        {message ? (
          <View
            accessible
            accessibilityLiveRegion="polite"
            style={[
              styles.notice,
              { backgroundColor: colors.surface, borderColor: colors.outline },
            ]}>
            <ThemedText>{message}</ThemedText>
          </View>
        ) : null}

        <View style={styles.actions}>
          <Button
            title="Sign in with Reddit"
            disabled={!valid || busy !== null}
            busy={busy === 'signIn'}
            onPress={onSignIn}
          />
          <ThemedText variant="caption" color="textSecondary" style={styles.center}>
            Opens Reddit’s own sign-in page. Perch asks only to read and to save, and never sees
            your password.
          </ThemedText>
          <Button
            title="Browse anonymously"
            variant="secondary"
            disabled={!valid || busy !== null}
            busy={busy === 'anonymous'}
            onPress={onAnonymous}
          />
        </View>
        <ThemedText variant="caption" color="textSecondary" style={styles.center}>
          Personal use only. Not affiliated with Reddit.
        </ThemedText>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: spacing.lg, gap: spacing.md },
  intro: { gap: spacing.sm + 2, marginBottom: spacing.md },
  mark: {
    width: 64,
    height: 64,
    borderRadius: radius.lg - 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { fontSize: 34, lineHeight: 40 },
  spacer: { flex: 1, minHeight: spacing.lg },
  notice: { borderWidth: 1, borderRadius: radius.md, padding: spacing.md },
  actions: { gap: spacing.sm + 4 },
  center: { textAlign: 'center' },
});

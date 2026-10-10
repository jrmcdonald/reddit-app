import { DarkTheme, DefaultTheme, Stack, ThemeProvider, type Theme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Appearance, StyleSheet, useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { QueryProvider } from '@/session/query';
import { RevealedProvider } from '@/session/revealed';
import { SavedProvider } from '@/session/saved';
import { SessionProvider, useSession } from '@/session/session';
import { loadPreferences, usePreferences } from '@/settings/preferences';
import { palettes, SchemeContext, useColors, type Scheme } from '@/theme';

SplashScreen.preventAutoHideAsync();

/**
 * The colour scheme: the phone's, unless Settings picks one. Setting it on
 * Appearance too makes the native parts (headers, tab bar, alerts, the
 * keyboard) follow.
 */
function useAppScheme(): Scheme {
  const { theme } = usePreferences();
  useEffect(() => {
    Appearance.setColorScheme(theme === 'system' ? 'unspecified' : theme);
  }, [theme]);
  const system = useColorScheme();
  if (theme !== 'system') return theme;
  return system === 'dark' ? 'dark' : 'light';
}

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    loadPreferences().finally(() => setReady(true));
  }, []);
  const scheme = useAppScheme();
  const colors = palettes[scheme];
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const navigationTheme: Theme = {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.accent,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      border: colors.border,
    },
  };
  if (!ready) return null;
  return (
    <GestureHandlerRootView style={styles.fill}>
      <SchemeContext.Provider value={scheme}>
        <ThemeProvider value={navigationTheme}>
          <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
          <QueryProvider>
            <SessionProvider>
              <RevealedProvider>
                <RootStack />
              </RevealedProvider>
            </SessionProvider>
          </QueryProvider>
        </ThemeProvider>
      </SchemeContext.Provider>
    </GestureHandlerRootView>
  );
}

function RootStack() {
  const { session } = useSession();
  const colors = useColors();
  const ready = session.status !== 'loading';
  const inApp = session.status === 'ready';

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  // Hold the splash screen until the Keychain has been read, so a signed-in
  // person never sees the first-run screen flash past.
  if (!ready) return null;

  return (
    <SavedProvider key={inApp ? session.cacheId : 'none'}>
      <Stack
        screenOptions={{
          headerBackButtonDisplayMode: 'minimal',
          headerBackTitle: 'Back',
          headerTintColor: colors.accent,
          headerTitleStyle: { color: colors.text },
          contentStyle: { backgroundColor: colors.background },
        }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Protected guard={inApp}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="post/[id]" options={{ title: '' }} />
          <Stack.Screen name="r/[name]" options={{ title: '' }} />
          <Stack.Screen
            name="swiper"
            options={{ headerShown: false, presentation: 'fullScreenModal', animation: 'fade' }}
          />
        </Stack.Protected>
        <Stack.Protected guard={!inApp}>
          <Stack.Screen name="welcome" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
    </SavedProvider>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});

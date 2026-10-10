/**
 * The person's settings: theme, what to cover or hide, and how each feed is
 * shown. Kept in AsyncStorage (nothing in them is secret) and read
 * synchronously after the first load, so a screen never flashes the
 * defaults.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { z } from 'zod';

import { COMMENT_SORTS } from '@/api/endpoints';

/** How a feed is laid out. The swiper is not one: it opens over the feed. */
export const VIEWS = ['list', 'cards', 'grid'] as const;
export type View = (typeof VIEWS)[number];

const PreferencesSchema = z.object({
  theme: z.enum(['system', 'light', 'dark']).catch('system'),
  /** Off: NSFW posts are left out of every feed. */
  showNsfw: z.boolean().catch(true),
  coverNsfw: z.boolean().catch(true),
  coverSpoilers: z.boolean().catch(true),
  /** The view a feed opens in until it is given its own. */
  defaultView: z.enum(VIEWS).catch('list'),
  /** Per feed ("home", "popular", "r/<name>"), the view last chosen for it. */
  feedViews: z.record(z.string(), z.enum(VIEWS)).catch({}),
  autoplay: z.enum(['always', 'wifi', 'never']).catch('wifi'),
  commentSort: z.enum(COMMENT_SORTS).catch('confidence'),
});
export type Preferences = z.infer<typeof PreferencesSchema>;

export const DEFAULTS: Preferences = PreferencesSchema.parse({});

const KEY = 'perch.preferences.v1';

let current: Preferences = DEFAULTS;
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

/** Reads a stored value, keeping every setting that is still valid. */
export function parsePreferences(json: string | null): Preferences {
  if (!json) return DEFAULTS;
  try {
    return PreferencesSchema.parse(JSON.parse(json));
  } catch {
    return DEFAULTS;
  }
}

export async function loadPreferences(): Promise<void> {
  if (loaded) return;
  try {
    current = parsePreferences(await AsyncStorage.getItem(KEY));
  } catch {
    current = DEFAULTS;
  }
  loaded = true;
  emit();
}

export function updatePreferences(change: Partial<Preferences>) {
  current = { ...current, ...change };
  emit();
  AsyncStorage.setItem(KEY, JSON.stringify(current)).catch(() => undefined);
}

export function getPreferences(): Preferences {
  return current;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePreferences(): Preferences {
  return useSyncExternalStore(subscribe, getPreferences);
}

/** A feed's view: its own, or the default. */
export function viewFor(preferences: Preferences, feedKey: string): View {
  return preferences.feedViews[feedKey] ?? preferences.defaultView;
}

export function setFeedView(feedKey: string, view: View) {
  updatePreferences({ feedViews: { ...current.feedViews, [feedKey]: view } });
}

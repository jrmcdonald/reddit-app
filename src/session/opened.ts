/**
 * The posts the person has opened, so feeds can dim their titles. Reddit
 * keeps this only for paying accounts, and not for anonymous mode, so it is
 * kept on the phone, in AsyncStorage: the most recent ids, a few thousand
 * at most.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useSyncExternalStore } from 'react';

const KEY = 'perch.opened.v1';

/** Enough for weeks of reading; the oldest are forgotten first. */
export const MAX_OPENED = 3000;

/** Insertion order is age: the first id is the oldest. */
let opened = new Set<string>();
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function persist() {
  AsyncStorage.setItem(KEY, JSON.stringify([...opened])).catch(() => undefined);
}

/** Reads a stored list, ignoring anything that is not a list of ids. */
export function parseOpened(json: string | null): Set<string> {
  if (!json) return new Set();
  try {
    const value: unknown = JSON.parse(json);
    if (!Array.isArray(value)) return new Set();
    const ids = value.filter((id): id is string => typeof id === 'string');
    return new Set(ids.slice(-MAX_OPENED));
  } catch {
    return new Set();
  }
}

export async function loadOpened(): Promise<void> {
  if (loaded) return;
  try {
    const stored = parseOpened(await AsyncStorage.getItem(KEY));
    // Anything opened while the list loaded is newer than all of it.
    opened = new Set([...stored, ...opened]);
  } catch {
    // Nothing stored, or unreadable: start afresh.
  }
  loaded = true;
  emit();
}

/** Remembers a post as opened, as the newest. */
export function markOpened(id: string) {
  if (!id) return;
  const next = new Set(opened);
  // Delete first, so a post opened again moves to the newest end.
  next.delete(id);
  next.add(id);
  while (next.size > MAX_OPENED) {
    const oldest = next.values().next().value;
    if (oldest === undefined) break;
    next.delete(oldest);
  }
  opened = next;
  emit();
  persist();
}

export function isOpened(id: string): boolean {
  return opened.has(id);
}

/** Forgets every opened post. */
export function clearOpened() {
  opened = new Set();
  emit();
  persist();
}

/** Whether a post has been opened; re-renders when that changes. */
export function useOpened(id: string): boolean {
  const getSnapshot = useCallback(() => opened.has(id), [id]);
  return useSyncExternalStore(subscribe, getSnapshot);
}

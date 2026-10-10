/**
 * What the app keeps in the iOS Keychain: the Reddit app's client ID, the
 * signed-in account's refresh token and name, the anonymous device ID, and
 * which of the two modes is in use.
 *
 * One Keychain item holding JSON, so a save is atomic. Nothing here is ever
 * written anywhere else: not AsyncStorage, not the query cache, not logs.
 */
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { z } from 'zod';

const KEY = 'perch.auth.v1';

const OPTIONS: SecureStore.SecureStoreOptions = {
  // Readable once the phone has been unlocked after boot; never synced to
  // other devices through iCloud Keychain.
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};

const AccountSchema = z.object({
  refreshToken: z.string().min(1),
  username: z.string().min(1),
  /**
   * An opaque id for the account, which query keys use instead of the
   * username: the query cache is persisted to AsyncStorage, which is
   * neither encrypted nor kept out of backups.
   */
  cacheId: z.string().min(1),
});
export type Account = z.infer<typeof AccountSchema>;

const StoredSchema = z.object({
  clientId: z.string().nullable(),
  /** For anonymous mode's application-only tokens: random, 24 characters. */
  deviceId: z.string().min(20).max(30),
  account: AccountSchema.nullable(),
  /** Null until the person picks on the first-run screen, or after signing out. */
  mode: z.enum(['user', 'anonymous']).nullable(),
});
export type Stored = z.infer<typeof StoredSchema>;

export function parseStored(json: string | null): Stored | null {
  if (!json) return null;
  try {
    const parsed = StoredSchema.safeParse(JSON.parse(json));
    if (!parsed.success) return null;
    // Signed in needs an account; a damaged item falls back to choosing.
    if (parsed.data.mode === 'user' && !parsed.data.account) return { ...parsed.data, mode: null };
    return parsed.data;
  } catch {
    return null;
  }
}

/** Lowercase hex of `bytes` random bytes. */
export function randomHex(bytes: number): string {
  return Array.from(Crypto.getRandomBytes(bytes), (b) => b.toString(16).padStart(2, '0')).join('');
}

export function freshStored(): Stored {
  return { clientId: null, deviceId: randomHex(12), account: null, mode: null };
}

export async function loadStored(): Promise<Stored> {
  return parseStored(await SecureStore.getItemAsync(KEY, OPTIONS)) ?? freshStored();
}

export async function saveStored(stored: Stored): Promise<void> {
  await SecureStore.setItemAsync(KEY, JSON.stringify(stored), OPTIONS);
}

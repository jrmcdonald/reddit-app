/**
 * Two builds of the same app, side by side on one phone:
 *
 *   APP_VARIANT=development  "Perch Dev": the dev client, which loads
 *                            JavaScript from Metro on the PC
 *   APP_VARIANT=production   "Perch": the JavaScript bundled in
 *
 * They need different bundle IDs to coexist. Don't change these IDs
 * casually: each new one uses one of the ten App IDs a free Apple ID may
 * register a week.
 *
 * Nothing secret or personal belongs here: this repository is public. The
 * Reddit client ID is entered on the phone and kept in the Keychain. The
 * bundle ID prefix defaults to this repository's GitHub namespace; a fork
 * sets BUNDLE_ID_PREFIX (locally, or as an Actions variable of the same name).
 *
 * REDDIT_ORIGIN points every Reddit address (sign-in, tokens and the API) at
 * one other server. Only the simulator tests set it, to their fake Reddit;
 * a build for a phone never does.
 *
 * The version is package.json's, which release-please sets. The build number
 * is BUILD_NUMBER, which the iOS build sets to the commit count: SideStore
 * checks both against its source, and a new build needs a higher number.
 */
import type { ConfigContext, ExpoConfig } from 'expo/config';

import { version } from './package.json';

type Variant = 'development' | 'production';

function variant(): Variant {
  const value = process.env.APP_VARIANT ?? 'development';
  if (value !== 'development' && value !== 'production') {
    throw new Error(`APP_VARIANT must be development or production, not ${value}`);
  }
  return value;
}

function buildNumber(): string {
  const value = process.env.BUILD_NUMBER?.trim() || '1';
  if (!/^[1-9]\d*$/.test(value)) {
    throw new Error(`BUILD_NUMBER must be a positive whole number, not ${value}`);
  }
  return value;
}

function bundleIdPrefix(): string {
  const value = process.env.BUNDLE_ID_PREFIX?.trim() || 'io.github.jrmcdonald';
  if (!/^[A-Za-z][A-Za-z0-9-]*(\.[A-Za-z0-9-]+)+$/.test(value)) {
    throw new Error(`BUNDLE_ID_PREFIX must be reverse-DNS, like com.example, not ${value}`);
  }
  return value;
}

function redditOrigin(): string | null {
  const value = process.env.REDDIT_ORIGIN?.trim();
  if (!value) return null;
  if (!/^https:\/\/[^/]+$/.test(value)) {
    throw new Error(`REDDIT_ORIGIN must be an https origin with no path, not ${value}`);
  }
  return value;
}

const VARIANTS = {
  development: { name: 'Perch Dev', suffix: 'perch.dev', scheme: 'perch-dev' },
  production: { name: 'Perch', suffix: 'perch', scheme: 'perch' },
} as const;

export default ({ config }: ConfigContext): ExpoConfig => {
  const v = VARIANTS[variant()];
  return {
    ...config,
    name: v.name,
    slug: 'perch',
    version,
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: v.scheme,
    userInterfaceStyle: 'automatic',
    platforms: ['ios'],
    ios: {
      bundleIdentifier: `${bundleIdPrefix()}.${v.suffix}`,
      buildNumber: buildNumber(),
      supportsTablet: false,
      infoPlist: {
        // Sideloaded, never submitted, but this stops Xcode asking.
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    plugins: [
      'expo-router',
      [
        'expo-splash-screen',
        {
          backgroundColor: '#1F5FD6',
          image: './assets/images/splash-icon.png',
          imageWidth: 96,
        },
      ],
      // No biometrics: the Keychain item is protected by the device passcode.
      ['expo-secure-store', { faceIDPermission: false }],
      'expo-web-browser',
      // Videos play in the app only, never in the background or picture in
      // picture: no background audio mode to declare.
      ['expo-video', { supportsBackgroundPlayback: false, supportsPictureInPicture: false }],
    ],
    extra: {
      redditOrigin: redditOrigin(),
    },
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
  };
};

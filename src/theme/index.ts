/**
 * Colors, spacing and type. A light and a dark palette with the same roles,
 * so a screen asks for "the secondary text color", never a hex value. Which
 * one applies follows the phone, unless Settings picks one (see
 * `ThemeProvider`). The system font throughout: San Francisco, with Dynamic
 * Type.
 */
import { createContext, useContext } from 'react';
import type { TextStyle } from 'react-native';

export const light = {
  text: '#151515',
  textSecondary: '#5B5B5B',
  background: '#F4F4F2',
  /** Rows, cards and grouped sections. */
  surface: '#FFFFFF',
  /** Chips, a segmented control's track, pressed rows. */
  surfaceRaised: '#EAEAE6',
  /** Separators: decoration, so no contrast minimum. */
  border: '#E2E2DE',
  /**
   * The edge of a control recognised by its outline (a text field, an
   * unselected chip): at least 3:1 against every surface (WCAG 2.2 1.4.11).
   */
  outline: '#7E7E79',
  accent: '#1F5FD6',
  onAccent: '#FFFFFF',
  /** The NSFW mark. */
  warning: '#B4330A',
  danger: '#C0262D',
  /** Covers over NSFW and spoiler media, and the swiper's backdrop. */
  cover: '#3A3A3E',
  onCover: '#F2F2F2',
  /** Placeholder behind an image while it loads. */
  placeholder: '#DADAD5',
} as const;

export type Colors = { [K in keyof typeof light]: string };

export const dark: Colors = {
  text: '#EDEDED',
  textSecondary: '#A3A3A8',
  background: '#0D0E10',
  surface: '#17181B',
  surfaceRaised: '#26272C',
  border: '#2A2B30',
  outline: '#75767D',
  accent: '#7AA7FF',
  onAccent: '#0D0E10',
  warning: '#FF8A5C',
  danger: '#FF6B6B',
  cover: '#2E2F35',
  onCover: '#F2F2F2',
  placeholder: '#25262B',
};

export type Scheme = 'light' | 'dark';

export const palettes: Record<Scheme, Colors> = { light, dark };

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 18,
} as const;

/** System font sizes, close to iOS's own text styles. */
export const type = {
  title: { fontSize: 28, lineHeight: 34, fontWeight: '700' },
  heading: { fontSize: 20, lineHeight: 25, fontWeight: '700' },
  postTitle: { fontSize: 17, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 16, lineHeight: 22 },
  label: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18 },
  /** A small uppercase heading over a group of settings. */
  overline: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  /** Labels on badges: NSFW, Spoiler, a gallery's count. */
  badge: { fontSize: 11, lineHeight: 14, fontWeight: '700' },
} as const satisfies Record<string, TextStyle>;

/** The minimum tap target, per Apple's HIG. */
export const minTapTarget = 44;

export const SchemeContext = createContext<Scheme>('light');

export function useScheme(): Scheme {
  return useContext(SchemeContext);
}

export function useColors(): Colors {
  return palettes[useScheme()];
}

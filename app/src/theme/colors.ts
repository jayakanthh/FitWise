/**
 * Single source of truth for app theming. Change a value here and every
 * screen/component that uses the matching token (colors.primary, radius.md,
 * typography.h1, etc) updates automatically — nothing else to touch.
 * Owner: Pruthvi (UI).
 */
export const colors = {
  bg: '#0e1012', // Ultra-dark neutral background
  surface: '#171a1d', // Elevated surface container
  surfaceAlt: '#1c2226', // Lighter surface for inputs/cards
  primary: '#48bb95', // Vibrant High-Contrast Emerald
  primaryDark: '#0e1012', // Text on primary
  text: '#FFFFFF', // Pure white text
  textMuted: '#9ca3af', // Neutral 400 (Tailwind)
  success: '#48bb95',
  danger: '#ff4d4f', // Live red / warning
  warning: '#f97316', // Nutrition Orange
  milestone: '#eab308', // Milestone Gold
  border: '#262c32', // Subtle border
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

/** Corner radii — keep card/button/input rounding consistent app-wide. */
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
};

/**
 * Type scale. fontFamily is undefined = system default; set it here (after
 * loading a custom font via expo-font) to change the whole app's typeface
 * in one place.
 */
export const typography = {
  fontFamily: undefined as string | undefined,
  h1: { fontSize: 22, fontWeight: '800' as const },
  h2: { fontSize: 18, fontWeight: '700' as const },
  body: { fontSize: 14, fontWeight: '400' as const },
  bodyBold: { fontSize: 14, fontWeight: '700' as const },
  caption: { fontSize: 12, fontWeight: '600' as const },
  label: { fontSize: 11, fontWeight: '700' as const, letterSpacing: 1 },
};

/** Shared border treatment for cards/inputs — one place to thicken/soften it. */
export const border = {
  width: 1,
  color: colors.border,
};
/** RIDE design tokens, based on MOODBOARD.md. Sizes are React Native points. */
export const Palette = {
  carbon: '#101512',
  forest: '#1D2620',
  electricLime: '#D8FF6A',
  warmWhite: '#FAF8EE',
  mutedMint: '#A5B5A6',
} as const;

export const Colors = {
  background: Palette.carbon,
  surface: Palette.forest,
  accent: Palette.electricLime,
  text: Palette.warmWhite,
  textSecondary: Palette.mutedMint,
  onAccent: Palette.carbon,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 64,
} as const;

// Use native system sans fonts; no font download is needed on first launch.
export const Typography = {
  display: {
    fontSize: 88,
    lineHeight: 92,
    fontWeight: '900',
    letterSpacing: -4,
  },
  heading: {
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '800',
    letterSpacing: -1,
  },
  body: {
    fontSize: 18,
    lineHeight: 28,
    fontWeight: '400',
  },
  label: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
} as const;

export const Radius = { sm: 8, md: 16 } as const;

export const Layout = {
  contentMaxWidth: 480,
  minTouchTarget: 44,
} as const;

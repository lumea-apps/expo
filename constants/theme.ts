/**
 * Nouri design tokens.
 *
 * Light, quiet and typographic: white surfaces, near-black ink, hairline
 * borders and one black accent for actions. Colour is reserved for data
 * (each macro keeps the same hue everywhere) and for Nouri's pastel orb.
 */
export const colors = {
  bg: '#FFFFFF',
  bgSubtle: '#F7F7F8',
  bgMuted: '#F0F0F2',

  card: '#FFFFFF',
  cardHover: '#F7F7F8',
  border: '#EAEAEE',
  borderStrong: '#DADAE0',

  ink: '#0E0E10',
  dim: '#5E5E68',
  faint: '#9B9BA5',
  ghost: '#EFEFF2',

  accent: '#0E0E10',
  accentSoft: '#F2F2F4',
  onAccent: '#FFFFFF',

  protein: '#EE8A62',
  carbs: '#8088F2',
  fat: '#3FB595',
  water: '#4FA3EE',
  positive: '#1E9E6A',
  amber: '#D9922C',
  rose: '#E0566B',
} as const;

export const macroColors = {
  kcal: colors.ink,
  protein: colors.protein,
  carbs: colors.carbs,
  fat: colors.fat,
} as const;

/** Pastel palette of the orb (ElevenLabs-like softness, never neon). */
export const orbColors = {
  sky: '#A9C9FF',
  lilac: '#CDBBFF',
  peach: '#FFC9AE',
  mint: '#B5EAD7',
} as const;

export const fonts = {
  sans: 'Geist_400Regular',
  sansMedium: 'Geist_500Medium',
  sansSemi: 'Geist_600SemiBold',
  sansBold: 'Geist_700Bold',
  // numbers use Geist with tabular figures (see `Mono`), not a monospace face
  mono: 'Geist_400Regular',
  monoMedium: 'Geist_500Medium',
} as const;

export const radii = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

/** Soft elevation for floating elements only (composer, sheets, primary cards). */
export const shadow = {
  shadowColor: '#0E0E10',
  shadowOpacity: 0.06,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 3,
} as const;

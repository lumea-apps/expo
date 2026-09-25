/**
 * Nouri design tokens.
 *
 * Dark-first "night kitchen" palette: warm off-white ink on a blue-black base,
 * one electric accent (chlorophyll lime) and a fixed colour per macro so data
 * reads the same everywhere (rings, bars, chips, charts).
 */
export const colors = {
  bg: '#08080C',
  bgRaised: '#101016',
  bgSheet: '#0C0C11',

  card: 'rgba(255,255,255,0.045)',
  cardHover: 'rgba(255,255,255,0.07)',
  cardStrong: 'rgba(255,255,255,0.09)',
  border: 'rgba(255,255,255,0.09)',
  borderStrong: 'rgba(255,255,255,0.16)',
  highlight: 'rgba(255,255,255,0.10)',

  ink: '#F5F2EA',
  dim: 'rgba(245,242,234,0.66)',
  faint: 'rgba(245,242,234,0.40)',
  ghost: 'rgba(245,242,234,0.12)',
  onAccent: '#0A0D00',

  lime: '#D4FF3A',
  limeSoft: 'rgba(212,255,58,0.14)',
  protein: '#FF8A5B',
  carbs: '#B8A5FF',
  fat: '#5EE3C8',
  water: '#6CC6FF',
  rose: '#FF6F9F',
  amber: '#FFC857',
} as const;

export const macroColors = {
  kcal: colors.lime,
  protein: colors.protein,
  carbs: colors.carbs,
  fat: colors.fat,
} as const;

export const fonts = {
  serif: 'InstrumentSerif_400Regular',
  serifItalic: 'InstrumentSerif_400Regular_Italic',
  sans: 'InterTight_400Regular',
  sansMedium: 'InterTight_500Medium',
  sansSemi: 'InterTight_600SemiBold',
  sansBold: 'InterTight_700Bold',
  mono: 'JetBrainsMono_400Regular',
  monoMedium: 'JetBrainsMono_500Medium',
} as const;

export const radii = {
  sm: 12,
  md: 18,
  lg: 24,
  xl: 32,
  pill: 999,
} as const;

/** Gradient pairs used for food tiles / recipe headers. */
export const tileGradients: [string, string][] = [
  ['#2A1F14', '#5B3A1E'],
  ['#1B2414', '#3C5A1F'],
  ['#221A2E', '#46306A'],
  ['#132226', '#1F4E52'],
  ['#2B1520', '#5E2940'],
  ['#1E1E12', '#4F4A18'],
];

export function gradientFor(seed: string): [string, string] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return tileGradients[h % tileGradients.length];
}

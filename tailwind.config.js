/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,tsx}', './components/**/*.{js,ts,tsx}'],

  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        night: '#08080C',
        ink: '#F5F2EA',
        lime: '#D4FF3A',
        protein: '#FF8A5B',
        carbs: '#B8A5FF',
        fat: '#5EE3C8',
        water: '#6CC6FF',
      },
      fontFamily: {
        serif: ['InstrumentSerif_400Regular'],
        'serif-italic': ['InstrumentSerif_400Regular_Italic'],
        sans: ['InterTight_400Regular'],
        'sans-medium': ['InterTight_500Medium'],
        'sans-semi': ['InterTight_600SemiBold'],
        'sans-bold': ['InterTight_700Bold'],
        mono: ['JetBrainsMono_400Regular'],
        'mono-medium': ['JetBrainsMono_500Medium'],
      },
    },
  },
  plugins: [],
};

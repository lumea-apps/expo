/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,tsx}', './components/**/*.{js,ts,tsx}'],

  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        ink: '#0E0E10',
        subtle: '#F7F7F8',
        muted: '#F0F0F2',
        line: '#EAEAEE',
        protein: '#EE8A62',
        carbs: '#8088F2',
        fat: '#3FB595',
        water: '#4FA3EE',
      },
      fontFamily: {
        sans: ['Geist_400Regular'],
        'sans-medium': ['Geist_500Medium'],
        'sans-semi': ['Geist_600SemiBold'],
        'sans-bold': ['Geist_700Bold'],
      },
    },
  },
  plugins: [],
};

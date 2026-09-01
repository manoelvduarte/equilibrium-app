/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
    '../../packages/ui/src/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        paper: '#FAF8F4',
        surface: '#FFFFFF',
        'surface-2': '#F1EDE6',
        ink: '#1C1917',
        'ink-2': '#5C564D',
        'ink-3': '#877F73',
        hairline: '#E7E2D9',
        brand: '#1E5C43',
        'partner-a': '#B4532A',
        'partner-b': '#23606B',
        danger: '#B3362B',
        warning: '#A66A21',
      },
      fontFamily: {
        display: ['Fraunces_700Bold', 'serif'],
        sans: ['IBMPlexSans_400Regular', 'sans-serif'],
        'sans-medium': ['IBMPlexSans_600SemiBold', 'sans-serif'],
        'sans-bold': ['IBMPlexSans_700Bold', 'sans-serif'],
        mono: ['IBMPlexMono_400Regular', 'monospace'],
        'mono-bold': ['IBMPlexMono_600SemiBold', 'monospace'],
      },
      borderRadius: {
        '4': 4,
        '6': 6,
        '10': 10,
        '12': 12,
      },
    },
  },
  plugins: [],
};

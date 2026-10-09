/**
 * shared-theme/tailwind-preset.js
 * Synora family shared Tailwind preset.
 * Import this in each module's tailwind.config.js via:
 *   import sharedPreset from '../../shared-theme/tailwind-preset.js'
 */
export default {
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#f0f4ff',
          100: '#dde6ff',
          200: '#c3d1ff',
          300: '#9db2ff',
          400: '#7088ff',
          500: '#4a62f5',
          600: '#3a4eea',
          700: '#2f3fd0',
          800: '#2a36a8',
          900: '#283285',
          950: '#1a1f50',
        },
        accent: {
          50:  '#fff8ed',
          100: '#ffefd3',
          200: '#ffdba6',
          300: '#ffbf6e',
          400: '#ff9a32',
          500: '#ff7d0a',
          600: '#f06000',
          700: '#c74802',
          800: '#9e390b',
          900: '#7f300c',
          950: '#451604',
        },
        surface: {
          DEFAULT: '#ffffff',
          muted:   '#f8f9fc',
          border:  '#e2e6f0',
        },
        brand: {
          50:  '#fffbeb',
          100: '#fef3c7',
          200: '#fde68a',
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
          700: '#b45309',
          800: '#92400e',
          900: '#78350f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
      },
    },
  },
};

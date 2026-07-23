/** @type {import('tailwindcss').Config} */
/* FoodSafe · Forest calm · design.md
 * cool bone · forest ink · emerald accent · Outfit + DM Mono
 */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:  ['"Outfit"', '"Noto Sans Devanagari"', 'system-ui', 'sans-serif'],
        serif: ['"Outfit"', '"Noto Sans Devanagari"', 'system-ui', 'sans-serif'],
        mono:  ['"DM Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        deep: '#f4f7f4',
        paper: {
          DEFAULT: '#f4f7f4',
          2:       '#ebf0eb',
          3:       '#e0e6e0',
          4:       '#d4dbd4',
        },
        surface: {
          50:  '#f4f7f4',
          100: '#ebf0eb',
          200: '#e0e6e0',
          300: '#d4dbd4',
        },
        ink: {
          DEFAULT: '#14241c',
          2:       '#3d4f44',
          3:       '#6a7a70',
        },
        'accent-ink': '#f6faf6',
        brand: {
          light: '#4aad68',
          DEFAULT: '#2f8f52',
          dark:  '#1f6b3a',
          glow:  '#2f8f5229',
        },
        gold: {
          light: '#e0b45c',
          DEFAULT: '#c4892e',
          dark:  '#9a6a1f',
        },
        chili:    '#c93d32',
        ochre:    '#c4892e',
        rule:     '#d5dcd5',
        'rule-2': '#c2cac2',
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(160deg, oklch(99% 0.004 150 / 0.95) 0%, oklch(95% 0.008 150 / 0.9) 100%)',
        'halo-green':     'radial-gradient(ellipse at top, oklch(52% 0.13 155 / 0.07) 0%, transparent 55%)',
      },
      animation: {
        'fade-up': 'fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'float':   'float 8s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: 0, transform: 'translateY(8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
/* SafeThali · clean trust · Fraunces + Source Sans 3 */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:  ['"Source Sans 3"', '"Noto Sans Devanagari"', 'system-ui', 'sans-serif'],
        display: ['Fraunces', '"Noto Sans Devanagari"', 'Georgia', 'serif'],
        serif: ['Fraunces', 'Georgia', 'serif'],
        mono:  ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        deep: '#f8fafc',
        paper: {
          DEFAULT: '#f8fafc',
          2:       '#eef1f5',
          3:       '#e3e7ed',
          4:       '#d4dae2',
        },
        surface: {
          50:  '#f8fafc',
          100: '#eef1f5',
          200: '#e3e7ed',
          300: '#d4dae2',
        },
        ink: {
          DEFAULT: '#1c1917',
          2:       '#57534e',
          3:       '#a8a29e',
        },
        'accent-ink': '#ffffff',
        brand: {
          light: '#7eb6e8',
          DEFAULT: '#4a90d9',
          dark:  '#2563eb',
          glow:  '#4a90d92e',
        },
        gold: {
          light: '#e8b86d',
          DEFAULT: '#c4892e',
          dark:  '#9a6a1f',
        },
        chili:    '#b91c1c',
        ochre:    '#4a5260',
        rule:     '#dde3ea',
        'rule-2': '#c8d0da',
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(180deg, #f8fafc 0%, #eef1f5 100%)',
        'halo-warm': 'radial-gradient(ellipse at 30% 0%, rgba(74,144,217,0.12) 0%, transparent 55%)',
      },
      boxShadow: {
        soft: '0 1px 2px rgba(28,25,23,0.04), 0 10px 28px rgba(28,25,23,0.07)',
        lift: '0 4px 20px rgba(74,144,217,0.2)',
      },
      animation: {
        'fade-up': 'fadeUp 0.45s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'float':   'float 9s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: 0, transform: 'translateY(10px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
    },
  },
  plugins: [],
}

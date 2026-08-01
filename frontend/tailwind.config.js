/** @type {import('tailwindcss').Config} */
/* SafeThali · Soft Structuralism · Dark Mode via CSS variables */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans:  ['"Plus Jakarta Sans"', '"Noto Sans Devanagari"', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', '"Noto Sans Devanagari"', 'system-ui', 'sans-serif'],
        mono:  ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        canvas:    'var(--color-canvas)',
        paper: {
          DEFAULT: 'var(--color-paper)',
          2:       'var(--color-paper-2)',
          3:       'var(--color-paper-3)',
          4:       'var(--color-paper-4)',
        },
        surface: {
          50:  'var(--color-paper)',
          100: 'var(--color-paper-2)',
          200: 'var(--color-paper-3)',
          300: 'var(--color-paper-4)',
        },
        ink: {
          DEFAULT: 'var(--color-ink)',
          2:       'var(--color-ink-2)',
          3:       'var(--color-ink-3)',
        },
        'accent-ink': 'var(--color-accent-ink)',
        brand: {
          light: 'var(--color-brand-light)',
          DEFAULT: 'var(--color-brand)',
          dark:  'var(--color-brand-dark)',
          glow:  'var(--color-brand-glow)',
        },
        gold: {
          light: 'var(--color-gold-light)',
          DEFAULT: 'var(--color-gold)',
          dark:  'var(--color-gold-dark)',
        },
        chili:    'var(--color-chili)',
        ochre:    'var(--color-ink-2)',
        rule:     'var(--color-rule)',
        'rule-2': 'var(--color-rule-2)',
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(180deg, var(--color-paper) 0%, var(--color-paper-2) 100%)',
        'halo-warm': 'radial-gradient(ellipse at 50% 0%, rgba(0,191,165,0.06) 0%, transparent 60%)',
        'mesh-teal': 'radial-gradient(ellipse at 20% 20%, rgba(0,191,165,0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(100,223,212,0.05) 0%, transparent 50%)',
      },
      boxShadow: {
        soft:   '0 1px 2px var(--shadow-color), 0 8px 32px var(--shadow-color)',
        lift:   '0 4px 12px rgba(0,191,165,0.12), 0 12px 40px var(--shadow-color)',
        card:   '0 1px 3px var(--shadow-color), 0 4px 16px var(--shadow-color)',
        bezel:  '0 2px 8px var(--shadow-color), 0 8px 24px var(--shadow-color)',
        inner:  'inset 0 1px 1px var(--highlight-color)',
        glow:   '0 0 24px rgba(0,191,165,0.15)',
      },
      animation: {
        'fade-up': 'fadeUp 0.7s cubic-bezier(0.32,0.72,0,1) forwards',
        'float':   'float 10s ease-in-out infinite',
        'morph':   'morph 6s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: 0, transform: 'translateY(16px)', filter: 'blur(6px)' },
          '100%': { opacity: 1, transform: 'translateY(0)', filter: 'blur(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        morph: {
          '0%, 100%': { borderRadius: '42% 58% 70% 30% / 45% 45% 55% 55%' },
          '50%': { borderRadius: '58% 42% 30% 70% / 55% 55% 45% 45%' },
        },
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '30': '7.5rem',
      },
    },
  },
  plugins: [],
}

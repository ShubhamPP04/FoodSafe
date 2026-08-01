/** @type {import('tailwindcss').Config} */
/* SafeThali · Soft Structuralism · Asymmetrical Bento
 * Pure white surfaces · emerald accent · Plus Jakarta Sans 800
 * Double-bezel cards · floating glass nav · fluid motion
 */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:  ['"Plus Jakarta Sans"', '"Noto Sans Devanagari"', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', '"Noto Sans Devanagari"', 'system-ui', 'sans-serif'],
        mono:  ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      colors: {
        // Soft Structuralism — silver-grey / pure white
        canvas:    '#F5F5F7',
        paper: {
          DEFAULT: '#FFFFFF',
          2:       '#FAFAFA',
          3:       '#F0F0F2',
          4:       '#E5E5E7',
        },
        surface: {
          50:  '#FFFFFF',
          100: '#FAFAFA',
          200: '#F0F0F2',
          300: '#E5E5E7',
        },
        ink: {
          DEFAULT: '#1D1D1F',
          2:       '#6E6E73',
          3:       '#AEAEB2',
        },
        'accent-ink': '#FFFFFF',
        brand: {
          light: '#64DFD4',
          DEFAULT: '#00BFA5',
          dark:  '#00897B',
          glow:  '#00BFA51A',
        },
        gold: {
          light: '#FFD54F',
          DEFAULT: '#F57F17',
          dark:  '#BF360C',
        },
        chili:    '#FF3B30',
        ochre:    '#6E6E73',
        rule:     '#E5E5E7',
        'rule-2': '#D1D1D6',
      },
      backgroundImage: {
        'glass-gradient': 'linear-gradient(180deg, #FFFFFF 0%, #FAFAFA 100%)',
        'halo-warm': 'radial-gradient(ellipse at 50% 0%, rgba(0,191,165,0.06) 0%, transparent 60%)',
        'mesh-teal': 'radial-gradient(ellipse at 20% 20%, rgba(0,191,165,0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(100,223,212,0.05) 0%, transparent 50%)',
      },
      boxShadow: {
        // Soft, highly diffused ambient shadows
        soft:   '0 1px 2px rgba(29,29,31,0.04), 0 8px 32px rgba(29,29,31,0.06)',
        lift:   '0 4px 12px rgba(0,191,165,0.12), 0 12px 40px rgba(29,29,31,0.08)',
        card:   '0 1px 3px rgba(29,29,31,0.04), 0 4px 16px rgba(29,29,31,0.04)',
        bezel:  '0 2px 8px rgba(29,29,31,0.04), 0 8px 24px rgba(29,29,31,0.06)',
        inner:  'inset 0 1px 1px rgba(255,255,255,0.8)',
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

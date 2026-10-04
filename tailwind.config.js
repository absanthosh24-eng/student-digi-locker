/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4F6EF7',
          dark: '#3A56D4',
          light: '#7B93FA',
          muted: '#EEF1FE',
        },
        sidebar: {
          DEFAULT: '#1E2035',
          hover: '#272A47',
          active: '#2F3356',
          border: '#2D3060',
          text: '#94A3B8',
          'text-active': '#FFFFFF',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F7F8FC',
          border: '#E2E8F0',
        },
        ai: {
          DEFAULT: '#8B5CF6',
          muted: '#F3EFFE',
          border: '#DDD6FE',
        },
        success: {
          DEFAULT: '#22C55E',
          muted: '#DCFCE7',
        },
        warning: {
          DEFAULT: '#F59E0B',
          muted: '#FEF3C7',
        },
        danger: {
          DEFAULT: '#EF4444',
          muted: '#FEE2E2',
        },
        info: {
          DEFAULT: '#3B82F6',
          muted: '#DBEAFE',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        'display': ['2.25rem', { lineHeight: '2.75rem', fontWeight: '700' }],
        'h1': ['1.5rem', { lineHeight: '2rem', fontWeight: '700' }],
        'h2': ['1.25rem', { lineHeight: '1.75rem', fontWeight: '600' }],
        'h3': ['1rem', { lineHeight: '1.5rem', fontWeight: '600' }],
      },
      borderRadius: {
        'DEFAULT': '0.5rem',
        'sm': '0.375rem',
        'lg': '0.75rem',
        'xl': '1rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0,0,0,0.07), 0 1px 2px -1px rgba(0,0,0,0.05)',
        'dialog': '0 20px 60px -10px rgba(0,0,0,0.18)',
        'input-focus': '0 0 0 3px rgba(79,110,247,0.18)',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.25s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'skeleton': 'skeleton 1.5s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.6' },
        },
        skeleton: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
      },
    },
  },
  plugins: [],
}

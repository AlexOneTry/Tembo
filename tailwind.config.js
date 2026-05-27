/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dde9ff',
          200: '#b9d2ff',
          300: '#8bb1ff',
          400: '#5b88ff',
          500: '#3b66ff',
          600: '#2c46ec',
          700: '#2536c8',
          800: '#212fa0',
          900: '#1f2c7e',
        },
        accent: {
          400: '#a3e635',
          500: '#84cc16',
          600: '#65a30d',
        },
        ink: {
          50: '#f5f7fa',
          100: '#e6ebf2',
          200: '#cdd5e0',
          300: '#a4b0c2',
          400: '#7889a1',
          500: '#586581',
          600: '#42506a',
          700: '#2c3850',
          800: '#1a2336',
          900: '#0f1626',
          950: '#070b16',
        },
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      boxShadow: {
        glass: '0 8px 32px rgba(15, 22, 38, 0.18)',
        glow: '0 0 40px rgba(59, 102, 255, 0.35)',
        card: '0 1px 2px rgba(15,22,38,0.06), 0 4px 16px rgba(15,22,38,0.06)',
      },
      backgroundImage: {
        'grid-light':
          'linear-gradient(to right, rgba(15,22,38,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,22,38,0.04) 1px, transparent 1px)',
        'grid-dark':
          'linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        shimmer: 'shimmer 1.5s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        slideUp: {
          '0%': { opacity: 0, transform: 'translateY(8px)' },
          '100%': { opacity: 1, transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      boxShadow: {
        xs: '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
        sm: '0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.06)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
        bento: '0 2px 8px -2px rgba(0, 0, 0, 0.05), 0 1px 4px -1px rgba(0, 0, 0, 0.03)',
      },
      colors: {
        warm: {
          bg: '#F7F6F2',
          cream: '#FAF9F5',
          surface: '#FFFFFF',
          border: '#E5E4DE',
          'border-subtle': '#EAE9E4',
          'border-hover': '#D6D4CC',
          card: '#FFFFFF',
          muted: '#F0EFEA',
        },
        charcoal: {
          900: '#1A1C1E',
          800: '#22252A',
          700: '#2F3338',
          600: '#464B53',
          500: '#606670',
          400: '#8A919E',
          300: '#B5BAC3',
          200: '#E1E4E8',
          100: '#F0F2F5',
        },
        industrial: {
          amber: '#D97706',
          'amber-light': '#FEF3C7',
          'amber-hover': '#B45309',
          orange: '#EA580C',
          'orange-light': '#FFEDD5',
          blue: '#2563EB',
          'blue-light': '#EFF6FF',
          'blue-hover': '#1D4ED8',
          teal: '#0D9488',
          'teal-light': '#F0FDF4',
          red: '#DC2626',
          'red-light': '#FEF2F2',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace'],
      }
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        deepGreen: {
          DEFAULT: '#0F2F2A',
          dark: '#0A211D',
          light: '#16423C',
        },
        emerald: {
          50: '#E5F7F1',
          100: '#CEEFE5',
          200: '#A3E2D1',
          300: '#75D2BA',
          400: '#3BBFA0',
          500: '#0B9B78',
          600: '#098264',
          700: '#076950',
          800: '#05513D',
          900: '#0F2F2A',
          950: '#0A211D',
          brand: '#0B9B78',
        },
        mint: {
          DEFAULT: '#E5F7F1',
          50: '#F4FBF9',
          100: '#E5F7F1',
          200: '#CEEFE5',
        },
        success: '#18A77A',
        warning: '#E6A52F',
        danger: '#D9485F',
        pageBg: '#F8FAFA',
        cardBg: '#FFFFFF',
        appBorder: '#DDE9E5',
        primaryText: '#111827',
        secondaryText: '#6B7280',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      colors: {
        forest: {
          50: '#f2f7f4', 100: '#e0ede5', 200: '#c2dccb',
          300: '#96c3a6', 400: '#64a37c', 500: '#41855d',
          600: '#2f6a47', 700: '#27563b', 800: '#214530',
          900: '#1c3928',
        },
      },
    },
  },
  plugins: [],
}
export default config

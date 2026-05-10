/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./App.tsx",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brick-red': '#b03a2e',
        'dark-bg': '#0a0a0a',
        'panel-gray': '#1a1a1a',
        'light-gray': '#d1d5db',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        brand: ['Orbitron', 'sans-serif'],
      }
    },
  },
  plugins: [],
}

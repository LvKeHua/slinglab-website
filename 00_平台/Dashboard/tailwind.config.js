/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cmm: { bg: '#0D1117', card: '#1E222D', card2: '#2A2E39', border: '#333842', text: '#E8EAED', muted: '#9AA0A6', green: '#00C897', red: '#FF4D4F', gold: '#F0B90B' }
      }
    }
  },
  plugins: [],
}

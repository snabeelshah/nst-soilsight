/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        nasa: { blue: '#0b3d91', gold: '#fc3d21', green: '#4caf50' },
        soil: { dark: '#5d4037', medium: '#8d6e63', light: '#d7ccc8' },
        sky: { deep: '#1565c0', mid: '#1976d2', light: '#42a5f5' },
      },
      fontFamily: { urdu: ['Noto Nastaliq Urdu', 'serif'] },
    },
  },
  plugins: [],
}

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3b82f6',      // Blue for WebWright (instead of Browser Use orange)
        'primary-dark': '#1e40af',
      },
    },
  },
  plugins: [],
}

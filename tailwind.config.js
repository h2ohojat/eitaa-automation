/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./web/public/**/*.html",
    "./web/public/**/*.js",
  ],
  theme: {
    extend: {
      colors: {
        'eitaa-blue': '#0088cc',
        'eitaa-dark': '#1a1a2e',
      },
      fontFamily: {
        'vazir': ['Vazirmatn', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
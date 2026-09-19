/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          sunday: '#1b4332',
          sundayDark: '#0b5c40',
          sundayLight: '#e6f4ea',
          midweek: '#1e3a8a',
          midweekDark: '#172554',
          midweekLight: '#eff6ff',
          gold: '#fbeea3',
          goldDark: '#a67c00',
          goldBorder: '#f5e17a',
          headcountBg: '#fff4e6',
          varianceBg: '#fce8e8',
          varianceText: '#7f1d1d',
        }
      },
    },
  },
  plugins: [],
}
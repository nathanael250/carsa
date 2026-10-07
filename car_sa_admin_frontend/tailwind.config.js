/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          dark: '#2F4858',
          orange: {
            light: '#FEA14C',
            dark: '#FE8A21',
          },
        },
      },
    },
  },
  plugins: [],
}






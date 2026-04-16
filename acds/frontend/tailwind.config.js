/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "primary-fixed": "#72ff70",
        "background": "#131313",
        "on-tertiary": "#690003",
        "tertiary-fixed": "#ffdad5",
        "inverse-primary": "#006e16",
        "surface-container-high": "#2a2a2a",
        "secondary": "#c8c6c5",
        "on-error": "#690005",
        "on-error-container": "#ffdad6",
        "error-container": "#93000a",
        "surface-container-highest": "#353534",
        "on-surface-variant": "#b9ccb2",
        "surface-dim": "#131313",
        "on-primary-container": "#007117",
      },
      fontFamily: {
        slab: ['"Space Grotesk"', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      }
    },
  },
  plugins: [],
}

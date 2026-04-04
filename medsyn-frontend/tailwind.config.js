/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        clay: {
          lavender: "#C9B8FF",
          mint: "#B8F0D8",
          peach: "#FFD4B8",
          sky: "#B8E8FF",
          rose: "#FFB8D4",
          yellow: "#FFF4B8",
          dark: "#1a1a2e",
          card: "#F4F0FF",
        }
      },
      borderRadius: {
        clay: "20px",
        "clay-lg": "28px",
        "clay-xl": "36px",
      },
      boxShadow: {
        clay: "6px 6px 0px 0px rgba(0,0,0,0.15), inset 0px 2px 0px rgba(255,255,255,0.6)",
        "clay-lg": "8px 8px 0px 0px rgba(0,0,0,0.18), inset 0px 3px 0px rgba(255,255,255,0.7)",
        "clay-hover": "10px 10px 0px 0px rgba(0,0,0,0.2), inset 0px 3px 0px rgba(255,255,255,0.7)",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      }
    },
  },
  plugins: [],
}

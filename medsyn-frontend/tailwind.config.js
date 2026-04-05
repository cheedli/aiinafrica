/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        teal: {
          50:  "#f0f9f6",
          100: "#d0ede6",
          200: "#a1dbd0",
          300: "#6ec4b8",
          400: "#3daa9c",
          500: "#1f9082",
          600: "#15766a",
          700: "#0f5c53",
          800: "#0a423b",
          900: "#072e29",
          950: "#041a17",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["DM Sans", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl:   "12px",
        "2xl":"18px",
        "3xl":"24px",
      },
    },
  },
  plugins: [],
}

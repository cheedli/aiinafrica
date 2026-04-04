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
        sage: {
          50:  "#f4f7f4",
          100: "#e2ebe2",
          200: "#c5d8c5",
          300: "#9dbe9d",
          400: "#6fa06f",
          500: "#4e834e",
          600: "#3a673a",
        },
        cream: "#f8faf9",
        surface: "#f0f4f3",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ["DM Sans", "system-ui", "sans-serif"],
      },
      borderRadius: {
        xl: "12px",
        "2xl": "16px",
      },
      boxShadow: {
        card: "0 1px 3px rgba(15,40,36,0.08), 0 1px 2px rgba(15,40,36,0.04)",
        "card-md": "0 4px 12px rgba(15,40,36,0.10), 0 2px 4px rgba(15,40,36,0.06)",
        "card-lg": "0 8px 24px rgba(15,40,36,0.12), 0 4px 8px rgba(15,40,36,0.06)",
      },
    },
  },
  plugins: [],
}

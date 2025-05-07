/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        voloPink: "#9F6A86",
        voloBlack: "#000000",
        voloSmokyblacklight: "#161212",
        voloSmokyblackdark: "#120E0D",
        voloDark: "#1F2937",
        finnovaOrange: "#F36623",
        finnovaRed: "#FF1F0A",
      },
    },
  },
  plugins: [],
};

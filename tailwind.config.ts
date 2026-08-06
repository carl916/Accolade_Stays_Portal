import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          ink: "#0B0B0B",
          white: "#FFFFFF",
          pale: "#E9EBEF",
          light: "#CAD6E9",
          mid: "#96AED4",
          slate: "#7B8FAE",
          darkSlate: "#3F516D",
          background: "#F7F8FA",
          foreground: "#0B0B0B",
          card: "#FFFFFF",
          border: "#E9EBEF",
          muted: "#F3F5F8",
          mutedText: "#4B5563",
          primary: "#3F516D",
          primaryHover: "#314056",
          primaryForeground: "#FFFFFF",
          secondary: "#FFFFFF",
          focus: "#96AED4",
          navActive: "#E9EBEF",
          chipSelected: "#CAD6E9",
          moss: "#3F516D",
          mint: "#E9EBEF",
          linen: "#F7F8FA",
          brass: "#7B8FAE"
        }
      }
    }
  },
  plugins: []
};

export default config;

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
          ink: "#17201b",
          moss: "#315c4a",
          mint: "#dcefe5",
          linen: "#f7f3ed",
          brass: "#b2833b"
        }
      }
    }
  },
  plugins: []
};

export default config;

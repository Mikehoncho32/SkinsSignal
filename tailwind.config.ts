import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#0b0e12",
        panel: "#12161c",
        ink: "#e5f2ff",
        sub: "#9bb3c6",
        accent: "#11b3b3"
      },
      borderRadius: { '2xl': '1rem' },
      boxShadow: { 'soft': '0 8px 20px rgba(0,0,0,0.25)' }
    },
  },
  plugins: [],
};
export default config;

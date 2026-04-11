import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        steel: {
          50: "#f6f7f9",
          100: "#eceef2",
          200: "#d5d9e2",
          300: "#b1b9c9",
          400: "#8793ab",
          500: "#687591",
          600: "#535e78",
          700: "#444d62",
          800: "#3b4253",
          900: "#343a47",
          950: "#0f1117",
        },
        chrome: {
          DEFAULT: "#c0c6d0",
          light: "#e2e6ec",
          dark: "#6b7280",
        },
        automotive: {
          orange: "#f59e0b",
          red: "#ef4444",
          green: "#10b981",
          blue: "#3b82f6",
          indigo: "#6366f1",
        },
      },
      fontFamily: {
        display: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;

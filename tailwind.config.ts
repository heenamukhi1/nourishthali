import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          DEFAULT: "#FAF7F2",
          elevated: "#F2ECE1",
          highlight: "#EAE0CF",
        },
        forest: {
          DEFAULT: "#14241B",
          border: "#2D4A3E",
          accent: "#1B4332",
          soft: "#D8E6DF",
        },
        turmeric: {
          DEFAULT: "#78350F",
          bg: "#FEF3C7",
          border: "#92400E",
        },
        terracotta: {
          DEFAULT: "#7C2D12",
          bg: "#FFEDD5",
          border: "#9A3412",
        },
        background: "#FAF7F2",
        foreground: "#14241B",
        card: {
          DEFAULT: "#FAF7F2",
          foreground: "#14241B",
        },
        primary: {
          DEFAULT: "#14241B",
          foreground: "#FAF7F2",
        },
        secondary: {
          DEFAULT: "#F2ECE1",
          foreground: "#14241B",
        },
        border: "#2D4A3E",
        ring: "#14241B",
      },
      fontSize: {
        // Senior Low-Vision & High-Legibility Typography Floor:
        // Minimum secondary label: 18px (1.125rem)
        // Base body text: 20px (1.25rem) with 1.6 line-height
        // Card titles: 26px–28px (1.625rem–1.75rem)
        // Page headers: 34px–40px (2.125rem–2.5rem)
        lg: ["1.125rem", { lineHeight: "1.6" }],
        xl: ["1.25rem", { lineHeight: "1.6" }],
        "2xl": ["1.5rem", { lineHeight: "1.5" }],
        "card-title": ["1.7rem", { lineHeight: "1.35", fontWeight: "700" }],
        "page-header": ["2.35rem", { lineHeight: "1.25", fontWeight: "800" }],
      },
      borderWidth: {
        DEFAULT: "2px",
        "2": "2px",
        "3": "3px",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;


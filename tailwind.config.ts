import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Design tokens — Reto Fitness
        bg: {
          DEFAULT: "var(--color-bg)",
          card: "var(--color-bg-card)",
          card2: "var(--color-bg-card2)",
        },
        fg: "var(--color-fg)",
        muted: "var(--color-muted)",
        accent: {
          DEFAULT: "#CF5C36", // terracota
          dark: "#4A1B0C",
        },
        warm: "#EFC88B", // arena / dorado
        bone: "#EEE5E9", // hueso
      },
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        pill: "999px",
      },
    },
  },
  plugins: [],
};

export default config;

import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#06070a",
          900: "#0a0b0f",
          850: "#0e1016",
          800: "#131722",
          700: "#1c2331",
          600: "#2a3345",
        },
        ok: "#34d399",
        warn: "#f59e0b",
        danger: "#f87171",
        info: "#60a5fa",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;

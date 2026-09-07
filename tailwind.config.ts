import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        sans: ["var(--font-body)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        paper: {
          DEFAULT: "#EFE9DD",
          raised: "#F8F4EB",
          sunk: "#E4DCCB",
          deep: "#D8CEB9",
        },
        ink: {
          DEFAULT: "#17150F",
          soft: "#4A4437",
          faint: "#8B8271",
          ghost: "#B4AB98",
        },
        vermilion: {
          DEFAULT: "#BF3B21",
          soft: "#D9836E",
          wash: "#F3DDD6",
        },
        sea: {
          DEFAULT: "#2C5A4C",
          soft: "#6F9186",
          wash: "#DCE6E1",
        },
        brass: {
          DEFAULT: "#A97A16",
          wash: "#F0E4C9",
        },
      },
      borderColor: {
        rule: "rgba(23, 21, 15, 0.16)",
        "rule-strong": "rgba(23, 21, 15, 0.42)",
      },
      backgroundImage: {
        airmail:
          "repeating-linear-gradient(45deg, #BF3B21 0 8px, transparent 8px 16px, #17150F 16px 24px, transparent 24px 32px)",
      },
      keyframes: {
        "rise-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "stamp-in": {
          "0%": { opacity: "0", transform: "scale(1.35) rotate(-14deg)" },
          "60%": { opacity: "1", transform: "scale(0.96) rotate(-6deg)" },
          "100%": { opacity: "1", transform: "scale(1) rotate(-7deg)" },
        },
        scan: {
          "0%": { transform: "translateY(-10%)", opacity: "0" },
          "12%": { opacity: "1" },
          "88%": { opacity: "1" },
          "100%": { transform: "translateY(760%)", opacity: "0" },
        },
        "dash-move": {
          to: { "background-position": "40px 0" },
        },
        blink: {
          "0%, 45%": { opacity: "1" },
          "50%, 95%": { opacity: "0.25" },
        },
      },
      animation: {
        "rise-in": "rise-in 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
        "stamp-in": "stamp-in 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        scan: "scan 1.6s cubic-bezier(0.45, 0, 0.55, 1) infinite",
        "dash-move": "dash-move 1.2s linear infinite",
        blink: "blink 1.4s steps(1, end) infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;

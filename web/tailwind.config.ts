import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#fbf6f3",
        surface: "#ffffff",
        ink: "#2a2438",
        muted: "#8a8398",
        line: "#efe6e0",
        primary: "#e0607d",
        primaryDark: "#c2455f",
        primarySoft: "#fdeef1",
        good: "#2fa66b",
        warn: "#e0902f",
        bad: "#d65b58",
      },
      maxWidth: { app: "480px" },
    },
  },
  plugins: [],
} satisfies Config;

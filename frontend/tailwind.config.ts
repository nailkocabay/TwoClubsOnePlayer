import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0A1322", panel: "#101C30", panel2: "#16253F", line: "#24344F",
        chalk: "#E9EFF6", mute: "#8DA0BD",
        grass: { DEFAULT: "#35B57A", dim: "#1B5E43" },
        sky: { DEFAULT: "#5BA8FF", dim: "#1F4B80" },
      },
      fontFamily: {
        display: ["'Bricolage Grotesque Variable'", "ui-sans-serif", "system-ui", "sans-serif"],
        sans: ["'IBM Plex Sans'", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;

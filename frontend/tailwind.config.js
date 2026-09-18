/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Dark-first developer palette. Near-black base, restrained accents.
        studio: {
          bg: "#0a0e14",
          panel: "#10151d",
          panel2: "#141b26",
          inset: "#0c1118",
          line: "#1d2631",
          line2: "#2a3544",
          text: "#e7ebf2",
          muted: "#8b94a7",
          faint: "#5d6779",
          accent: "#4f7cff",
          accentHi: "#6f96ff",
          success: "#3ddc97",
          warning: "#f5b83d",
          danger: "#f4706e",
          info: "#5aa7f0",
        },
      },
      fontFamily: {
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Consolas",
          "monospace",
        ],
      },
      boxShadow: {
        modal: "0 16px 48px rgba(0,0,0,0.5)",
        top: "0 1px 0 rgba(0,0,0,0.5)",
      },
    },
  },
  plugins: [],
};
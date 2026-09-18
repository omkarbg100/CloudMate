import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// In development, `/api` and `/ws` are proxied to the backend so the browser
// always talks to the same origin. In Docker, nginx does the same proxying.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://localhost:4000", changeOrigin: true },
      "/ws": { target: "ws://localhost:4000", ws: true },
    },
  },
  preview: {
    port: 5173,
  },
});

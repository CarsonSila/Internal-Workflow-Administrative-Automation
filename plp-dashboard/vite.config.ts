import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    // Once backend/main.py is running (uvicorn main:app --port 8000), any
    // fetch("/api/...") call from the frontend is proxied straight to it —
    // no CORS config needed in dev. In production, put FastAPI behind the
    // same origin/reverse proxy instead of relying on this.
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: ["lucide-react"],
  },
});

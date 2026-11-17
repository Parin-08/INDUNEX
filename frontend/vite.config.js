import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: env.INDUNEX_BACKEND_URL || "http://127.0.0.1:8000",
          changeOrigin: true,
          headers: { "X-API-Key": env.INDUNEX_API_KEY || "indunex-demo-key-2026" },
        },
      },
    },
  };
});

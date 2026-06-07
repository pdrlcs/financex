import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Em dev local (sem Docker) o backend roda em :8000. O front fala sempre por
// caminho relativo (/api/...) e o Vite faz o proxy, eliminando CORS. Em Docker
// o nginx do container assume esse papel (ver nginx.conf). A origem do backend
// é configurável via VITE_API_PROXY_TARGET para quem roda fora do compose.
export default defineConfig(() => {
  const apiTarget = process.env.VITE_API_PROXY_TARGET ?? "http://localhost:8000";

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 5173,
      proxy: {
        "/api": {
          target: apiTarget,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api/, ""),
        },
      },
    },
  };
});

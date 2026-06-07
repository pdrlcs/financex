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
    build: {
      rollupOptions: {
        output: {
          // Separa as libs pesadas do bundle principal: o Chart.js (+ matrix +
          // wrapper) só pesa no Dashboard, e o vendor React é estável e
          // cacheável entre deploys. Tira o app do aviso de 500 kB por chunk.
          manualChunks: {
            charts: ["chart.js", "chartjs-chart-matrix", "react-chartjs-2"],
            "react-vendor": ["react", "react-dom", "react-router-dom"],
          },
        },
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

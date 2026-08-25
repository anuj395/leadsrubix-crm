import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const rawPort = process.env.PORT || '22333';
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH || "/";

const devApiTarget = process.env.VITE_API_PROXY_TARGET || "http://localhost:8080";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    runtimeErrorOverlay(),
    // Note: @replit/vite-plugin-cartographer is intentionally disabled.
    // It injects `data-replit-metadata` JSX attributes that break TS generic
    // component syntax (e.g. <MobileCardsView<ContactApiRow> ...>).
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    proxy: {
      "/api": {
        target: devApiTarget,
        changeOrigin: true,
      },
    },
  },
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify('1.0.0'),
    'import.meta.env.VITE_BUILD_TIME': JSON.stringify(new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' })),
    'import.meta.env.VITE_BUILD_HASH': JSON.stringify(process.env.GITHUB_SHA ? process.env.GITHUB_SHA.substring(0, 7) : 'prod'),
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});

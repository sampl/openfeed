import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// Dev server port for the Express backend (different from Vite's port)
const SERVER_DEV_PORT = 3001;

export default defineConfig({
  root: "src/client-web",
  plugins: [tailwindcss(), react()],
  server: {
    port: 3000,
    proxy: {
      // Proxy API requests to the Express server in dev mode
      "/api": {
        target: `http://localhost:${SERVER_DEV_PORT}`,
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      plugins: path.resolve(__dirname, "./src/plugins"),
    },
  },
  build: {
    outDir: path.resolve(__dirname, "dist/client"),
    emptyOutDir: true,
  },
  css: {
    modules: {
      localsConvention: "camelCase",
    },
  },
});

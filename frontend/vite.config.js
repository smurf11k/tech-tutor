import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { fileURLToPath } from "url";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const backendOrigin = "http://127.0.0.1:8000";

export default defineConfig({
  envDir: path.resolve(dirname, "../backend"),
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(dirname, "./src") },
  },
  server: {
    proxy: {
      "/api": {
        target: backendOrigin,
        changeOrigin: true,
      },
      "/auth": {
        target: backendOrigin,
        changeOrigin: true,
      },
      "/sanctum/csrf-cookie": {
        target: backendOrigin,
        changeOrigin: true,
      },
      "/storage": {
        target: backendOrigin,
        changeOrigin: true,
      },
    },
  },
});

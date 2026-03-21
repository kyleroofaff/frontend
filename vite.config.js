import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const buildStamp =
  process.env.GITHUB_SHA?.slice(0, 7) ||
  process.env.BUILD_ID ||
  new Date().toISOString();

export default defineConfig({
  plugins: [
    react(),
    {
      name: "inject-build-meta",
      transformIndexHtml(html) {
        const stamp = buildStamp;
        const escaped = String(stamp).replace(/"/g, "&quot;");
        return html.replace(
          /<head>/i,
          `<head>\n    <!-- build:${escaped} -->\n    <meta name="app-build" content="${escaped}" />`,
        );
      },
    },
  ],
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ["react", "react-dom"],
          icons: ["lucide-react"],
          qrcode: ["qrcode.react"]
        }
      }
    }
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true
      }
    }
  }
});

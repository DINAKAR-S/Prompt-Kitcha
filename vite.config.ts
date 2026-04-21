import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

const host = process.env.TAURI_DEV_HOST;

export default defineConfig(async () => ({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? { protocol: "ws", host, port: 1421 }
      : undefined,
    watch: { ignored: ["**/src-tauri/**"] },
  },
  build: {
    rollupOptions: {
      input: {
        popup: fileURLToPath(new URL("./popup.html", import.meta.url)),
        settings: fileURLToPath(new URL("./settings.html", import.meta.url)),
        pill: fileURLToPath(new URL("./pill.html", import.meta.url)),
        "image-prompt": fileURLToPath(new URL("./image-prompt.html", import.meta.url)),
      },
    },
  },
}));

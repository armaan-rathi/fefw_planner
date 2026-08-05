import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true, // also listen on the LAN so you can open it on your phone (same Wi-Fi)
    proxy: {
      "/api": "http://localhost:5174",
      "/images": "http://localhost:5174",
    },
  },
});

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Project Pages are served from https://mdr.github.io/shavian-practice/,
// so assets must resolve under that base path.
export default defineConfig({
  base: "/shavian-practice/",
  plugins: [react()],
  server: {
    host: true,
    // Permit ngrok (and other) tunnel hostnames to reach the dev server.
    allowedHosts: true,
  },
});

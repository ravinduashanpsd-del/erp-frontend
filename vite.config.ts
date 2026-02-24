// vite.config.ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png", "logo.png"],
      manifest: {
        name: "Galaxy-A9 ERP",
        short_name: "ERP",
        description: "ERP Frontend (PWA)",
        theme_color: "#0b0b0b",
        background_color: "#0b0b0b",
        display: "standalone",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        // SPA fallback (important for React Router)
        navigateFallback: "/index.html",
        // Don't treat API calls as navigation
        navigateFallbackDenylist: [/^\/api\//],
      },
      devOptions: {
        enabled: true, // allow testing in dev
      },
    }),
  ],

  preview: {
  allowedHosts: [".up.railway.app"],
},
});

import path from "path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        navigationPreload: false,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        importScripts: ["push-handler.js"],
        runtimeCaching: [
          {
            // API レスポンスはキャッシュしない（IndexedDB で管理）
            urlPattern: /^https?:\/\/.*\/api\//,
            handler: "NetworkOnly",
          },
          {
            // Supabase Storage の画像はキャッシュ（30日）
            urlPattern: /supabase\.co\/storage/,
            handler: "CacheFirst",
            options: {
              cacheName: "supabase-images",
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
          {
            // フォントはキャッシュ（1年）
            urlPattern: /fonts\.(googleapis|gstatic)\.com/,
            handler: "CacheFirst",
            options: {
              cacheName: "fonts",
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
        ],
      },
      manifest: {
        name: "Cro-co",
        short_name: "Cro-co",
        description: "大阪大学限定マッチングアプリ",
        theme_color: "#0A0A0A",
        background_color: "#FFFFFF",
        display: "standalone",
        orientation: "portrait",
        scope: "/",
        start_url: "/home",
        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any maskable",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
      },
      devOptions: {
        enabled: true,
        type: "module",
      },
    }),
  ],
  build: {
    minify: "esbuild",
  },
  esbuild: {
    drop: command === "build" ? (["console", "debugger"] as ("console" | "debugger")[]) : [],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}))

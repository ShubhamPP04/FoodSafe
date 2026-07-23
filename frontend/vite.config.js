import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'FoodSafe — Protect Your Family\'s Plate',
        short_name: 'FoodSafe',
        description: 'AI-powered Indian food adulteration detection',
        theme_color: '#2f8f52',
        background_color: '#f4f7f4',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // Workbox's terser worker exits early in this project's local Node
        // environment. An unminified service worker is small and deterministic.
        mode: 'development',
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /\/api\/fssai\/alerts/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'fssai-alerts',
              expiration: { maxAgeSeconds: 86400 },
            },
          },
          {
            urlPattern: /\/api\/brands\/all/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'brands-cache',
              expiration: { maxAgeSeconds: 21600 },
            },
          },
          {
            urlPattern: /\/api\/community\/city-risk/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'community-cache',
              expiration: { maxAgeSeconds: 7200 },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Read the monorepo's root .env. Vite exposes only VITE_-prefixed variables to the app.
  envDir: '../..',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Registration runs from an external script so the CSP never needs 'unsafe-inline'.
      injectRegister: 'script',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'fonts/*.woff2'],
      manifest: {
        id: '/',
        name: 'ChitFund',
        short_name: 'ChitFund',
        description: 'Chit group installments, payouts and member records',
        lang: 'en-IN',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#0F4C81',
        background_color: '#F6F7F9',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // App shell and static assets only. API responses are never cached.
        globPatterns: ['**/*.{js,css,html,woff2,png,svg,ico}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [],
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': { target: 'http://127.0.0.1:3000', changeOrigin: false },
    },
  },
  preview: {
    port: 4173,
    strictPort: true,
    proxy: {
      '/api': { target: 'http://127.0.0.1:3000', changeOrigin: false },
    },
  },
  build: {
    sourcemap: true,
    target: 'es2022',
    rollupOptions: {
      output: {
        // Libraries change far less often than app code; separate chunks stay
        // cached on phones across app releases.
        manualChunks: {
          react: ['react', 'react-dom', 'react-dom/client', 'react-router'],
          data: ['@tanstack/react-query', 'zod', 'react-hook-form', '@hookform/resolvers'],
          i18n: ['i18next', 'react-i18next'],
        },
      },
    },
  },
});

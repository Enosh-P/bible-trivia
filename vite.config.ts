import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? 'dev'),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Bible Trivia — வேத வினாடி வினா',
        short_name: 'Bible Trivia',
        description: 'Bible trivia in Tamil and English',
        lang: 'en',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f1f3f5',
        theme_color: '#f1f3f5',
        categories: ['education', 'games', 'books'],
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Question packs are bundled JS, so the whole app (fonts included) works offline.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Push notifications: shows them and opens the right screen on tap.
        importScripts: ['push-handler.js'],
        // Human-written question packs (one file per book) are downloaded when
        // first used and then kept for offline play.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/packs/'),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'question-packs', expiration: { maxEntries: 100 } },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});

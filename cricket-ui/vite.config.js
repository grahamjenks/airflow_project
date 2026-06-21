import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const enableSourcemap = String(env.VITE_SOURCEMAP || '').toLowerCase() === 'true'

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg'],
        manifest: {
          name: 'Cricket Statistics Tracker',
          short_name: 'Cricket Stats',
          description: 'Live cricket scoring and statistics — ball-by-ball scoring, scorecards, and team management.',
          theme_color: '#5b5bf0',
          background_color: '#eef1f8',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          icons: [
            { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          // Precache the built app shell; runtime-cache same-origin GETs so the
          // app opens offline. Supabase API calls are network-first below.
          globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
          navigateFallback: 'index.html',
          runtimeCaching: [
            {
              urlPattern: ({ url }) => url.origin === self.location.origin,
              handler: 'StaleWhileRevalidate',
              options: { cacheName: 'app-shell' },
            },
          ],
        },
      }),
    ],
    base: '/', // Use '/' for root domain or '/cricket-ui/' for subdirectory
    server: {
      port: 3000,
      open: true
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: enableSourcemap,
      minify: 'esbuild'
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/setupTests.js'],
      css: false,
    }
  }
})


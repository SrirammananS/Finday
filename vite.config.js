import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'fs';
import typegpu from 'unplugin-typegpu/vite';

// Read version from package.json and add timestamp
const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));
const buildTime = new Date().toLocaleString('en-US', { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
const version = `${packageJson.version} (${buildTime})`;

process.env.VITE_APP_VERSION = version;

export default defineConfig({
  plugins: [
    typegpu(),
    tailwindcss(),
    react(),
    // Security headers plugin for production
    {
      name: 'security-headers',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          res.setHeader('X-Content-Type-Options', 'nosniff');
          res.setHeader('X-Frame-Options', 'DENY');
          res.setHeader('X-XSS-Protection', '1; mode=block');
          res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
          next();
        });
      }
    },
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'LAKSH - Personal Finance Tracker',
        short_name: 'LAKSH',
        description: 'Track your expenses and income with Google Sheets sync',
        id: '/laksh-pwa',
        theme_color: '#6366f1',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        categories: ['finance', 'productivity'],
        screenshots: [
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            form_factor: 'wide',
            label: 'LAKSH Dashboard'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'LAKSH Mobile'
          }
        ],
        // Share Target API - Receive shared text (SMS)
        share_target: {
          action: '/?share=true',
          method: 'GET',
          params: {
            title: 'title',
            text: 'text',
            url: 'url'
          }
        },
        // Shortcuts for quick actions
        shortcuts: [
          {
            name: 'Add Transaction',
            short_name: 'Add',
            url: '/?action=add',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }]
          },
          {
            name: 'View Friends',
            short_name: 'Friends',
            url: '/friends',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }]
          }
        ],
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React ecosystem
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],

          // UI and animation libraries
          'ui-vendor': ['framer-motion', 'lucide-react'],

          // Animation and scroll libraries
          'animation-vendor': ['gsap', 'lenis'],

          // Date/time utilities
          'date-vendor': ['date-fns'],

          // Chart and visualization
          'chart-vendor': ['recharts'],

          // Utilities
          'utils-vendor': ['uuid', 'idb'],
        }
      }
    },
    chunkSizeWarningLimit: 1000 // Increase to 1000kb for main chunks
  },
})

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const basePath = process.env.VITE_BASE_PATH || '/';
  const normalizedBase = basePath.replace(/\/$/, '');
  const proxyPrefix = `${normalizedBase}/supabase-proxy`;
  const supabaseTarget = env.VITE_SUPABASE_URL || 'https://cxcvngmniodppirpzzdz.supabase.co';

  return {
    base: process.env.VITE_BASE_PATH || '/',
    server: {
      proxy: {
        [proxyPrefix]: {
          target: supabaseTarget,
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.slice(proxyPrefix.length) || '/',
        },
      },
    },
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        devOptions: {
          enabled: true,
        },
        includeAssets: [
          'favicon.ico',
          'apple-touch-icon.png',
          'masked-icon.svg',
          'favicon.svg',
          'logo.png',
        ],
        manifest: {
          id: process.env.VITE_BASE_PATH || '/',
          name: 'Paysage Concept',
          short_name: 'Paysage',
          description: 'Application de gestion de chantiers et pointage terrain',
          theme_color: '#15302F',
          background_color: '#15302F',
          display: 'standalone',
          orientation: 'portrait',
          start_url: './',
          scope: './',
          icons: [
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'pwa-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'maskable',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: 'pwa-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg}'],
        },
      }),
    ],
  };
});

import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';
import { checker } from 'vite-plugin-checker';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import { VitePWA } from 'vite-plugin-pwa';

export const plugins = [
  checker({
    eslint: {
      lintCommand:
        'eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0',
    },
    typescript: true,
  }),
  nodePolyfills(),
  react(),
  VitePWA({
    manifest: {
      description: 'AI thread app',
      icons: [
        {
          sizes: '64x64 32x32 24x24 16x16',
          src: '/favicon.ico',
          type: 'image/x-icon',
        },
        {
          sizes: '192x192',
          src: '/icon192.png',
          type: 'image/png',
        },
        {
          purpose: 'maskable',
          sizes: '192x192',
          src: '/icon192.png',
          type: 'image/png',
        },
        {
          sizes: '512x512',
          src: '/icon512.png',
          type: 'image/png',
        },
        {
          purpose: 'maskable',
          sizes: '512x512',
          src: '/icon512.png',
          type: 'image/png',
        },
      ],
      name: 'AI Threads',
      short_name: 'Threads',
    },
    registerType: 'autoUpdate',
    workbox: {
      maximumFileSizeToCacheInBytes: 4194304,
    },
  }),
];

/**
 * @type {import('vite').UserConfig}
 */
export default defineConfig({
  plugins,
  root: process.env.NODE_ENV === 'production' ? undefined : 'src/renderer',
});

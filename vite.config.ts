import react from '@vitejs/plugin-react-swc';
import { defineConfig } from 'vite';
import { checker } from 'vite-plugin-checker';
import { nodePolyfills } from 'vite-plugin-node-polyfills';

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
];

/**
 * @type {import('vite').UserConfig}
 */
export default defineConfig({
  plugins,
  root: 'src/renderer',
});

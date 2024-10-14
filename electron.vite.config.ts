import { defineConfig, externalizeDepsPlugin } from 'electron-vite';

import { plugins } from './vite.config';

/**
 * @type {import('electron-vite').UserConfig}
 */
export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    plugins,
  },
});

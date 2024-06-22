import { defineConfig, externalizeDepsPlugin } from 'electron-vite';

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
  renderer: {},
});

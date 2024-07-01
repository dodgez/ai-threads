import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import { checker } from 'vite-plugin-checker';

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
    plugins: [
      checker({
        eslint: {
          lintCommand:
            'eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0',
        },
        typescript: true,
      }),
    ],
  },
});

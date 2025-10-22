import { defineConfig } from 'vite';
import { resolve } from 'path';
import { crx } from '@crxjs/vite-plugin';
import manifest from './public/manifest.json';

export default defineConfig({
  plugins: [
    crx({ manifest }),
  ],
  build: {
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV === 'development',
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup/popup.html'),
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
});

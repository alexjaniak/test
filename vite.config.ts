import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        'torus-knot': resolve(__dirname, 'experiments/torus-knot/index.html'),
      },
    },
  },
  assetsInclude: ['**/*.glsl'],
  server: {
    port: 5173,
    host: true,
    allowedHosts: ['test.aelix.dev', 'localhost'],
  },
  preview: {
    port: 5174,
    host: true,
    allowedHosts: ['test.aelix.dev', 'localhost'],
  },
});

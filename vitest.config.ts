import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
  resolve: {
    alias: {
      '@core': path.resolve(__dirname, './src/core'),
      '@services': path.resolve(__dirname, './src/services'),
      '@strategies': path.resolve(__dirname, './src/strategies'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@types': path.resolve(__dirname, './src/types'),
    },
  },
});

import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    preserveSymlinks: true,
    alias: {
      '@dnd/shared': resolve(__dirname, '../shared/src/index.ts'),
    },
  },
  build: {
    rollupOptions: {
      external: ['electron', 'sql.js', 'path', 'fs', 'url', 'os', 'crypto'],
    },
  },
});

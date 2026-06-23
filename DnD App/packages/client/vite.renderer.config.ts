import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    preserveSymlinks: true,
    alias: {
      '@renderer': resolve(__dirname, 'src'),
      '@dnd/shared': resolve(__dirname, '../shared/src/index.ts'),
    },
  },
});

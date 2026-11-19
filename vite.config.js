import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        'select-cards': resolve(__dirname, 'select-cards.html'),
        categorize: resolve(__dirname, 'categorize.html')
      }
    }
  }
});


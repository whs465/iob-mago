import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'pdf-vendor': ['pdf-lib', 'pdfjs-dist'],
        },
      },
    },
  },
});

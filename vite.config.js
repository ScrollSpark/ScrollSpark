import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  // Capacitor: './'  |  GitHub Pages project site: '/your-repo-name/' (set via VITE_BASE_PATH when building for Pages)
  base: process.env.VITE_BASE_PATH || './',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});

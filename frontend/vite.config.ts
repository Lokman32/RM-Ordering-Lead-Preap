import { defineConfig } from 'vite';
import { reactRouter } from '@react-router/dev/vite';
import tailwindcss from '@tailwindcss/vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { config } from 'dotenv';

config(); // Load .env

export default defineConfig({
  base: '/', // ✅ This is the fix for asset path issues with Nginx
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  build: {
    outDir: 'dist',
  },
  ssr: {
    noExternal: ['react-helmet-async'],
  },
  server: {
    proxy: {
      '/api': process.env.VITE_API_URL || 'http://localhost:3014',
    },
  },
});

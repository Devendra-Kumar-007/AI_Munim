
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    // GitHub Pages deployment configuration
    // Repository: Devendra-Kumar-007/AI_Munim
    base: '/AI_Munim/',

    // React and Tailwind CSS plugins
    plugins: [
      react(),
      tailwindcss(),
    ],

    // Path aliases
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, '.'),
      },
    },

    // Production build configuration
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },

    // Development server configuration
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',

      // Disable file watching when DISABLE_HMR is true.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
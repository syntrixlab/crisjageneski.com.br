import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Otimizações para produção
    minify: 'esbuild', // Mais rápido que terser
    target: 'es2020',
    sourcemap: false,
  },
})

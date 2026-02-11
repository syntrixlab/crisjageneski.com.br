import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Otimizações para produção
    minify: 'esbuild', // Mais rápido que terser
    target: 'es2015',
    sourcemap: false,
  },
})

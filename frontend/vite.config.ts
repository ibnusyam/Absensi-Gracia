import { defineConfig } from 'vite'
import path from 'node:path'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    // Dev-only: forward relative API calls (VITE_API_BASE_URL=/api/v1) to the
    // local Laravel server. Production builds are served same-origin, unaffected.
    proxy: {
      '/api': 'http://127.0.0.1:8000',
    },
  },
})

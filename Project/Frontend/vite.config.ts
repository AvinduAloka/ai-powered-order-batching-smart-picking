import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: true,    // port occupied
    proxy: {
      '/api': {
        // Docker : http://api:8080 (service name = hostname)
        // Host machine : http://localhost:5080
        target: process.env.VITE_API_PROXY || 'http://localhost:5080',
        changeOrigin: true,
      },
    },
  },
})

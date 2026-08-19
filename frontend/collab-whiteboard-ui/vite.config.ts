import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), vueDevTools()],
  server: {
    proxy: {
      // Forward all REST API calls to the ASP.NET backend
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      // Forward SignalR WebSocket + long-polling to the backend
      '/hubs': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        ws: true, // proxy WebSocket upgrades
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})



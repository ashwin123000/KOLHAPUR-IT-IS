import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('[proxy error]', err.message);
          });
          proxy.on('proxyReq', (_, req) => {
            console.log('[proxy →]', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req) => {
            console.log('[proxy ←]', proxyRes.statusCode, req.url);
          });
        },
      },
    },
  },
})
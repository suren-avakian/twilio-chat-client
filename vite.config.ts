import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // Proxy не потрібен, оскільки CORS налаштований на Rails backend
    // proxy: {
    //   '/api-mobile': {
    //     target: 'https://stagingimages.com',
    //     changeOrigin: true,
    //     secure: true,
    //     rewrite: (path) => path,
    //   },
    // },
  },
})

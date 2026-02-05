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
  // During build, replace import.meta.env.VITE_* with actual values from process.env
  // This ensures environment variables set in Kinsta Control Panel are embedded in the bundle
  define: {
    // Strategy 1: Direct replacement of import.meta.env values (recommended for Kinsta)
    'import.meta.env.VITE_X_APP_TOKEN': JSON.stringify(process.env.VITE_X_APP_TOKEN || ''),
    'import.meta.env.VITE_NODE_JS_MICROSERVICE_BACKEND_URL': JSON.stringify(
      process.env.VITE_NODE_JS_MICROSERVICE_BACKEND_URL || ''
    ),
    'import.meta.env.VITE_INMATE_PHOTOS_API_ROUTE': JSON.stringify(
      process.env.VITE_INMATE_PHOTOS_API_ROUTE || ''
    ),
    'import.meta.env.VITE_CONVERSATION_SID': JSON.stringify(
      process.env.VITE_CONVERSATION_SID || ''
    ),
  },
})

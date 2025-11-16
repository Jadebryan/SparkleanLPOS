import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    open: true,
    host: true, // Allow external connections
    allowedHosts: [
      'localhost',
      '.ngrok-free.dev',
      '.ngrok.io',
      'lawlessly-epidermoid-zenobia.ngrok-free.dev'
    ]
  }
})


import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  build: {
    rollupOptions: {
      output: {
        // Ensure service worker is copied to dist
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'sw.js') {
            return 'sw.js'
          }
          return 'assets/[name]-[hash][extname]'
        }
      }
    }
  }
})


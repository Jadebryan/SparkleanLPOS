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
        },
        // Code splitting for better performance
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['framer-motion', 'react-icons'],
          'chart-vendor': ['recharts'],
          'pdf-vendor': ['jspdf'],
        },
      }
    },
    chunkSizeWarningLimit: 1000,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production', // Remove console.log in production
        drop_debugger: true,
      },
    },
    sourcemap: process.env.NODE_ENV === 'development', // Disable source maps in production
  }
})


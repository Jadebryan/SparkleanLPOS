import React from 'react'
import ReactDOM from 'react-dom/client'
import { ThemeProvider } from './context/ThemeContext'
import { UserProvider } from './context/UserContext'
import { cacheManager } from './utils/cacheManager'
import { initializeFont } from './utils/fontManager'
import App from './App.tsx'
import './index.css'

// Initialize font preference on app load
initializeFont()

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
      .then((registration) => {
        console.log('Service Worker registered:', registration.scope)
        
        // Unregister old service workers and clear caches on login page
        if (window.location.pathname === '/login' || window.location.pathname === '/') {
          registration.update()
          // Clear runtime cache for login page
          if (registration.active) {
            registration.active.postMessage({ type: 'CLEAR_CACHE' })
          }
        }
        
        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // A new service worker is installed and waiting.
                // Ask it to skip waiting, then reload when it takes control.
                const proceed = true // auto proceed; change to confirm() to prompt
                if (proceed) {
                  if (registration.waiting) {
                    registration.waiting.postMessage({ type: 'SKIP_WAITING' })
                  }
                  navigator.serviceWorker.addEventListener('controllerchange', () => {
                    window.location.reload()
                  })
                }
              }
            })
          }
        })
      })
      .catch((error) => {
        console.error('Service Worker registration failed:', error)
      })
  })
}

// Preload critical data
cacheManager.preloadCriticalData()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <UserProvider>
        <App />
      </UserProvider>
    </ThemeProvider>
  </React.StrictMode>,
)


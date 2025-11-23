// Cache Manager for Critical Data
export interface CacheItem<T> {
  data: T
  timestamp: number
  expiry: number
}

const CACHE_PREFIX = 'laundry_cache_'
const DEFAULT_EXPIRY = 5 * 60 * 1000 // 5 minutes

class CacheManager {
  // Set cache item
  set<T>(key: string, data: T, expiryMs: number = DEFAULT_EXPIRY): void {
    try {
      const item: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        expiry: Date.now() + expiryMs
      }
      localStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(item))
    } catch (error) {
      console.error('Failed to set cache:', error)
    }
  }

  // Get cache item
  get<T>(key: string): T | null {
    try {
      const stored = localStorage.getItem(`${CACHE_PREFIX}${key}`)
      if (!stored) return null

      const item: CacheItem<T> = JSON.parse(stored)
      
      // Check if expired
      if (Date.now() > item.expiry) {
        this.remove(key)
        return null
      }

      return item.data
    } catch (error) {
      console.error('Failed to get cache:', error)
      return null
    }
  }

  // Remove cache item
  remove(key: string): void {
    try {
      localStorage.removeItem(`${CACHE_PREFIX}${key}`)
    } catch (error) {
      console.error('Failed to remove cache:', error)
    }
  }

  // Clear all cache
  clear(): void {
    try {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith(CACHE_PREFIX)) {
          localStorage.removeItem(key)
        }
      })
    } catch (error) {
      console.error('Failed to clear cache:', error)
    }
  }

  // Check if cache exists and is valid
  has(key: string): boolean {
    return this.get(key) !== null
  }

  // Get cache age in milliseconds
  getAge(key: string): number | null {
    try {
      const stored = localStorage.getItem(`${CACHE_PREFIX}${key}`)
      if (!stored) return null

      const item: CacheItem<any> = JSON.parse(stored)
      return Date.now() - item.timestamp
    } catch (error) {
      return null
    }
  }

  // Preload critical data for offline use
  async preloadCriticalData(): Promise<void> {
    try {
      // Cache user data
      const user = localStorage.getItem('user')
      if (user) {
        this.set('user', JSON.parse(user), 30 * 60 * 1000) // 30 minutes
      }

      // Preload critical reference data that's needed for offline operations
      // This will be fetched when online, and cached for offline use
      if (navigator.onLine) {
        // Wait a bit to ensure user is logged in and token is available
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Check if user is logged in
        const user = localStorage.getItem('user')
        if (!user) {
          console.log('User not logged in, skipping data preload')
          return
        }
        
        // Import API functions dynamically to avoid circular dependencies
        const { customerAPI, serviceAPI, discountAPI, stationAPI } = await import('./api')
        
        try {
          // Fetch and cache all critical data with timeout
          const fetchWithTimeout = async (promise: Promise<any>, timeout = 5000) => {
            return Promise.race([
              promise,
              new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), timeout)
              )
            ])
          }
          
          const [customers, services, discounts, stations] = await Promise.allSettled([
            fetchWithTimeout(customerAPI.getAll({ showArchived: false }).catch(() => []), 5000),
            fetchWithTimeout(serviceAPI.getAll({ showArchived: false }).catch(() => []), 5000),
            fetchWithTimeout(discountAPI.getAll({ showArchived: false }).catch(() => []), 5000),
            fetchWithTimeout(stationAPI.getAll({ showArchived: false }).catch(() => []), 5000)
          ])

          // Cache each resource with 1 hour expiry
          // Store in the same format as apiRequest returns: { success: true, data: [...] }
          const CACHE_EXPIRY = 60 * 60 * 1000 // 1 hour
          
          if (customers.status === 'fulfilled') {
            // Store as array (from wrapper function) but also cache as full response format
            this.set('api_customers', customers.value, CACHE_EXPIRY)
            this.set('api_/customers', { success: true, data: customers.value }, CACHE_EXPIRY)
          }
          if (services.status === 'fulfilled') {
            this.set('api_services', services.value, CACHE_EXPIRY)
            this.set('api_/services', { success: true, data: services.value }, CACHE_EXPIRY)
          }
          if (discounts.status === 'fulfilled') {
            this.set('api_discounts', discounts.value, CACHE_EXPIRY)
            this.set('api_/discounts', { success: true, data: discounts.value }, CACHE_EXPIRY)
          }
          if (stations.status === 'fulfilled') {
            this.set('api_stations', stations.value, CACHE_EXPIRY)
            this.set('api_/stations', { success: true, data: stations.value }, CACHE_EXPIRY)
          }

          console.log('Critical data preloaded and cached for offline use')
        } catch (error) {
          console.error('Failed to preload some critical data:', error)
          // Continue even if some requests fail
        }
      } else {
        console.log('Offline - using existing cache if available')
      }
    } catch (error) {
      console.error('Failed to preload critical data:', error)
    }
  }
}

export const cacheManager = new CacheManager()


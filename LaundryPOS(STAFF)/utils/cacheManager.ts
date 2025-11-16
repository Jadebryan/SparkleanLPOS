// Cache manager for Staff app
// Caches GET request responses locally

import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'api_cache_';
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes default

interface CachedData<T> {
  data: T;
  timestamp: number;
  expiry: number;
}

class CacheManager {
  // Get cached data
  async get<T>(key: string): Promise<T | null> {
    try {
      const cacheKey = `${CACHE_PREFIX}${key}`;
      const stored = await AsyncStorage.getItem(cacheKey);
      
      if (!stored) {
        return null;
      }

      const cached: CachedData<T> = JSON.parse(stored);
      
      // Check if expired
      if (Date.now() > cached.timestamp + cached.expiry) {
        await AsyncStorage.removeItem(cacheKey);
        return null;
      }

      return cached.data;
    } catch (error) {
      console.error('Error getting cache:', error);
      return null;
    }
  }

  // Set cached data
  async set<T>(key: string, data: T, expiry: number = CACHE_EXPIRY): Promise<void> {
    try {
      const cacheKey = `${CACHE_PREFIX}${key}`;
      const cached: CachedData<T> = {
        data,
        timestamp: Date.now(),
        expiry,
      };
      await AsyncStorage.setItem(cacheKey, JSON.stringify(cached));
    } catch (error) {
      console.error('Error setting cache:', error);
    }
  }

  // Clear specific cache entry
  async clear(key: string): Promise<void> {
    try {
      const cacheKey = `${CACHE_PREFIX}${key}`;
      await AsyncStorage.removeItem(cacheKey);
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  // Clear all cache entries
  async clearAll(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch (error) {
      console.error('Error clearing all cache:', error);
    }
  }

  // Preload critical data
  async preloadCriticalData(): Promise<void> {
    // Can be extended to preload important data on app start
    console.log('📦 Cache manager initialized');
  }
}

export const cacheManager = new CacheManager();

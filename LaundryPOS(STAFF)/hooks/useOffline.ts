// Hook to manage offline status and queue
import { useState, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { offlineQueue } from '@/utils/offlineQueue';

export const useOffline = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [queueCount, setQueueCount] = useState(0);

  // Check network status
  const checkNetworkStatus = useCallback(async () => {
    if (Platform.OS === 'web') {
      // Use navigator.onLine for web
    if (typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine);
      } else {
        setIsOnline(true);
      }
    } else {
      // Use NetInfo for React Native (Android/iOS)
      try {
        const state = await NetInfo.fetch();
        // Check both isConnected and isInternetReachable for better accuracy
        const isConnected = state.isConnected ?? false;
        const isInternetReachable = state.isInternetReachable ?? true; // Default to true if not available
        
        // Consider online if connected AND internet is reachable (or reachability unknown)
        setIsOnline(isConnected && (isInternetReachable !== false));
      } catch (error) {
        console.error('Error checking network status:', error);
        // Default to online if check fails to avoid false offline states
        setIsOnline(true);
      }
    }
  }, []);

  // Load queue count
  const updateQueueCount = useCallback(async () => {
    await offlineQueue.load();
    setQueueCount(offlineQueue.getCount());
  }, []);

  // Sync queue when online
  const syncQueue = useCallback(async () => {
    if (isOnline && queueCount > 0 && !isSyncing) {
      setIsSyncing(true);
      try {
        await offlineQueue.sync();
        await updateQueueCount();
      } catch (error) {
        console.error('Error syncing queue:', error);
      } finally {
        setIsSyncing(false);
      }
    }
  }, [isOnline, queueCount, isSyncing, updateQueueCount]);

  // Clear queue
  const clearQueue = useCallback(async () => {
    await offlineQueue.clear();
    setQueueCount(0);
  }, []);

  // Initialize
  useEffect(() => {
    checkNetworkStatus();
    updateQueueCount();

    // Subscribe to queue changes for real-time updates
    const unsubscribe = offlineQueue.subscribe(() => {
      updateQueueCount();
    });

    let netInfoUnsubscribe: (() => void) | null = null;
    let interval: NodeJS.Timeout | null = null;

    if (Platform.OS === 'web') {
      // Listen for online/offline events on web
    if (typeof window !== 'undefined' && typeof (window as any).addEventListener === 'function') {
      const handleOnline = () => {
        setIsOnline(true);
        syncQueue();
      };
      const handleOffline = () => {
        setIsOnline(false);
      };
      
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      // Periodically check queue count (fallback)
        interval = setInterval(() => {
        updateQueueCount();
        if (isOnline) {
          syncQueue();
        }
      }, 5000); // Check every 5 seconds

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
          if (interval) clearInterval(interval);
          unsubscribe();
        };
      }
    } else {
      // Use NetInfo for React Native (Android/iOS)
      netInfoUnsubscribe = NetInfo.addEventListener(state => {
        const connected = state.isConnected ?? false;
        setIsOnline(connected);
        if (connected) {
          syncQueue();
        }
      });

      // Periodically check queue count and sync if online
      interval = setInterval(() => {
        updateQueueCount();
        checkNetworkStatus();
        if (isOnline) {
          syncQueue();
        }
      }, 5000); // Check every 5 seconds

      return () => {
        if (netInfoUnsubscribe) netInfoUnsubscribe();
        if (interval) clearInterval(interval);
        unsubscribe();
      };
    }

    return () => {
      unsubscribe();
    };
  }, [checkNetworkStatus, updateQueueCount, syncQueue, isOnline]);

  return {
    isOnline,
    isSyncing,
    queueCount,
    syncQueue,
    clearQueue,
    refreshQueue: updateQueueCount,
  };
};

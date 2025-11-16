// Hook to manage offline status and queue
import { useState, useEffect, useCallback } from 'react';
import { offlineQueue } from '@/utils/offlineQueue';

export const useOffline = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [queueCount, setQueueCount] = useState(0);

  // Check network status
  const checkNetworkStatus = useCallback(() => {
    if (typeof navigator !== 'undefined') {
      setIsOnline(navigator.onLine);
    } else {
      setIsOnline(true); // Assume online for React Native
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

    // Listen for online/offline events (web only; some RN runtimes expose a window without these APIs)
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
      const interval = setInterval(() => {
        updateQueueCount();
        if (isOnline) {
          syncQueue();
        }
      }, 5000); // Check every 5 seconds

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        clearInterval(interval);
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

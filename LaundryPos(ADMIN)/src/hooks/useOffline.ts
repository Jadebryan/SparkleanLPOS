import { useState, useEffect } from 'react'
import { offlineQueue } from '../utils/offlineQueue'

export interface OfflineStatus {
  isOnline: boolean
  isPending: boolean
  pendingCount: number
  queue: ReturnType<typeof offlineQueue.getQueue>
}

export const useOffline = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [pendingCount, setPendingCount] = useState(0)
  const [queue, setQueue] = useState(offlineQueue.getQueue())

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      offlineQueue.processQueue()
    }

    const handleOffline = () => {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Subscribe to queue updates
    const unsubscribe = offlineQueue.subscribe((updatedQueue) => {
      setQueue(updatedQueue)
      setPendingCount(offlineQueue.getPendingCount())
    })

    // Initial queue count
    setPendingCount(offlineQueue.getPendingCount())

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      unsubscribe()
    }
  }, [])

  return {
    isOnline,
    isPending: pendingCount > 0,
    pendingCount,
    queue,
    retryQueue: () => offlineQueue.processQueue(),
    clearQueue: () => offlineQueue.clearQueue(),
    retryFailed: () => offlineQueue.retryFailed()
  }
}


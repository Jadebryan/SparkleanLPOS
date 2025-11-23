// Offline Action Queue System
export interface QueuedAction {
  id: string
  type: string
  endpoint: string
  method: string
  body?: any
  headers?: Record<string, string>
  timestamp: number
  retries: number
  status: 'pending' | 'processing' | 'failed'
}

const QUEUE_STORAGE_KEY = 'offline_action_queue'
const MAX_RETRIES = 3
const MAX_QUEUE_SIZE = 100

class OfflineQueue {
  private queue: QueuedAction[] = []
  private isProcessing = false
  private listeners: Array<(queue: QueuedAction[]) => void> = []

  constructor() {
    this.loadQueue()
    this.setupOnlineListener()
  }

  private loadQueue() {
    try {
      const stored = localStorage.getItem(QUEUE_STORAGE_KEY)
      if (stored) {
        this.queue = JSON.parse(stored)
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error)
      this.queue = []
    }
  }

  private saveQueue() {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(this.queue))
      this.notifyListeners()
    } catch (error) {
      console.error('Failed to save offline queue:', error)
    }
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener([...this.queue]))
  }

  subscribe(listener: (queue: QueuedAction[]) => void) {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  private setupOnlineListener() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.processQueue()
      })
    }
  }

  // Add action to queue
  enqueue(
    endpoint: string,
    method: string,
    body?: any,
    headers?: Record<string, string>
  ): string {
    // Prevent queue overflow
    if (this.queue.length >= MAX_QUEUE_SIZE) {
      const oldest = this.queue.shift()
      console.warn('Queue full, removing oldest action:', oldest?.id)
    }

    const action: QueuedAction = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'api_request',
      endpoint,
      method,
      body,
      headers,
      timestamp: Date.now(),
      retries: 0,
      status: 'pending'
    }

    this.queue.push(action)
    this.saveQueue()

    // Try to process immediately if online
    if (navigator.onLine) {
      this.processQueue()
    }

    return action.id
  }

  // Process queued actions
  async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) {
      return
    }

    if (!navigator.onLine) {
      return
    }

    this.isProcessing = true

    const pendingActions = this.queue.filter(a => a.status === 'pending')
    
    for (const action of pendingActions) {
      try {
        action.status = 'processing'
        this.saveQueue()

        // Get auth token
        const getAuthToken = (): string | null => {
          try {
            const user = localStorage.getItem('user')
            if (user) {
              const userData = JSON.parse(user)
              return userData?.token || null
            }
          } catch (error) {
            console.error('Error reading auth token:', error)
          }
          return null
        }

        const token = getAuthToken()
        const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api'
        
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          ...action.headers
        }
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }

        const response = await fetch(`${API_URL}${action.endpoint}`, {
          method: action.method,
          headers,
          body: action.body ? JSON.stringify(action.body) : undefined
        })

        if (response.ok) {
          // Remove successful action
          this.queue = this.queue.filter(a => a.id !== action.id)
          this.saveQueue()
        } else {
          throw new Error(`Request failed with status ${response.status}`)
        }
      } catch (error) {
        console.error('Failed to process queued action:', error)
        action.retries += 1
        action.status = 'pending'

        if (action.retries >= MAX_RETRIES) {
          action.status = 'failed'
          console.error('Action failed after max retries:', action)
        }

        this.saveQueue()
      }
    }

    this.isProcessing = false
  }

  // Get queue status
  getQueue(): QueuedAction[] {
    return [...this.queue]
  }

  // Get pending count
  getPendingCount(): number {
    return this.queue.filter(a => a.status === 'pending').length
  }

  // Clear queue
  clearQueue(): void {
    this.queue = []
    this.saveQueue()
  }

  // Remove specific action
  removeAction(id: string): void {
    this.queue = this.queue.filter(a => a.id !== id)
    this.saveQueue()
  }

  // Retry failed actions
  retryFailed(): void {
    this.queue.forEach(action => {
      if (action.status === 'failed' && action.retries < MAX_RETRIES) {
        action.status = 'pending'
        action.retries = 0
      }
    })
    this.saveQueue()
    this.processQueue()
  }
}

export const offlineQueue = new OfflineQueue()


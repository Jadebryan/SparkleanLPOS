// Offline queue for Staff app
// Queues POST/PUT/DELETE requests when offline and syncs when online

import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = 'offline_queue';
const MAX_RETRIES = 3;

export interface QueuedRequest {
  id: string;
  method: string;
  url: string;
  data?: any;
  timestamp: number;
  retries?: number;
}

class OfflineQueue {
  private queue: QueuedRequest[] = [];
  private isSyncing = false;
  private listeners: Array<() => void> = [];

  // Load queue from storage
  async load(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(QUEUE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading offline queue:', error);
      this.queue = [];
    }
  }

  // Save queue to storage
  private async save(): Promise<void> {
    try {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue));
      // Notify listeners of queue change
      this.notifyListeners();
    } catch (error) {
      console.error('Error saving offline queue:', error);
    }
  }

  // Subscribe to queue changes
  subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Notify all listeners
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  // Add request to queue
  async enqueue(request: Omit<QueuedRequest, 'id' | 'retries'>): Promise<void> {
    const queuedRequest: QueuedRequest = {
      ...request,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      retries: 0,
    };
    this.queue.push(queuedRequest);
    await this.save();
    console.log('📥 Request queued:', queuedRequest.id);
  }

  // Get all queued requests
  getAll(): QueuedRequest[] {
    return [...this.queue];
  }

  // Get queue count
  getCount(): number {
    return this.queue.length;
  }

  // Remove request from queue
  private async remove(id: string): Promise<void> {
    this.queue = this.queue.filter(req => req.id !== id);
    await this.save();
  }

  // Process queue when online
  async sync(): Promise<void> {
    if (this.isSyncing || this.queue.length === 0) {
      return;
    }

    this.isSyncing = true;
    console.log('🔄 Starting queue sync...');

    const requestsToProcess = [...this.queue];
    const successful: string[] = [];
    const failed: QueuedRequest[] = [];

    for (const request of requestsToProcess) {
      try {
        const token = await this.getAuthToken();
        if (!token) {
          console.warn('No auth token, skipping sync');
          break;
        }

        const headers: any = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        };

        // Use fetch for better error handling
        const response = await fetch(request.url, {
          method: request.method,
          headers,
          body: request.data ? JSON.stringify(request.data) : undefined,
        });

        if (response.ok) {
          successful.push(request.id);
          await this.remove(request.id);
        } else {
          const retries = (request.retries || 0) + 1;
          if (retries >= MAX_RETRIES) {
            failed.push(request);
            await this.remove(request.id);
          } else {
            // Update retry count
            const index = this.queue.findIndex(req => req.id === request.id);
            if (index !== -1) {
              this.queue[index].retries = retries;
              await this.save();
            }
          }
        }
      } catch (error) {
        const retries = (request.retries || 0) + 1;
        if (retries >= MAX_RETRIES) {
          failed.push(request);
          await this.remove(request.id);
        } else {
          // Update retry count
          const index = this.queue.findIndex(req => req.id === request.id);
          if (index !== -1) {
            this.queue[index].retries = retries;
            await this.save();
          }
        }
      }
    }

    if (successful.length > 0) {
      console.log(`✅ Synced ${successful.length} requests`);
    }
    if (failed.length > 0) {
      console.warn(`❌ Failed to sync ${failed.length} requests after ${MAX_RETRIES} retries`);
    }

    this.isSyncing = false;
  }

  // Get auth token
  private async getAuthToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('token') || await AsyncStorage.getItem('userToken');
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  // Clear all queued requests
  async clear(): Promise<void> {
    this.queue = [];
    await AsyncStorage.removeItem(QUEUE_KEY);
    this.notifyListeners(); // Notify listeners of queue change
    console.log('🗑️ Queue cleared');
  }
}

export const offlineQueue = new OfflineQueue();

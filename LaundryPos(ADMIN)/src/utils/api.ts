import { offlineQueue } from './offlineQueue'
import { cacheManager } from './cacheManager'

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api'

// Get auth token from localStorage
const getAuthToken = (): string | null => {
  try {
    const user = localStorage.getItem('user')
    if (user) {
      const userData = JSON.parse(user)
      const token = userData?.token || null
      if (!token) {
        console.warn('No token found in user data')
      }
      return token
    }
  } catch (error) {
    console.error('Error reading auth token from localStorage:', error)
  }
  return null
}

// Check if endpoint should be queued when offline
const shouldQueueOffline = (endpoint: string, method: string): boolean => {
  // Queue mutations (POST, PUT, DELETE) but not GET requests
  if (method === 'GET') return false
  
  // Don't queue auth endpoints
  if (endpoint.includes('/auth/') || endpoint.includes('/login')) return false
  
  return true
}

// Fetch fresh data in background to update cache
const fetchFreshDataInBackground = async (
  endpoint: string,
  cacheKey: string,
  token: string | null,
  options: RequestInit
): Promise<void> => {
  // Only fetch in background if online
  if (!navigator.onLine) return
  
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    }
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    })
    
    if (response.ok) {
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        const data = await response.json()
        
        // Update cache with fresh data
        const isCriticalData = endpoint.includes('/customers') || 
                             endpoint.includes('/services') || 
                             endpoint.includes('/discounts') || 
                             endpoint.includes('/stations')
        const expiry = isCriticalData ? 60 * 60 * 1000 : 5 * 60 * 1000
        cacheManager.set(cacheKey, data, expiry)
        
        // Also cache generic endpoint for critical data
        if (isCriticalData && endpoint.includes('?')) {
          const genericKey = `api_${endpoint.split('?')[0].replace(/\//g, '_')}`
          cacheManager.set(genericKey, data, expiry)
        }
        
        console.log('[Background] Cache updated for:', endpoint)
      }
    }
  } catch (error) {
    // Silently fail - we already have cached data
    console.debug('[Background] Failed to refresh cache for:', endpoint, error)
  }
}

// Helper function to create a fetch request with timeout
const fetchWithTimeout = async (
  url: string,
  options: RequestInit = {},
  timeout: number = 30000 // Default 30 seconds
): Promise<Response> => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    })
    clearTimeout(timeoutId)
    return response
  } catch (error: any) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      throw new Error(`Request timeout after ${timeout}ms`)
    }
    // Wrap network errors in a more descriptive error
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(`Failed to fetch: Network error - ${error.message}`)
    }
    throw error
  }
}

// Make authenticated API request with offline support
export const apiRequest = async (
  endpoint: string,
  options: RequestInit = {},
  timeout?: number // Optional timeout in milliseconds
): Promise<any> => {
  const token = getAuthToken()
  const method = options.method || 'GET'
  
  // Generate cache key based on endpoint and query params
  const cacheKey = `api_${endpoint.replace(/\//g, '_').replace(/\?/g, '_').replace(/&/g, '_').replace(/=/g, '_').replace(/[^a-zA-Z0-9_]/g, '_')}`
  
  // For GET requests, implement cache-first strategy
  if (method === 'GET') {
    const cached = cacheManager.get(cacheKey)
    
    // If offline, return cached data (even if stale)
    if (!navigator.onLine) {
      if (cached) {
        console.log('[Offline] Returning cached data for:', endpoint)
        return cached
      }
      // Try to find a more generic cache (e.g., /customers when /customers?search=xyz fails)
      const baseEndpoint = endpoint.split('?')[0]
      const genericCacheKey = `api_${baseEndpoint.replace(/\//g, '_')}`
      const genericCached = cacheManager.get(genericCacheKey)
      if (genericCached) {
        console.log('[Offline] Returning generic cached data for:', endpoint)
        return genericCached
      }
      // Also try the preloaded cache keys (e.g., api_customers, api_services)
      const preloadKeys: Record<string, string> = {
        '/customers': 'api_customers',
        '/services': 'api_services',
        '/discounts': 'api_discounts',
        '/stations': 'api_stations'
      }
      const preloadKey = preloadKeys[baseEndpoint]
      if (preloadKey) {
        const preloadCached = cacheManager.get(preloadKey)
        if (preloadCached) {
          console.log('[Offline] Returning preloaded cached data for:', endpoint)
          // Wrap in response format if it's an array (from preloadCriticalData)
          if (Array.isArray(preloadCached)) {
            return { success: true, data: preloadCached }
          }
          return preloadCached
        }
      }
      throw new Error(`No internet connection and no cached data available for ${endpoint}`)
    }
    
    // If online, check cache first but fetch fresh data in background
    if (cached) {
      console.log('[Cache-first] Returning cached data, refreshing in background for:', endpoint)
      // Return cached immediately, but fetch fresh data in background
      fetchFreshDataInBackground(endpoint, cacheKey, token, options)
      // Ensure cached data is in correct format
      if (Array.isArray(cached)) {
        return { success: true, data: cached }
      }
      return cached
    }
    
    // Also check preloaded cache when online (as fallback)
    const baseEndpoint = endpoint.split('?')[0]
    const preloadKeys: Record<string, string> = {
      '/customers': 'api_customers',
      '/services': 'api_services',
      '/discounts': 'api_discounts',
      '/stations': 'api_stations'
    }
    const preloadKey = preloadKeys[baseEndpoint]
    if (preloadKey) {
      const preloadCached = cacheManager.get(preloadKey)
      if (preloadCached) {
        console.log('[Online] Using preloaded cache for:', endpoint)
        fetchFreshDataInBackground(endpoint, cacheKey, token, options)
        return Array.isArray(preloadCached) ? { success: true, data: preloadCached } : preloadCached
      }
    }
  }
  
  // Check if offline and should queue
  if (!navigator.onLine && shouldQueueOffline(endpoint, method)) {
    // Queue the request
    const queueId = offlineQueue.enqueue(
      endpoint,
      method,
      options.body ? JSON.parse(options.body as string) : undefined,
      options.headers as Record<string, string>
    )
    
    // Return a promise that resolves with a queued response
    return Promise.resolve({
      success: true,
      queued: true,
      queueId,
      message: 'Request queued for when connection is restored'
    })
  }
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
    // Debug: Log token presence (first 20 chars only for security)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API Request] ${endpoint} - Token: ${token.substring(0, 20)}...`)
    }
  } else {
    console.warn(`[API Request] ${endpoint} - No token found!`)
  }

  // Use timeout-aware fetch for long-running requests (like backups)
  let response: Response
  try {
    response = timeout
    ? await fetchWithTimeout(`${API_URL}${endpoint}`, { ...options, headers }, timeout)
    : await fetch(`${API_URL}${endpoint}`, { ...options, headers })
  } catch (fetchError: any) {
    // Handle network errors that occur before response is received
    console.error('Fetch error:', fetchError)
    const errorMessage = fetchError?.message || fetchError?.toString() || 'Failed to fetch'
    
    // Provide more descriptive error messages
    if (fetchError?.name === 'AbortError' || errorMessage.includes('timeout')) {
      throw new Error(`Request timeout: ${errorMessage}`)
    }
    if (fetchError instanceof TypeError) {
      throw new Error(`Network error: Failed to connect to server. ${errorMessage}`)
    }
    throw new Error(`Failed to fetch: ${errorMessage}`)
  }

  // Check content type before parsing
  const contentType = response.headers.get('content-type')
  let data
  
  try {
    if (contentType && contentType.includes('application/json')) {
      data = await response.json()
    } else {
      // If response is not JSON, get text and show error
      const text = await response.text()
      console.error('Non-JSON response:', text.substring(0, 200))
      throw new Error(`Server returned invalid response. Expected JSON but got ${contentType || 'unknown'}`)
    }
  } catch (parseError: any) {
    // If JSON parsing fails, it might be HTML error page
    if (parseError.name === 'SyntaxError' || parseError.message.includes('JSON')) {
      const text = await response.clone().text().catch(() => 'Unable to read response')
      console.error('JSON parse error. Response:', text.substring(0, 200))
      throw new Error(`Server error: Received non-JSON response. Status: ${response.status}`)
    }
    throw parseError
  }

  // Handle authentication errors (401) - redirect to login
  if (response.status === 401) {
    const errorMessage = data.message || data.error || 'Authentication failed'
    console.error('Authentication error:', errorMessage)
    
    // Only clear token and redirect if we have a stored token (meaning it's invalid/expired)
    // Don't redirect if we're already on login page
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : ''
    const hasToken = getAuthToken() !== null
    
    if (hasToken && !currentPath.includes('/login')) {
      console.warn('Invalid token detected, clearing and redirecting to login')
      localStorage.removeItem('user')
      // Use setTimeout to avoid navigation during render
      setTimeout(() => {
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
      }, 100)
    }
    
    throw new Error(errorMessage)
  }

  // Handle permission errors (403) - don't redirect, just throw error
  // 403 means user is authenticated but doesn't have permission
  if (response.status === 403) {
    const errorMessage = data.message || data.error || 'Access denied. You don\'t have permission to perform this action.'
    console.warn('Permission denied:', errorMessage)
    // Don't redirect to login - user is authenticated, just lacks permission
    throw new Error(errorMessage)
  }

  if (!response.ok) {
    const errorMessage = data?.message || data?.error || `Request failed with status ${response.status}`
    const error = new Error(errorMessage) as any
    error.status = response.status
    error.data = data
    throw error
  }

  // Cache successful GET requests for offline viewing
  if (method === 'GET' && response.ok) {
    // Cache with longer expiry for critical data
    const isCriticalData = endpoint.includes('/customers') || 
                         endpoint.includes('/services') || 
                         endpoint.includes('/discounts') || 
                         endpoint.includes('/stations')
    const expiry = isCriticalData ? 60 * 60 * 1000 : 5 * 60 * 1000 // 1 hour for critical, 5 min for others
    cacheManager.set(cacheKey, data, expiry)
    
    // Also cache generic endpoint (without query params) for critical data
    if (isCriticalData && endpoint.includes('?')) {
      const genericKey = `api_${endpoint.split('?')[0].replace(/\//g, '_')}`
      cacheManager.set(genericKey, data, expiry)
    }
  }

  // Check if response indicates failure
  if (data.success === false) {
    throw new Error(data.message || data.error || 'Request failed')
  }

  return data
}

// Customer API functions
export const customerAPI = {
  getAll: async (params?: { search?: string; sortBy?: string; showArchived?: boolean }) => {
    const queryParams = new URLSearchParams()
    if (params?.search) queryParams.append('search', params.search)
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy)
    if (params?.showArchived !== undefined) queryParams.append('showArchived', params.showArchived.toString())
    const query = queryParams.toString()
    const endpoint = `/customers${query ? `?${query}` : ''}`
    try {
      const response = await apiRequest(endpoint)
      // Handle both response formats: { success: true, data: [...] } or direct array
      if (response && response.data) {
    return response.data
      }
      // If response is already an array (from cache), return it
      if (Array.isArray(response)) {
        return response
      }
      return response
    } catch (error: any) {
      // If offline and error, try to get from cache directly
      if (!navigator.onLine || error.message?.includes('No internet connection')) {
        const { cacheManager } = await import('./cacheManager')
        const cached = cacheManager.get('api_customers') || cacheManager.get('api_/customers')
        if (cached) {
          console.log('[Fallback] Using cached customers data')
          return Array.isArray(cached) ? cached : ((cached as any)?.data || cached)
        }
      }
      throw error
    }
  },

  // Global customer search across all branches (used for cross-branch tracking)
  globalSearch: async (search: string) => {
    const query = new URLSearchParams()
    if (search) query.append('search', search)
    const endpoint = `/customers/global/search?${query.toString()}`
    const response = await apiRequest(endpoint)
    return response.data ?? response
  },

  getById: async (id: string) => {
    const response = await apiRequest(`/customers/${id}`)
    return response.data
  },

  create: async (customerData: { name: string; email?: string; phone: string; address?: string; stationId?: string }) => {
    const response = await apiRequest('/customers', {
      method: 'POST',
      body: JSON.stringify(customerData),
    })
    return response.data
  },

  update: async (id: string, customerData: Partial<{ name: string; email: string; phone: string; address: string }>) => {
    const response = await apiRequest(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(customerData),
    })
    return response.data
  },

  archive: async (id: string) => {
    const response = await apiRequest(`/customers/${id}/archive`, {
      method: 'PUT',
    })
    return response.data
  },

  unarchive: async (id: string) => {
    const response = await apiRequest(`/customers/${id}/unarchive`, {
      method: 'PUT',
    })
    return response.data
  },

  delete: async (id: string) => {
    const response = await apiRequest(`/customers/${id}`, {
      method: 'DELETE',
    })
    return response.data
  },
}

// Dashboard API functions
export const dashboardAPI = {
  getStats: async (timeRange: string = 'today') => {
    try {
      const response = await apiRequest(`/dashboard/stats?timeRange=${timeRange}`)
      // Backend returns { success: true, data: {...} }
      if (response.success && response.data) {
        return response.data
      }
      // If data is directly returned
      if (response.stats || response.orderStatus) {
        return response
      }
      throw new Error('Invalid response format from server')
    } catch (error: any) {
      console.error('Dashboard API error:', error)
      throw error
    }
  },
}

// Notification API functions
export const notificationAPI = {
  getAll: async (unreadOnly: boolean = false) => {
    const response = await apiRequest(`/notifications?unreadOnly=${unreadOnly}`)
    return response.data
  },

  markAsRead: async (notificationId: string) => {
    const response = await apiRequest(`/notifications/${notificationId}/read`, {
      method: 'PUT',
    })
    return response.data
  },

  markAllAsRead: async () => {
    const response = await apiRequest('/notifications/read-all', {
      method: 'PUT',
    })
    return response.data
  },
}

// Order API functions
export const orderAPI = {
  getAll: async (params?: { search?: string; payment?: string; showArchived?: boolean; showDrafts?: boolean }) => {
    const queryParams = new URLSearchParams()
    if (params?.search) queryParams.append('search', params.search)
    if (params?.payment) queryParams.append('payment', params.payment)
    if (params?.showArchived !== undefined) queryParams.append('showArchived', params.showArchived.toString())
    if (params?.showDrafts !== undefined) queryParams.append('showDrafts', params.showDrafts.toString())
    const query = queryParams.toString()
    const response = await apiRequest(`/orders${query ? `?${query}` : ''}`)
    return response.data
  },

  getById: async (id: string) => {
    // Encode the ID to handle special characters like #
    const encodedId = encodeURIComponent(id)
    const response = await apiRequest(`/orders/${encodedId}`)
    return response.data
  },

  create: async (orderData: any) => {
    const response = await apiRequest('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    })
    return response.data
  },

  saveDraft: async (draftData: any) => {
    const response = await apiRequest('/orders/draft', {
      method: 'POST',
      body: JSON.stringify(draftData),
    })
    return response.data
  },

  update: async (id: string, orderData: any) => {
    // Encode the ID to handle special characters like #
    const encodedId = encodeURIComponent(id)
    const response = await apiRequest(`/orders/${encodedId}`, {
      method: 'PUT',
      body: JSON.stringify(orderData),
    })
    // Backend returns either { success: true, order: {...} } or { success: true, data: {...} }
    return response.order || response.data || response
  },

  archive: async (id: string) => {
    // Encode the ID to handle special characters like #
    const encodedId = encodeURIComponent(id)
    const response = await apiRequest(`/orders/${encodedId}/archive`, {
      method: 'PUT',
    })
    return response.data
  },

  unarchive: async (id: string) => {
    // Encode the ID to handle special characters like #
    const encodedId = encodeURIComponent(id)
    const response = await apiRequest(`/orders/${encodedId}/unarchive`, {
      method: 'PUT',
    })
    return response.data
  },

  delete: async (id: string) => {
    // Encode the ID to handle special characters like #
    const encodedId = encodeURIComponent(id)
    const response = await apiRequest(`/orders/${encodedId}`, {
      method: 'DELETE',
    })
    return response.data
  },

  markDraftAsCompleted: async (id: string) => {
    const encodedId = encodeURIComponent(id)
    const response = await apiRequest(`/orders/${encodedId}/mark-completed`, {
      method: 'PUT',
    })
    return response.data
  },

  scheduleDraftDeletion: async (id: string) => {
    const encodedId = encodeURIComponent(id)
    const response = await apiRequest(`/orders/${encodedId}/schedule-deletion`, {
      method: 'PUT',
    })
    return response.data
  },

  // Edit lock management
  acquireEditLock: async (id: string) => {
    const encodedId = encodeURIComponent(id)
    const response = await apiRequest(`/orders/${encodedId}/lock`, {
      method: 'POST',
    })
    return response
  },

  releaseEditLock: async (id: string) => {
    const encodedId = encodeURIComponent(id)
    const response = await apiRequest(`/orders/${encodedId}/lock`, {
      method: 'DELETE',
    })
    return response
  },

  checkEditLock: async (id: string) => {
    const encodedId = encodeURIComponent(id)
    const response = await apiRequest(`/orders/${encodedId}/lock`)
    return response
  },
}

// Service API functions
export const serviceAPI = {
  getAll: async (params?: { search?: string; category?: string; showArchived?: boolean }) => {
    const queryParams = new URLSearchParams()
    if (params?.search) queryParams.append('search', params.search)
    if (params?.category) queryParams.append('category', params.category)
    if (params?.showArchived !== undefined) queryParams.append('showArchived', params.showArchived.toString())
    const query = queryParams.toString()
    const endpoint = `/services${query ? `?${query}` : ''}`
    try {
      const response = await apiRequest(endpoint)
      if (response && response.data) {
    return response.data
      }
      if (Array.isArray(response)) {
        return response
      }
      return response
    } catch (error: any) {
      if (!navigator.onLine || error.message?.includes('No internet connection')) {
        const { cacheManager } = await import('./cacheManager')
        const cached = cacheManager.get('api_services') || cacheManager.get('api_/services')
        if (cached) {
          console.log('[Fallback] Using cached services data')
          return Array.isArray(cached) ? cached : ((cached as any)?.data || cached)
        }
      }
      throw error
    }
  },

  getById: async (id: string) => {
    const response = await apiRequest(`/services/${id}`)
    return response.data
  },

  create: async (serviceData: any) => {
    const response = await apiRequest('/services', {
      method: 'POST',
      body: JSON.stringify(serviceData),
    })
    return response.data
  },

  update: async (id: string, serviceData: any) => {
    const response = await apiRequest(`/services/${id}`, {
      method: 'PUT',
      body: JSON.stringify(serviceData),
    })
    return response.data
  },

  archive: async (id: string) => {
    const response = await apiRequest(`/services/${id}/archive`, {
      method: 'PUT',
    })
    return response.data
  },

  unarchive: async (id: string) => {
    const response = await apiRequest(`/services/${id}/unarchive`, {
      method: 'PUT',
    })
    return response.data
  },

  delete: async (id: string) => {
    const response = await apiRequest(`/services/${id}`, {
      method: 'DELETE',
    })
    return response.data
  },
}

// Discount API functions
export const discountAPI = {
  getAll: async (params?: { search?: string; showArchived?: boolean }) => {
    const queryParams = new URLSearchParams()
    if (params?.search) queryParams.append('search', params.search)
    if (params?.showArchived !== undefined) queryParams.append('showArchived', params.showArchived.toString())
    const query = queryParams.toString()
    const endpoint = `/discounts${query ? `?${query}` : ''}`
    try {
      const response = await apiRequest(endpoint)
      if (response && response.data) {
    return response.data
      }
      if (Array.isArray(response)) {
        return response
      }
      return response
    } catch (error: any) {
      if (!navigator.onLine || error.message?.includes('No internet connection')) {
        const { cacheManager } = await import('./cacheManager')
        const cached = cacheManager.get('api_discounts') || cacheManager.get('api_/discounts')
        if (cached) {
          console.log('[Fallback] Using cached discounts data')
          return Array.isArray(cached) ? cached : ((cached as any)?.data || cached)
        }
      }
      throw error
    }
  },

  getById: async (id: string) => {
    const response = await apiRequest(`/discounts/${id}`)
    return response.data
  },

  create: async (discountData: any) => {
    const response = await apiRequest('/discounts', {
      method: 'POST',
      body: JSON.stringify(discountData),
    })
    return response.data
  },

  update: async (id: string, discountData: any) => {
    const response = await apiRequest(`/discounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(discountData),
    })
    return response.data
  },

  archive: async (id: string) => {
    const response = await apiRequest(`/discounts/${id}/archive`, {
      method: 'PUT',
    })
    return response.data
  },

  unarchive: async (id: string) => {
    const response = await apiRequest(`/discounts/${id}/unarchive`, {
      method: 'PUT',
    })
    return response.data
  },

  resetUsage: async (id: string) => {
    const response = await apiRequest(`/discounts/${id}/reset-usage`, {
      method: 'PUT',
    })
    return response.data
  },

  delete: async (id: string) => {
    const response = await apiRequest(`/discounts/${id}`, {
      method: 'DELETE',
    })
    return response.data
  },
}

// Voucher API functions
export const voucherAPI = {
  getAll: async (params?: { search?: string; isActive?: boolean; isMonthly?: boolean; showArchived?: boolean }) => {
    const queryParams = new URLSearchParams()
    if (params?.search) queryParams.append('search', params.search)
    if (params?.isActive !== undefined) queryParams.append('isActive', params.isActive.toString())
    if (params?.isMonthly !== undefined) queryParams.append('isMonthly', params.isMonthly.toString())
    if (params?.showArchived !== undefined) queryParams.append('showArchived', params.showArchived.toString())
    const query = queryParams.toString()
    const endpoint = `/vouchers${query ? `?${query}` : ''}`
    try {
      const response = await apiRequest(endpoint)
      if (response && response.data) {
        return response.data
      }
      if (Array.isArray(response)) {
        return response
      }
      return response
    } catch (error: any) {
      if (!navigator.onLine || error.message?.includes('No internet connection')) {
        const { cacheManager } = await import('./cacheManager')
        const cached = cacheManager.get('api_vouchers') || cacheManager.get('api_/vouchers')
        if (cached) {
          console.log('[Fallback] Using cached vouchers data')
          return Array.isArray(cached) ? cached : ((cached as any)?.data || cached)
        }
      }
      throw error
    }
  },

  getById: async (id: string) => {
    const response = await apiRequest(`/vouchers/${id}`)
    return response.data
  },

  checkCustomerVoucher: async (customerId: string) => {
    const response = await apiRequest(`/vouchers/customer/${customerId}/available`)
    return response.data
  },

  create: async (voucherData: any) => {
    const response = await apiRequest('/vouchers', {
      method: 'POST',
      body: JSON.stringify(voucherData),
    })
    return response.data
  },

  update: async (id: string, voucherData: any) => {
    const response = await apiRequest(`/vouchers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(voucherData),
    })
    return response.data
  },

  archive: async (id: string) => {
    const response = await apiRequest(`/vouchers/${id}/archive`, {
      method: 'PUT',
    })
    return response.data
  },

  unarchive: async (id: string) => {
    const response = await apiRequest(`/vouchers/${id}/unarchive`, {
      method: 'PUT',
    })
    return response.data
  },

  delete: async (id: string) => {
    const response = await apiRequest(`/vouchers/${id}`, {
      method: 'DELETE',
    })
    return response.data
  },
}

// Expense API functions
export const expenseAPI = {
  getAll: async (params?: { search?: string; category?: string; status?: string; showArchived?: boolean }) => {
    const queryParams = new URLSearchParams()
    if (params?.search) queryParams.append('search', params.search)
    if (params?.category) queryParams.append('category', params.category)
    if (params?.status) queryParams.append('status', params.status)
    if (params?.showArchived !== undefined) queryParams.append('showArchived', params.showArchived.toString())
    const query = queryParams.toString()
    const response = await apiRequest(`/expenses${query ? `?${query}` : ''}`)
    return response.data
  },

  getById: async (id: string) => {
    const response = await apiRequest(`/expenses/${id}`)
    return response.data
  },

  create: async (expenseData: any) => {
    const response = await apiRequest('/expenses', {
      method: 'POST',
      body: JSON.stringify(expenseData),
    })
    return response.data
  },

  update: async (id: string, expenseData: any) => {
    const response = await apiRequest(`/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(expenseData),
    })
    return response.data
  },

  reject: async (id: string, data?: { rejectionReason?: string; adminFeedback?: string }) => {
    const response = await apiRequest(`/expenses/${id}/reject`, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
    return response.data
  },

  addFeedback: async (id: string, feedback: string) => {
    const response = await apiRequest(`/expenses/${id}/feedback`, {
      method: 'PUT',
      body: JSON.stringify({ adminFeedback: feedback }),
    })
    return response.data
  },

  approve: async (id: string, data?: { adminFeedback?: string }) => {
    const response = await apiRequest(`/expenses/${id}/approve`, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
    return response.data
  },

  archive: async (id: string) => {
    const response = await apiRequest(`/expenses/${id}/archive`, {
      method: 'PUT',
    })
    return response.data
  },

  unarchive: async (id: string) => {
    const response = await apiRequest(`/expenses/${id}/unarchive`, {
      method: 'PUT',
    })
    return response.data
  },

  delete: async (id: string) => {
    const response = await apiRequest(`/expenses/${id}`, {
      method: 'DELETE',
    })
    return response.data
  },
}

// Employee API functions
export const employeeAPI = {
  getAll: async (params?: { search?: string; status?: string; showArchived?: boolean }) => {
    const queryParams = new URLSearchParams()
    if (params?.search) queryParams.append('search', params.search)
    if (params?.status) queryParams.append('status', params.status)
    if (params?.showArchived !== undefined) queryParams.append('showArchived', params.showArchived.toString())
    const query = queryParams.toString()
    const response = await apiRequest(`/employees${query ? `?${query}` : ''}`)
    return response.data
  },

  getById: async (id: string) => {
    const response = await apiRequest(`/employees/${id}`)
    return response.data
  },

  getPerformance: async (id: string) => {
    const response = await apiRequest(`/employees/${id}/performance`)
    return response.data
  },

  create: async (employeeData: any) => {
    const response = await apiRequest('/employees', {
      method: 'POST',
      body: JSON.stringify(employeeData),
    })
    return response.data
  },

  update: async (id: string, employeeData: any) => {
    const response = await apiRequest(`/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(employeeData),
    })
    return response.data
  },

  archive: async (id: string) => {
    const response = await apiRequest(`/employees/${id}/archive`, {
      method: 'PUT',
    })
    return response.data
  },

  unarchive: async (id: string) => {
    const response = await apiRequest(`/employees/${id}/unarchive`, {
      method: 'PUT',
    })
    return response.data
  },

  toggleAccountStatus: async (id: string, isActive: boolean) => {
    const response = await apiRequest(`/employees/${id}/toggle-account`, {
      method: 'PUT',
      body: JSON.stringify({ isActive }),
    })
    return response.data
  },

  delete: async (id: string) => {
    const response = await apiRequest(`/employees/${id}`, {
      method: 'DELETE',
    })
    return response.data
  },
}

// Station API functions
export const stationAPI = {
  getAll: async (params?: { showArchived?: boolean }) => {
    const queryParams = new URLSearchParams()
    if (params?.showArchived !== undefined) queryParams.append('showArchived', params.showArchived.toString())
    const query = queryParams.toString()
    const endpoint = `/stations${query ? `?${query}` : ''}`
    try {
      const response = await apiRequest(endpoint)
      if (response && response.data) {
    return response.data
      }
      if (Array.isArray(response)) {
        return response
      }
      return response
    } catch (error: any) {
      if (!navigator.onLine || error.message?.includes('No internet connection')) {
        const { cacheManager } = await import('./cacheManager')
        const cached = cacheManager.get('api_stations') || cacheManager.get('api_/stations')
        if (cached) {
          console.log('[Fallback] Using cached stations data')
          return Array.isArray(cached) ? cached : ((cached as any)?.data || cached)
        }
      }
      throw error
    }
  },

  getById: async (id: string) => {
    const response = await apiRequest(`/stations/${id}`)
    return response.data
  },

  create: async (stationData: any) => {
    const response = await apiRequest('/stations', {
      method: 'POST',
      body: JSON.stringify(stationData),
    })
    return response.data
  },

  update: async (id: string, stationData: any) => {
    const response = await apiRequest(`/stations/${id}`, {
      method: 'PUT',
      body: JSON.stringify(stationData),
    })
    return response.data
  },

  archive: async (id: string) => {
    const response = await apiRequest(`/stations/${id}/archive`, {
      method: 'PUT',
    })
    return response.data
  },

  unarchive: async (id: string) => {
    const response = await apiRequest(`/stations/${id}/unarchive`, {
      method: 'PUT',
    })
    return response.data
  },

  delete: async (id: string) => {
    const response = await apiRequest(`/stations/${id}`, {
      method: 'DELETE',
    })
    return response.data
  },
}

// Report API
export const reportAPI = {
  generate: async (reportType: string, dateFrom: string, dateTo: string) => {
    const endpoint = `/reports/${reportType}`
    const response = await apiRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify({ dateFrom, dateTo }),
    })
    return response.data
  },
}

export const supportAPI = {
  submitFeedback: async (
    payload: {
      title: string
      description: string
      feedbackType?: string
      reporterEmail?: string
      reporterPhone?: string
      recipientEmail?: string
      recipientPhone?: string
      submittedAt?: string
    } & Record<string, any>
  ) => {
    try {
      const response = await apiRequest('/support/feedback', {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      return response
    } catch (error: any) {
      console.error('Support API error:', error)
      throw error
    }
  },
}

// Auth API functions
export const authAPI = {
  getCurrentUser: async () => {
    const response = await apiRequest('/auth/me')
    return response.data
  },

  updateProfile: async (profileData: { username?: string; email?: string }) => {
    const response = await apiRequest('/auth/me', {
      method: 'PUT',
      body: JSON.stringify(profileData),
    })
    return response.data
  },

  changePassword: async (passwordData: { currentPassword: string; newPassword: string }) => {
    const response = await apiRequest('/auth/change-password', {
      method: 'PUT',
      body: JSON.stringify(passwordData),
    })
    return response.data
  },

  sendVerificationCode: async (emailData: { email: string }) => {
    const response = await apiRequest('/auth/send-verification-code', {
      method: 'POST',
      body: JSON.stringify(emailData),
    })
    return response.data
  },

  verifyEmailCode: async (verificationData: { email: string; code: string }) => {
    const response = await apiRequest('/auth/verify-email-code', {
      method: 'POST',
      body: JSON.stringify(verificationData),
    })
    return response.data
  },

  forgotPassword: async (emailData: { email: string }) => {
    const response = await apiRequest('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify(emailData),
    })
    return response
  },

  verifyResetCode: async (verificationData: { email: string; code: string }) => {
    const response = await apiRequest('/auth/verify-reset-code', {
      method: 'POST',
      body: JSON.stringify(verificationData),
    })
    return response
  },

  resetPassword: async (resetData: { email: string; code: string; newPassword: string }) => {
    const response = await apiRequest('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify(resetData),
    })
    return response
  },

  logout: async () => {
    try {
      const response = await apiRequest('/auth/logout', {
        method: 'POST',
      })
      return response
    } catch (error: any) {
      // Even if API call fails, we should still logout locally
      console.error('Logout API error:', error)
      throw error
    }
  },
}

export const settingsAPI = {
  getInactivitySettings: async () => {
    const response = await apiRequest('/system-settings/inactivity')
    return response.data
  },

  updateInactivitySettings: async (settings: {
    enabled: boolean
    timeoutMinutes: number
    warningSeconds?: number
    role?: 'admin' | 'staff'
  }) => {
    const response = await apiRequest('/system-settings/inactivity', {
      method: 'PUT',
      body: JSON.stringify(settings),
    })
    return response.data
  },

  // Loyalty / points settings
  getPointsSettings: async () => {
    const response = await apiRequest('/system-settings/points')
    return response.data
  },

  updatePointsSettings: async (settings: {
    enabled: boolean
    pesoToPointMultiplier: number
  }) => {
    const response = await apiRequest('/system-settings/points', {
      method: 'PUT',
      body: JSON.stringify(settings),
    })
    return response.data
  },
}

// Backup API
export const backupAPI = {
  create: async (name?: string) => {
    // Use a longer timeout for backup creation (5 minutes) since mongodump can take time
    const response = await apiRequest('/backups', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }, 300000) // 5 minutes timeout
    return response.data
  },

  list: async () => {
    const response = await apiRequest('/backups')
    // apiRequest returns: { success: true, count: number, data: Backup[] }
    // Return the whole response so component can access both data and count
    return response
  },

  getStats: async () => {
    const response = await apiRequest('/backups/stats')
    // apiRequest returns: { success: true, data: BackupStats }
    // Return the whole response so component can access data
    return response
  },

  restore: async (backupName: string, dropExisting: boolean = false) => {
    const response = await apiRequest(`/backups/${backupName}/restore`, {
      method: 'POST',
      body: JSON.stringify({ confirm: true, dropExisting }),
    })
    return response.data
  },

  delete: async (backupName: string) => {
    const response = await apiRequest(`/backups/${backupName}`, {
      method: 'DELETE',
    })
    return response.data
  },

  cleanup: async () => {
    const response = await apiRequest('/backups/cleanup', {
      method: 'POST',
    })
    return response.data
  },
}

// RBAC API
export const rbacAPI = {
  getAllRolePermissions: async () => {
    try {
      const response = await apiRequest('/rbac')
      return response.data || response
    } catch (error: any) {
      console.error('RBAC API error:', error)
      throw error
    }
  },

  getRolePermission: async (role: string) => {
    try {
      const response = await apiRequest(`/rbac/${role}`)
      return response.data || response
    } catch (error: any) {
      console.error('RBAC API error:', error)
      throw error
    }
  },

  updateRolePermission: async (role: string, permissions: any[]) => {
    try {
      const response = await apiRequest(`/rbac/${role}`, {
        method: 'PUT',
        body: JSON.stringify({ permissions }),
      })
      return response.data || response
    } catch (error: any) {
      console.error('RBAC API error:', error)
      throw error
    }
  },

  resetRolePermission: async (role: string) => {
    try {
      const response = await apiRequest(`/rbac/${role}/reset`, {
        method: 'PUT',
      })
      return response.data || response
    } catch (error: any) {
      console.error('RBAC API error:', error)
      throw error
    }
  },

  getAvailableResources: async () => {
    try {
      const response = await apiRequest('/rbac/resources')
      return response.data || response
    } catch (error: any) {
      console.error('RBAC API error:', error)
      throw error
    }
  },

  initializeRBAC: async () => {
    try {
      const response = await apiRequest('/rbac/initialize', {
        method: 'POST',
      })
      return response.data || response
    } catch (error: any) {
      console.error('RBAC API error:', error)
      throw error
    }
  },
}

// Audit Log API
export const auditLogAPI = {
  list: async (params?: {
    type?: string
    action?: string
    userId?: string
    resource?: string
    resourceId?: string
    startDate?: string
    endDate?: string
    page?: number
    limit?: number
  }) => {
    const queryParams = new URLSearchParams()
    if (params?.type) queryParams.append('type', params.type)
    if (params?.action) queryParams.append('action', params.action)
    if (params?.userId) queryParams.append('userId', params.userId)
    if (params?.resource) queryParams.append('resource', params.resource)
    if (params?.resourceId) queryParams.append('resourceId', params.resourceId)
    if (params?.startDate) queryParams.append('startDate', params.startDate)
    if (params?.endDate) queryParams.append('endDate', params.endDate)
    if (params?.page) queryParams.append('page', params.page.toString())
    if (params?.limit) queryParams.append('limit', params.limit.toString())
    
    const query = queryParams.toString()
    const endpoint = `/audit-logs${query ? `?${query}` : ''}`
    const response = await apiRequest(endpoint)
    // Response structure: { success: true, count: number, data: AuditLog[], pagination: {...} }
    return response
  },

  getStats: async (startDate?: string, endDate?: string) => {
    const queryParams = new URLSearchParams()
    if (startDate) queryParams.append('startDate', startDate)
    if (endDate) queryParams.append('endDate', endDate)
    
    const query = queryParams.toString()
    const endpoint = `/audit-logs/stats${query ? `?${query}` : ''}`
    const response = await apiRequest(endpoint)
    // Response structure: { success: true, data: AuditLogStats }
    return response
  },

  getById: async (id: string) => {
    const response = await apiRequest(`/audit-logs/${id}`)
    return response.data
  },
}

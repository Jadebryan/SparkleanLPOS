// Centralized API utility for Staff app
// Handles authentication, error handling, and offline support

import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { API_BASE_URL } from '@/constants/api';
import { offlineQueue } from './offlineQueue';
import { cacheManager } from './cacheManager';

// Check if request should be queued for offline
const shouldQueueOffline = (method: string): boolean => {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method.toUpperCase());
};

// Get auth token from storage (exported for use in offlineQueue)
export const getAuthToken = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem('token') || await AsyncStorage.getItem('userToken');
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
};

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  async (config) => {
    const token = await getAuthToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Handle 401 unauthorized - redirect to login
    if (error.response?.status === 401) {
      try {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('userToken');
        await AsyncStorage.removeItem('user');
      } catch (e) {
        console.error('Error clearing auth data:', e);
      }
    }
    return Promise.reject(error);
  }
);

// Main API request function
export const apiRequest = async <T = any>(
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  endpoint: string,
  data?: any,
  options?: AxiosRequestConfig
): Promise<T> => {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const isGetRequest = method === 'GET';

  try {
    // Make the request
    const config: AxiosRequestConfig = {
      method,
      url,
      ...options,
    };

    if (data && !isGetRequest) {
      config.data = data;
    }

    const response: AxiosResponse<T> = await apiClient.request<T>(config);

    // Cache successful GET responses
    if (isGetRequest && response.data) {
      await cacheManager.set(url, response.data);
    }

    // Handle different response formats
    if (response.data && typeof response.data === 'object') {
      const responseData = response.data as any;
      if (responseData.success !== undefined) {
        return responseData.success ? (responseData.data || responseData) : Promise.reject(new Error(responseData.message || 'Request failed'));
      }
    }

    return response.data;
  } catch (error: any) {
    // Handle network errors - queue mutations if offline
    if (!error.response && error.request && shouldQueueOffline(method)) {
      console.log('📥 Network error detected, queuing request:', method, url);
      await offlineQueue.enqueue({
        method,
        url,
        data,
        timestamp: Date.now(),
      });
      throw new Error('Request queued. Will sync when online.');
    }

    // Handle axios errors
    if (error.response) {
      const errorMessage = error.response.data?.message || error.response.data?.error || error.message || 'Request failed';
      throw new Error(errorMessage);
    } else if (error.request) {
      // For GET requests, try to return cached data if available
      if (isGetRequest) {
        const cached = await cacheManager.get<T>(url);
        if (cached) {
          console.log('📦 Network error, returning cached data:', url);
          return cached;
        }
      }
      throw new Error('Network error. Please check your connection.');
    } else {
      throw error;
    }
  }
};

// Convenience methods
export const api = {
  get: <T = any>(endpoint: string, options?: AxiosRequestConfig) => 
    apiRequest<T>('GET', endpoint, undefined, options),
  
  post: <T = any>(endpoint: string, data?: any, options?: AxiosRequestConfig) => 
    apiRequest<T>('POST', endpoint, data, options),
  
  put: <T = any>(endpoint: string, data?: any, options?: AxiosRequestConfig) => 
    apiRequest<T>('PUT', endpoint, data, options),
  
  patch: <T = any>(endpoint: string, data?: any, options?: AxiosRequestConfig) => 
    apiRequest<T>('PATCH', endpoint, data, options),
  
  delete: <T = any>(endpoint: string, options?: AxiosRequestConfig) => 
    apiRequest<T>('DELETE', endpoint, undefined, options),
};

// Export for external use
export default api;

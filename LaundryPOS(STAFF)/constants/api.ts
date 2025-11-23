// API Configuration
// Use env var if provided; otherwise try to auto-detect your LAN IP when running in Expo Go.
import Constants from 'expo-constants';
import { Platform } from 'react-native';

function resolveLanBaseUrl(defaultPort: number = 5000): string {
  // If running on web, localhost should work
  if (Platform.OS === 'web') {
    return `http://localhost:${defaultPort}/api`;
  }
  
  try {
    // Newer Expo: expoConfig.hostUri; Older: manifest.debuggerHost
    // Values look like: "192.168.1.10:8081" or "192.168.1.10:19000"
    const hostUri = (Constants as any).expoConfig?.hostUri || (Constants as any).manifest?.debuggerHost || '';
    const host = typeof hostUri === 'string' ? hostUri.split(':')[0] : '';
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:${defaultPort}/api`;
    }
  } catch (error) {
    console.warn('Failed to auto-detect LAN IP:', error);
  }
  
  // For mobile devices/emulators, localhost won't work - need actual IP
  // Log a warning to help developers
  if (Platform.OS !== 'web') {
    console.warn('⚠️ Using localhost - this may not work on physical devices or emulators.');
    console.warn('💡 Set EXPO_PUBLIC_API_URL in .env file with your computer\'s IP address.');
    console.warn('   Example: EXPO_PUBLIC_API_URL=http://192.168.1.100:5000/api');
  }
  
  return `http://localhost:${defaultPort}/api`;
}

export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL as string) || resolveLanBaseUrl(5000);

// Log the API URL being used (helpful for debugging)
console.log('🔗 API Base URL:', API_BASE_URL);



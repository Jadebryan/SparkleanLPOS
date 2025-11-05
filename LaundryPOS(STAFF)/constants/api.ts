// API Configuration
// Use env var if provided; otherwise try to auto-detect your LAN IP when running in Expo Go.
import Constants from 'expo-constants';

function resolveLanBaseUrl(defaultPort: number = 5000): string {
  try {
    // Newer Expo: expoConfig.hostUri; Older: manifest.debuggerHost
    // Values look like: "192.168.1.10:8081" or "192.168.1.10:19000"
    const hostUri = (Constants as any).expoConfig?.hostUri || (Constants as any).manifest?.debuggerHost || '';
    const host = typeof hostUri === 'string' ? hostUri.split(':')[0] : '';
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      return `http://${host}:${defaultPort}/api`;
    }
  } catch {}
  return `http://localhost:${defaultPort}/api`;
}

export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL as string) || resolveLanBaseUrl(5000);



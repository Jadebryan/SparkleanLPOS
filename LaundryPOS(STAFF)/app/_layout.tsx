import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useEffect } from 'react';
import { Text, TextInput, Platform, View } from 'react-native';
import { useFonts, Poppins_400Regular, Poppins_500Medium, Poppins_600SemiBold, Poppins_700Bold } from '@expo-google-fonts/poppins';
import { offlineQueue } from '@/utils/offlineQueue';
import { cacheManager } from '@/utils/cacheManager';
import OfflineIndicator from './components/OfflineIndicator';
import ErrorBoundary from './components/ErrorBoundary';
import { ToastProvider } from './context/ToastContext';
import { ColorPaletteProvider } from './context/ColorPaletteContext';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      // Set default font for all Text components
      if (Text.defaultProps == null) Text.defaultProps = {} as any;
      const defaults: any = Text.defaultProps;
      defaults.style = [{ fontFamily: 'Poppins_400Regular' }, defaults.style].filter(Boolean);

      // Set default font for all TextInput components
      if (TextInput.defaultProps == null) TextInput.defaultProps = {} as any;
      const tiDefaults: any = TextInput.defaultProps;
      tiDefaults.style = [{ fontFamily: 'Poppins_400Regular' }, tiDefaults.style].filter(Boolean);

      // Ensure web also uses Poppins at the DOM level
      if (Platform.OS === 'web' && typeof document !== 'undefined') {
        try {
          document.body.style.fontFamily = 'Poppins_400Regular, Poppins, sans-serif';
        } catch {}
      }
    }
  }, [fontsLoaded]);

  // Initialize offline support
  useEffect(() => {
    const initOfflineSupport = async () => {
      try {
        // Load offline queue
        await offlineQueue.load();
        
        // Initialize cache manager
        await cacheManager.preloadCriticalData();
        
        // Try to sync queue if online
        if (typeof navigator !== 'undefined' && navigator.onLine) {
          await offlineQueue.sync();
        }
      } catch (error) {
        console.error('Error initializing offline support:', error);
      }
    };

    initOfflineSupport();
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <ErrorBoundary>
        <ToastProvider>
          <ColorPaletteProvider>
            <View style={{ flex: 1 }}>
              <Stack screenOptions={{ headerShown: false, animation: 'none' }} />
              <OfflineIndicator />
              <StatusBar style="auto" />
            </View>
          </ColorPaletteProvider>
        </ToastProvider>
      </ErrorBoundary>
    </ThemeProvider>
  );
}

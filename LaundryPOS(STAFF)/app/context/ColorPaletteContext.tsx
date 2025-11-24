/**
 * Color Palette Context for Staff App
 * Provides the active color palette to components
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ColorPalette, getDefaultPalette, getPaletteById, getColorPalettePreference } from '@/utils/colorPalette';

interface ColorPaletteContextType {
  activePalette: ColorPalette;
  setActivePalette: (paletteId: string) => Promise<void>;
}

const ColorPaletteContext = createContext<ColorPaletteContextType | undefined>(undefined);

export const ColorPaletteProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activePalette, setActivePaletteState] = useState<ColorPalette>(getDefaultPalette());

  useEffect(() => {
    loadPalette();
  }, []);

  const loadPalette = async () => {
    try {
      const paletteId = await getColorPalettePreference();
      const palette = await getPaletteById(paletteId);
      setActivePaletteState(palette);
    } catch (error) {
      console.error('Error loading color palette:', error);
    }
  };

  const setActivePalette = async (paletteId: string) => {
    try {
      const palette = await getPaletteById(paletteId);
      setActivePaletteState(palette);
      await AsyncStorage.setItem('colorPalette', paletteId);
      await AsyncStorage.setItem('activeColorPalette', JSON.stringify(palette));
    } catch (error) {
      console.error('Error setting color palette:', error);
    }
  };

  return (
    <ColorPaletteContext.Provider value={{ activePalette, setActivePalette }}>
      {children}
    </ColorPaletteContext.Provider>
  );
};

export const useColorPalette = () => {
  const context = useContext(ColorPaletteContext);
  if (!context) {
    // Return default values if context is not available
    return {
      activePalette: getDefaultPalette(),
      setActivePalette: async (paletteId: string) => {
        const palette = await getPaletteById(paletteId);
        await AsyncStorage.setItem('colorPalette', paletteId);
        await AsyncStorage.setItem('activeColorPalette', JSON.stringify(palette));
      },
    };
  }
  return context;
};

// Default export for Expo Router compatibility
export default ColorPaletteProvider;


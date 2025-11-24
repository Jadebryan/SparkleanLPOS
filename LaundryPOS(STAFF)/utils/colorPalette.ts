/**
 * Color Palette System for Staff App
 * Allows users to choose different color themes
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ColorPalette {
  id: string;
  name: string;
  description: string;
  primary: {
    500: string;
    600: string;
    400: string;
    50: string;
  };
  accent: {
    500: string;
    600: string;
    400: string;
    50: string;
  };
  preview: string[]; // Preview colors for display
}

export const colorPalettes: ColorPalette[] = [
  {
    id: 'default',
    name: 'Sparklean Blue & Orange',
    description: 'The classic Sparklean brand colors',
    primary: {
      500: '#2563EB',
      600: '#1D4ED8',
      400: '#3B82F6',
      50: '#EFF6FF',
    },
    accent: {
      500: '#F97316',
      600: '#EA580C',
      400: '#FB923C',
      50: '#FFF7ED',
    },
    preview: ['#2563EB', '#F97316'],
  },
  {
    id: 'ocean',
    name: 'Ocean Breeze',
    description: 'Cool blues and teals for a calm workspace',
    primary: {
      500: '#0891B2',
      600: '#0E7490',
      400: '#06B6D4',
      50: '#CFFAFE',
    },
    accent: {
      500: '#14B8A6',
      600: '#0D9488',
      400: '#2DD4BF',
      50: '#CCFBF1',
    },
    preview: ['#0891B2', '#14B8A6'],
  },
  {
    id: 'forest',
    name: 'Forest Green',
    description: 'Natural greens for a fresh feel',
    primary: {
      500: '#059669',
      600: '#047857',
      400: '#10B981',
      50: '#D1FAE5',
    },
    accent: {
      500: '#F59E0B',
      600: '#D97706',
      400: '#FBBF24',
      50: '#FEF3C7',
    },
    preview: ['#059669', '#F59E0B'],
  },
  {
    id: 'purple',
    name: 'Royal Purple',
    description: 'Elegant purples for a premium look',
    primary: {
      500: '#7C3AED',
      600: '#6D28D9',
      400: '#8B5CF6',
      50: '#EDE9FE',
    },
    accent: {
      500: '#EC4899',
      600: '#DB2777',
      400: '#F472B6',
      50: '#FCE7F3',
    },
    preview: ['#7C3AED', '#EC4899'],
  },
  {
    id: 'sunset',
    name: 'Sunset Orange',
    description: 'Warm oranges and reds for energy',
    primary: {
      500: '#DC2626',
      600: '#B91C1C',
      400: '#EF4444',
      50: '#FEE2E2',
    },
    accent: {
      500: '#F97316',
      600: '#EA580C',
      400: '#FB923C',
      50: '#FED7AA',
    },
    preview: ['#DC2626', '#F97316'],
  },
  {
    id: 'midnight',
    name: 'Midnight Blue',
    description: 'Deep blues for a professional atmosphere',
    primary: {
      500: '#1E40AF',
      600: '#1E3A8A',
      400: '#3B82F6',
      50: '#DBEAFE',
    },
    accent: {
      500: '#F59E0B',
      600: '#D97706',
      400: '#FBBF24',
      50: '#FEF3C7',
    },
    preview: ['#1E40AF', '#F59E0B'],
  },
];

export const getColorPalette = (id: string): ColorPalette => {
  return colorPalettes.find(p => p.id === id) || colorPalettes[0];
};

export const getColorPalettePreference = async (): Promise<string> => {
  try {
    const saved = await AsyncStorage.getItem('colorPalette');
    return saved || 'default';
  } catch (error) {
    console.error('Error getting color palette preference:', error);
    return 'default';
  }
};

export const setColorPalettePreference = async (paletteId: string): Promise<void> => {
  try {
    await AsyncStorage.setItem('colorPalette', paletteId);
    await applyColorPalette(paletteId);
  } catch (error) {
    console.error('Error setting color palette preference:', error);
  }
};

export const applyColorPalette = async (paletteId: string): Promise<void> => {
  try {
    const palette = getColorPalette(paletteId);
    
    // Store palette in AsyncStorage for access by design system
    await AsyncStorage.setItem('activeColorPalette', JSON.stringify(palette));
    
    // For React Native, we'll need to update the design system dynamically
    // This will be handled by a context or by updating the designSystem module
  } catch (error) {
    console.error('Error applying color palette:', error);
  }
};

// Initialize color palette on app load
export const initializeColorPalette = async (): Promise<void> => {
  try {
    const savedPalette = await getColorPalettePreference();
    await applyColorPalette(savedPalette);
  } catch (error) {
    console.error('Error initializing color palette:', error);
  }
};


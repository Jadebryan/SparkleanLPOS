/**
 * Color Palette System for Staff App
 * Allows users to choose different color themes
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CUSTOM_PALETTES_KEY = 'staff_custom_color_palettes';

type PaletteType = 'preset' | 'custom';

export interface PaletteScale {
  50: string;
  400: string;
  500: string;
  600: string;
}

export interface ColorPalette {
  id: string;
  name: string;
  description: string;
  type: PaletteType;
  primary: PaletteScale;
  accent: PaletteScale;
  preview: string[]; // Preview colors for display
  metadata?: {
    primarySource?: string;
    accentSource?: string;
    createdAt?: number;
  };
}

let customPaletteCache: ColorPalette[] | null = null;

const normalizeHex = (value: string): string => {
  if (!value) return '#000000';
  let hex = value.trim().replace('#', '');
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('');
  }
  if (hex.length !== 6) {
    hex = hex.padEnd(6, '0').slice(0, 6);
  }
  return `#${hex.toUpperCase()}`;
};

const adjustChannel = (channel: number, amount: number) => {
  return Math.min(255, Math.max(0, Math.round(channel + amount)));
};

const adjustColor = (hexColor: string, amount: number) => {
  const normalized = normalizeHex(hexColor);
  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);
  const delta = 255 * amount;
  const newR = adjustChannel(r, delta);
  const newG = adjustChannel(g, delta);
  const newB = adjustChannel(b, delta);
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB
    .toString(16)
    .padStart(2, '0')}`.toUpperCase();
};

const createScaleFromBase = (baseColor: string): PaletteScale => ({
  50: adjustColor(baseColor, 0.55),
  400: adjustColor(baseColor, 0.15),
  500: normalizeHex(baseColor),
  600: adjustColor(baseColor, -0.2),
});

export const colorPalettes: ColorPalette[] = [
  {
    id: 'default',
    name: 'Sparklean Orange & Blue',
    description: 'The classic Sparklean brand colors',
    type: 'preset',
    primary: {
      500: '#F97316',
      600: '#EA580C',
      400: '#FB923C',
      50: '#FFF7ED',
    },
    accent: {
      500: '#2563EB',
      600: '#1D4ED8',
      400: '#3B82F6',
      50: '#EFF6FF',
    },
    preview: ['#F97316', '#2563EB'],
  },
  {
    id: 'ocean',
    name: 'Ocean Breeze',
    description: 'Cool blues and teals for a calm workspace',
    type: 'preset',
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
    type: 'preset',
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
    type: 'preset',
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
    type: 'preset',
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
    type: 'preset',
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

const persistCustomPaletteCache = async (palettes: ColorPalette[]) => {
  customPaletteCache = palettes;
  await AsyncStorage.setItem(CUSTOM_PALETTES_KEY, JSON.stringify(palettes));
};

const loadCustomPaletteCache = async (): Promise<ColorPalette[]> => {
  if (customPaletteCache) {
    return customPaletteCache;
  }
  try {
    const stored = await AsyncStorage.getItem(CUSTOM_PALETTES_KEY);
    if (!stored) {
      customPaletteCache = [];
      return [];
    }
    const parsed: ColorPalette[] = JSON.parse(stored);
    customPaletteCache = parsed;
    return parsed;
  } catch (error) {
    console.error('Error loading custom palettes:', error);
    customPaletteCache = [];
    return [];
  }
};

export const getCustomPalettes = async (): Promise<ColorPalette[]> => {
  return loadCustomPaletteCache();
};

export const getDefaultPalette = (): ColorPalette => colorPalettes[0];

export const getPaletteById = async (id: string): Promise<ColorPalette> => {
  const builtIn = colorPalettes.find(p => p.id === id);
  if (builtIn) {
    return builtIn;
  }
  const custom = (await loadCustomPaletteCache()).find(p => p.id === id);
  return custom || getDefaultPalette();
};

interface CustomPaletteInput {
  name: string;
  description?: string;
  primaryColor: string;
  accentColor: string;
}

const buildCustomPalette = (input: CustomPaletteInput, paletteId?: string): ColorPalette => {
  const primary = createScaleFromBase(input.primaryColor);
  const accent = createScaleFromBase(input.accentColor);
  return {
    id: paletteId || `custom-${Date.now()}`,
    name: input.name || 'Custom Palette',
    description: input.description || 'Personalized colors',
    type: 'custom',
    primary,
    accent,
    preview: [primary[500], accent[500]],
    metadata: {
      primarySource: normalizeHex(input.primaryColor),
      accentSource: normalizeHex(input.accentColor),
      createdAt: Date.now(),
    },
  };
};

export const createCustomPalette = async (input: CustomPaletteInput): Promise<ColorPalette> => {
  const palette = buildCustomPalette(input);
  const existing = await loadCustomPaletteCache();
  const next = [palette, ...existing].slice(0, 12);
  await persistCustomPaletteCache(next);
  return palette;
};

export const updateCustomPalette = async (paletteId: string, input: CustomPaletteInput): Promise<ColorPalette> => {
  const existing = await loadCustomPaletteCache();
  const index = existing.findIndex(palette => palette.id === paletteId);
  if (index === -1) {
    throw new Error('Custom palette not found');
  }
  const updated = buildCustomPalette(input, paletteId);
  existing[index] = updated;
  await persistCustomPaletteCache(existing);
  return updated;
};

export const deleteCustomPalette = async (paletteId: string): Promise<void> => {
  const existing = await loadCustomPaletteCache();
  const filtered = existing.filter(palette => palette.id !== paletteId);
  await persistCustomPaletteCache(filtered);
};

export const getAllPalettes = async (): Promise<ColorPalette[]> => {
  const custom = await loadCustomPaletteCache();
  return [...colorPalettes, ...custom];
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
    const palette = await getPaletteById(paletteId);
    await AsyncStorage.setItem('activeColorPalette', JSON.stringify(palette));
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


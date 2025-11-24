/**
 * Color Palette System for Admin App
 * Allows users to choose different color themes
 */

export interface ColorPalette {
  id: string
  name: string
  description: string
  primary: {
    blue: string
    darkBlue: string
    lightBlue: string
    veryLightBlue: string
  }
  accent: {
    orange: string
    darkOrange: string
    lightOrange: string
    veryLightOrange: string
  }
  preview: string[] // Preview colors for display
}

export const colorPalettes: ColorPalette[] = [
  {
    id: 'default',
    name: 'Sparklean Blue & Orange',
    description: 'The classic Sparklean brand colors',
    primary: {
      blue: '#2563EB',
      darkBlue: '#1D4ED8',
      lightBlue: '#3B82F6',
      veryLightBlue: '#DBEAFE',
    },
    accent: {
      orange: '#EA580C',
      darkOrange: '#C2410C',
      lightOrange: '#FB923C',
      veryLightOrange: '#FED7AA',
    },
    preview: ['#2563EB', '#EA580C'],
  },
  {
    id: 'ocean',
    name: 'Ocean Breeze',
    description: 'Cool blues and teals for a calm workspace',
    primary: {
      blue: '#0891B2',
      darkBlue: '#0E7490',
      lightBlue: '#06B6D4',
      veryLightBlue: '#CFFAFE',
    },
    accent: {
      orange: '#14B8A6',
      darkOrange: '#0D9488',
      lightOrange: '#2DD4BF',
      veryLightOrange: '#CCFBF1',
    },
    preview: ['#0891B2', '#14B8A6'],
  },
  {
    id: 'forest',
    name: 'Forest Green',
    description: 'Natural greens for a fresh feel',
    primary: {
      blue: '#059669',
      darkBlue: '#047857',
      lightBlue: '#10B981',
      veryLightBlue: '#D1FAE5',
    },
    accent: {
      orange: '#F59E0B',
      darkOrange: '#D97706',
      lightOrange: '#FBBF24',
      veryLightOrange: '#FEF3C7',
    },
    preview: ['#059669', '#F59E0B'],
  },
  {
    id: 'purple',
    name: 'Royal Purple',
    description: 'Elegant purples for a premium look',
    primary: {
      blue: '#7C3AED',
      darkBlue: '#6D28D9',
      lightBlue: '#8B5CF6',
      veryLightBlue: '#EDE9FE',
    },
    accent: {
      orange: '#EC4899',
      darkOrange: '#DB2777',
      lightOrange: '#F472B6',
      veryLightOrange: '#FCE7F3',
    },
    preview: ['#7C3AED', '#EC4899'],
  },
  {
    id: 'sunset',
    name: 'Sunset Orange',
    description: 'Warm oranges and reds for energy',
    primary: {
      blue: '#DC2626',
      darkBlue: '#B91C1C',
      lightBlue: '#EF4444',
      veryLightBlue: '#FEE2E2',
    },
    accent: {
      orange: '#F97316',
      darkOrange: '#EA580C',
      lightOrange: '#FB923C',
      veryLightOrange: '#FED7AA',
    },
    preview: ['#DC2626', '#F97316'],
  },
  {
    id: 'midnight',
    name: 'Midnight Blue',
    description: 'Deep blues for a professional atmosphere',
    primary: {
      blue: '#1E40AF',
      darkBlue: '#1E3A8A',
      lightBlue: '#3B82F6',
      veryLightBlue: '#DBEAFE',
    },
    accent: {
      orange: '#F59E0B',
      darkOrange: '#D97706',
      lightOrange: '#FBBF24',
      veryLightOrange: '#FEF3C7',
    },
    preview: ['#1E40AF', '#F59E0B'],
  },
]

export const getColorPalette = (id: string): ColorPalette => {
  return colorPalettes.find(p => p.id === id) || colorPalettes[0]
}

export const getColorPalettePreference = (): string => {
  if (typeof window === 'undefined') return 'default'
  const saved = localStorage.getItem('colorPalette')
  return saved || 'default'
}

export const setColorPalettePreference = (paletteId: string): void => {
  if (typeof window === 'undefined') return
  localStorage.setItem('colorPalette', paletteId)
  applyColorPalette(paletteId)
}

export const applyColorPalette = (paletteId: string): void => {
  if (typeof window === 'undefined') return
  
  const palette = getColorPalette(paletteId)
  const root = document.documentElement
  
  // Apply primary colors
  root.style.setProperty('--color-primary-blue', palette.primary.blue)
  root.style.setProperty('--color-dark-blue', palette.primary.darkBlue)
  root.style.setProperty('--color-light-blue', palette.primary.lightBlue)
  root.style.setProperty('--color-very-light-blue', palette.primary.veryLightBlue)
  
  // Apply accent colors
  root.style.setProperty('--color-primary-orange', palette.accent.orange)
  root.style.setProperty('--color-dark-orange', palette.accent.darkOrange)
  root.style.setProperty('--color-light-orange', palette.accent.lightOrange)
  root.style.setProperty('--color-very-light-orange', palette.accent.veryLightOrange)
}

// Initialize color palette on load
if (typeof window !== 'undefined') {
  const savedPalette = getColorPalettePreference()
  applyColorPalette(savedPalette)
}


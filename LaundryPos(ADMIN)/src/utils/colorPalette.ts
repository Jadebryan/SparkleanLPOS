/**
 * Color Palette System for Admin App
 * Allows users to choose different color themes
 */

const CUSTOM_PALETTES_KEY = 'admin_custom_color_palettes'
type PaletteType = 'preset' | 'custom'

export interface PaletteScale {
  blue: string
  darkBlue: string
  lightBlue: string
  veryLightBlue: string
}

export interface AccentScale {
  orange: string
  darkOrange: string
  lightOrange: string
  veryLightOrange: string
}

export interface ColorPalette {
  id: string
  name: string
  description: string
  type: PaletteType
  primary: PaletteScale
  accent: AccentScale
  preview: string[]
  metadata?: {
    primarySource?: string
    accentSource?: string
    createdAt?: number
  }
}

let customPaletteCache: ColorPalette[] | null = null

const normalizeHex = (value: string) => {
  if (!value) return '#000000'
  let hex = value.replace('#', '').trim()
  if (hex.length === 3) {
    hex = hex.split('').map(char => char + char).join('')
  }
  if (hex.length !== 6) {
    hex = hex.padEnd(6, '0').slice(0, 6)
  }
  return `#${hex.toUpperCase()}`
}

const adjustChannel = (channel: number, amount: number) => {
  return Math.min(255, Math.max(0, Math.round(channel + amount)))
}

const adjustColor = (hex: string, amount: number) => {
  const normalized = normalizeHex(hex)
  const r = parseInt(normalized.slice(1, 3), 16)
  const g = parseInt(normalized.slice(3, 5), 16)
  const b = parseInt(normalized.slice(5, 7), 16)
  const delta = 255 * amount
  const newR = adjustChannel(r, delta)
  const newG = adjustChannel(g, delta)
  const newB = adjustChannel(b, delta)
  return `#${newR.toString(16).padStart(2, '0')}${newG
    .toString(16)
    .padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`.toUpperCase()
}

const createPrimaryScale = (base: string): PaletteScale => ({
  blue: normalizeHex(base),
  darkBlue: adjustColor(base, -0.25),
  lightBlue: adjustColor(base, 0.2),
  veryLightBlue: adjustColor(base, 0.45),
})

const createAccentScale = (base: string): AccentScale => ({
  orange: normalizeHex(base),
  darkOrange: adjustColor(base, -0.25),
  lightOrange: adjustColor(base, 0.2),
  veryLightOrange: adjustColor(base, 0.45),
})

const ensureWindow = () => typeof window !== 'undefined'

const persistCustomPalettes = (palettes: ColorPalette[]) => {
  if (!ensureWindow()) return
  customPaletteCache = palettes
  localStorage.setItem(CUSTOM_PALETTES_KEY, JSON.stringify(palettes))
}

const loadCustomPalettes = (): ColorPalette[] => {
  if (!ensureWindow()) return []
  if (customPaletteCache) return customPaletteCache
  const stored = localStorage.getItem(CUSTOM_PALETTES_KEY)
  if (!stored) {
    customPaletteCache = []
    return []
  }
  try {
    const parsed: ColorPalette[] = JSON.parse(stored)
    customPaletteCache = parsed
    return parsed
  } catch (error) {
    console.error('Error parsing custom palettes:', error)
    customPaletteCache = []
    return []
  }
}

export const colorPalettes: ColorPalette[] = [
  {
    id: 'default',
    name: 'Sparklean Blue & Orange',
    description: 'The classic Sparklean brand colors',
    type: 'preset',
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
    type: 'preset',
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
    type: 'preset',
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
    type: 'preset',
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
    type: 'preset',
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
    type: 'preset',
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

export const getDefaultPalette = () => colorPalettes[0]

export const getColorPalette = (id: string): ColorPalette => {
  const allPalettes = getAllPalettes()
  return allPalettes.find(p => p.id === id) || colorPalettes[0]
}

export const getAllPalettes = (): ColorPalette[] => {
  return [...colorPalettes, ...loadCustomPalettes()]
}

interface CustomPaletteInput {
  name: string
  primaryColor: string
  accentColor: string
}

const buildCustomPalette = (input: CustomPaletteInput, paletteId?: string): ColorPalette => ({
  id: paletteId ?? `custom-${Date.now()}`,
  name: input.name || 'Custom Palette',
  description: 'Personalized colors',
  type: 'custom',
  primary: createPrimaryScale(input.primaryColor),
  accent: createAccentScale(input.accentColor),
  preview: [normalizeHex(input.primaryColor), normalizeHex(input.accentColor)],
  metadata: {
    primarySource: normalizeHex(input.primaryColor),
    accentSource: normalizeHex(input.accentColor),
    createdAt: Date.now(),
  },
})

export const createCustomPalette = (input: CustomPaletteInput): ColorPalette => {
  if (!ensureWindow()) throw new Error('Custom palettes are only supported in the browser.')
  const palette = buildCustomPalette(input)
  const next = [palette, ...loadCustomPalettes()].slice(0, 12)
  persistCustomPalettes(next)
  return palette
}

export const updateCustomPalette = (paletteId: string, input: CustomPaletteInput): ColorPalette => {
  const palettes = loadCustomPalettes()
  const index = palettes.findIndex(palette => palette.id === paletteId)
  if (index === -1) {
    throw new Error('Custom palette not found')
  }
  const updated = buildCustomPalette(input, paletteId)
  palettes[index] = updated
  persistCustomPalettes(palettes)
  return updated
}

export const deleteCustomPalette = (paletteId: string): void => {
  const filtered = loadCustomPalettes().filter(palette => palette.id !== paletteId)
  persistCustomPalettes(filtered)
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
  const currentTheme = root.getAttribute('data-theme') || 'light'
  
  // Apply primary colors to root
  root.style.setProperty('--color-primary-blue', palette.primary.blue)
  root.style.setProperty('--color-dark-blue', palette.primary.darkBlue)
  root.style.setProperty('--color-light-blue', palette.primary.lightBlue)
  
  // Apply accent colors to root
  root.style.setProperty('--color-primary-orange', palette.accent.orange)
  root.style.setProperty('--color-dark-orange', palette.accent.darkOrange)
  root.style.setProperty('--color-light-orange', palette.accent.lightOrange)
  
  // For very light colors, adjust based on theme
  // In light mode, use the original very light colors
  // In dark/dim mode, use darker versions for better contrast
  let veryLightBlue: string
  let veryLightOrange: string
  
  if (currentTheme === 'light') {
    veryLightBlue = palette.primary.veryLightBlue
    veryLightOrange = palette.accent.veryLightOrange
  } else {
    // For dark/dim mode, use slightly darker versions of the palette colors
    // This ensures the palette colors work well in dark backgrounds
    // Convert hex to RGB, darken it, then convert back
    const darkenColor = (hex: string, factor: number = 0.5): string => {
      const r = parseInt(hex.slice(1, 3), 16)
      const g = parseInt(hex.slice(3, 5), 16)
      const b = parseInt(hex.slice(5, 7), 16)
      const newR = Math.max(0, Math.floor(r * (1 - factor)))
      const newG = Math.max(0, Math.floor(g * (1 - factor)))
      const newB = Math.max(0, Math.floor(b * (1 - factor)))
      return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`
    }
    
    // Use darker versions for dark/dim mode
    veryLightBlue = darkenColor(palette.primary.blue, 0.5)
    veryLightOrange = darkenColor(palette.accent.orange, 0.5)
  }
  
  root.style.setProperty('--color-very-light-blue', veryLightBlue)
  root.style.setProperty('--color-very-light-orange', veryLightOrange)
  
  // Inject a style element with higher specificity to override dim/dark mode rules
  let styleElement = document.getElementById('color-palette-override') as HTMLStyleElement
  if (!styleElement) {
    styleElement = document.createElement('style')
    styleElement.id = 'color-palette-override'
    document.head.appendChild(styleElement)
  }
  
  // Create CSS rules that override theme-specific colors when palette is active
  styleElement.textContent = `
    [data-palette="${paletteId}"] {
      --color-primary-blue: ${palette.primary.blue} !important;
      --color-dark-blue: ${palette.primary.darkBlue} !important;
      --color-light-blue: ${palette.primary.lightBlue} !important;
      --color-primary-orange: ${palette.accent.orange} !important;
      --color-dark-orange: ${palette.accent.darkOrange} !important;
      --color-light-orange: ${palette.accent.lightOrange} !important;
      --color-very-light-blue: ${veryLightBlue} !important;
      --color-very-light-orange: ${veryLightOrange} !important;
    }
    
    [data-theme="dim"][data-palette="${paletteId}"] {
      --color-very-light-blue: ${veryLightBlue} !important;
      --color-very-light-orange: ${veryLightOrange} !important;
    }
    
    [data-theme="dark"][data-palette="${paletteId}"] {
      --color-very-light-blue: ${veryLightBlue} !important;
      --color-very-light-orange: ${veryLightOrange} !important;
    }
  `
  
  // Also apply to data-palette attribute for CSS selector support
  root.setAttribute('data-palette', paletteId)
}

// Initialize color palette on load
if (typeof window !== 'undefined') {
  const savedPalette = getColorPalettePreference()
  applyColorPalette(savedPalette)
  
  // Re-apply palette when theme changes
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
        const currentPalette = getColorPalettePreference()
        applyColorPalette(currentPalette)
      }
    })
  })
  
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme']
  })
}


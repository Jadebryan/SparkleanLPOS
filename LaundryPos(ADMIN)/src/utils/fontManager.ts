/**
 * Font Manager - Handles font loading and application
 */

export interface FontOption {
  name: string;
  displayName: string;
  googleFontsUrl: string;
  cssFamily: string;
  description: string;
}

export const availableFonts: FontOption[] = [
  {
    name: 'roboto',
    displayName: 'Roboto',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap',
    cssFamily: "'Roboto', sans-serif",
    description: 'Clean, modern, designed for UI'
  },
  {
    name: 'open-sans',
    displayName: 'Open Sans',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400;500;600;700&display=swap',
    cssFamily: "'Open Sans', sans-serif",
    description: 'Highly readable, professional'
  },
  {
    name: 'work-sans',
    displayName: 'Work Sans',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Work+Sans:wght@300;400;500;600;700&display=swap',
    cssFamily: "'Work Sans', sans-serif",
    description: 'Modern, clean, great for dashboards'
  },
  {
    name: 'dm-sans',
    displayName: 'DM Sans',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap',
    cssFamily: "'DM Sans', sans-serif",
    description: 'Modern, balanced, professional'
  },
  {
    name: 'montserrat',
    displayName: 'Montserrat',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap',
    cssFamily: "'Montserrat', sans-serif",
    description: 'Geometric, modern, stylish'
  },
  {
    name: 'lato',
    displayName: 'Lato',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&display=swap',
    cssFamily: "'Lato', sans-serif",
    description: 'Warm, professional, approachable'
  },
  {
    name: 'nunito-sans',
    displayName: 'Nunito Sans',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Nunito+Sans:wght@300;400;600;700&display=swap',
    cssFamily: "'Nunito Sans', sans-serif",
    description: 'Clean, rounded, friendly'
  },
  {
    name: 'poppins',
    displayName: 'Poppins',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap',
    cssFamily: "'Poppins', sans-serif",
    description: 'Geometric, modern, versatile'
  },
  {
    name: 'inter',
    displayName: 'Inter',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
    cssFamily: "'Inter', sans-serif",
    description: 'Optimized for screens, highly legible'
  },
  {
    name: 'source-sans-pro',
    displayName: 'Source Sans Pro',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Source+Sans+Pro:wght@300;400;600;700&display=swap',
    cssFamily: "'Source Sans Pro', sans-serif",
    description: 'Adobe designed, professional clarity'
  },
  {
    name: 'raleway',
    displayName: 'Raleway',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Raleway:wght@300;400;500;600;700&display=swap',
    cssFamily: "'Raleway', sans-serif",
    description: 'Elegant, sophisticated, refined'
  },
  {
    name: 'ubuntu',
    displayName: 'Ubuntu',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Ubuntu:wght@300;400;500;700&display=swap',
    cssFamily: "'Ubuntu', sans-serif",
    description: 'Friendly, modern, approachable'
  },
  {
    name: 'noto-sans',
    displayName: 'Noto Sans',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Noto+Sans:wght@300;400;500;600;700&display=swap',
    cssFamily: "'Noto Sans', sans-serif",
    description: 'Universal, highly readable, balanced'
  },
  {
    name: 'quicksand',
    displayName: 'Quicksand',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Quicksand:wght@300;400;500;600;700&display=swap',
    cssFamily: "'Quicksand', sans-serif",
    description: 'Modern, rounded, friendly'
  },
  {
    name: 'rubik',
    displayName: 'Rubik',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Rubik:wght@300;400;500;600;700&display=swap',
    cssFamily: "'Rubik', sans-serif",
    description: 'Geometric, contemporary, versatile'
  },
  {
    name: 'manrope',
    displayName: 'Manrope',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Manrope:wght@300;400;500;600;700&display=swap',
    cssFamily: "'Manrope', sans-serif",
    description: 'Modern, clean, minimalist'
  },
  {
    name: 'space-grotesk',
    displayName: 'Space Grotesk',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap',
    cssFamily: "'Space Grotesk', sans-serif",
    description: 'Contemporary, tech-forward, unique'
  },
  {
    name: 'outfit',
    displayName: 'Outfit',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap',
    cssFamily: "'Outfit', sans-serif",
    description: 'Modern, clean, geometric'
  },
  {
    name: 'plus-jakarta-sans',
    displayName: 'Plus Jakarta Sans',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap',
    cssFamily: "'Plus Jakarta Sans', sans-serif",
    description: 'Contemporary, professional, balanced'
  },
  {
    name: 'figtree',
    displayName: 'Figtree',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Figtree:wght@300;400;500;600;700&display=swap',
    cssFamily: "'Figtree', sans-serif",
    description: 'Modern, friendly, readable'
  },
  {
    name: 'lexend',
    displayName: 'Lexend',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700&display=swap',
    cssFamily: "'Lexend', sans-serif",
    description: 'Designed for reading proficiency'
  },
  {
    name: 'josefin-sans',
    displayName: 'Josefin Sans',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Josefin+Sans:wght@300;400;500;600;700&display=swap',
    cssFamily: "'Josefin Sans', sans-serif",
    description: 'Elegant, geometric, stylish'
  },
  {
    name: 'fira-sans',
    displayName: 'Fira Sans',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Fira+Sans:wght@300;400;500;600;700&display=swap',
    cssFamily: "'Fira Sans', sans-serif",
    description: 'Tech-forward, clean, professional'
  },
  {
    name: 'cabin',
    displayName: 'Cabin',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Cabin:wght@400;500;600;700&display=swap',
    cssFamily: "'Cabin', sans-serif",
    description: 'Friendly, approachable, versatile'
  },
  {
    name: 'archivo',
    displayName: 'Archivo',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&display=swap',
    cssFamily: "'Archivo', sans-serif",
    description: 'Bold, modern, impactful'
  },
  {
    name: 'barlow',
    displayName: 'Barlow',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Barlow:wght@300;400;500;600;700&display=swap',
    cssFamily: "'Barlow', sans-serif",
    description: 'Clean, geometric, readable'
  },
  {
    name: 'ibm-plex-sans',
    displayName: 'IBM Plex Sans',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600;700&display=swap',
    cssFamily: "'IBM Plex Sans', sans-serif",
    description: 'Professional, corporate, refined'
  },
  {
    name: 'public-sans',
    displayName: 'Public Sans',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Public+Sans:wght@300;400;500;600;700&display=swap',
    cssFamily: "'Public Sans', sans-serif",
    description: 'Government-style, clear, accessible'
  },
  {
    name: 'mulish',
    displayName: 'Mulish',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Mulish:wght@300;400;500;600;700&display=swap',
    cssFamily: "'Mulish', sans-serif",
    description: 'Rounded, friendly, modern'
  },
  {
    name: 'comfortaa',
    displayName: 'Comfortaa',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Comfortaa:wght@300;400;500;600;700&display=swap',
    cssFamily: "'Comfortaa', sans-serif",
    description: 'Very rounded, playful, distinctive'
  },
  {
    name: 'kumbh-sans',
    displayName: 'Kumbh Sans',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Kumbh+Sans:wght@300;400;500;600;700&display=swap',
    cssFamily: "'Kumbh Sans', sans-serif",
    description: 'Geometric, contemporary, balanced'
  },
  {
    name: 'sora',
    displayName: 'Sora',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap',
    cssFamily: "'Sora', sans-serif",
    description: 'Modern, elegant, sophisticated'
  },
  {
    name: 'epilogue',
    displayName: 'Epilogue',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Epilogue:wght@300;400;500;600;700&display=swap',
    cssFamily: "'Epilogue', sans-serif",
    description: 'Versatile, clean, professional'
  },
  {
    name: 'red-hat-display',
    displayName: 'Red Hat Display',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Red+Hat+Display:wght@400;500;600;700&display=swap',
    cssFamily: "'Red Hat Display', sans-serif",
    description: 'Professional, modern, corporate'
  },
  {
    name: 'be-vietnam-pro',
    displayName: 'Be Vietnam Pro',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@300;400;500;600;700&display=swap',
    cssFamily: "'Be Vietnam Pro', sans-serif",
    description: 'Modern, clean, versatile'
  },
  {
    name: 'kanit',
    displayName: 'Kanit',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600;700&display=swap',
    cssFamily: "'Kanit', sans-serif",
    description: 'Modern, geometric, distinctive'
  },
  {
    name: 'hind',
    displayName: 'Hind',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Hind:wght@300;400;500;600;700&display=swap',
    cssFamily: "'Hind', sans-serif",
    description: 'Clean, readable, professional'
  },
  {
    name: 'tajawal',
    displayName: 'Tajawal',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700&display=swap',
    cssFamily: "'Tajawal', sans-serif",
    description: 'Modern, clean, geometric'
  },
  {
    name: 'crimson-pro',
    displayName: 'Crimson Pro',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@300;400;500;600;700&display=swap',
    cssFamily: "'Crimson Pro', serif",
    description: 'Classic serif, elegant, traditional'
  },
  {
    name: 'merriweather',
    displayName: 'Merriweather',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700&display=swap',
    cssFamily: "'Merriweather', serif",
    description: 'Readable serif, warm, professional'
  },
  {
    name: 'playfair-display',
    displayName: 'Playfair Display',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&display=swap',
    cssFamily: "'Playfair Display', serif",
    description: 'Elegant serif, sophisticated, stylish'
  },
  {
    name: 'cormorant-garamond',
    displayName: 'Cormorant Garamond',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&display=swap',
    cssFamily: "'Cormorant Garamond', serif",
    description: 'Classic serif, elegant, refined'
  },
  {
    name: 'libre-baskerville',
    displayName: 'Libre Baskerville',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Libre+Baskerville:wght@400;700&display=swap',
    cssFamily: "'Libre Baskerville', serif",
    description: 'Traditional serif, readable, classic'
  },
  {
    name: 'lora',
    displayName: 'Lora',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&display=swap',
    cssFamily: "'Lora', serif",
    description: 'Elegant serif, balanced, readable'
  },
  {
    name: 'roboto-mono',
    displayName: 'Roboto Mono',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@300;400;500;600;700&display=swap',
    cssFamily: "'Roboto Mono', monospace",
    description: 'Monospace, technical, code-friendly'
  },
  {
    name: 'source-code-pro',
    displayName: 'Source Code Pro',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@300;400;500;600;700&display=swap',
    cssFamily: "'Source Code Pro', monospace",
    description: 'Monospace, developer-friendly, clean'
  },
  {
    name: 'jetbrains-mono',
    displayName: 'JetBrains Mono',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap',
    cssFamily: "'JetBrains Mono', monospace",
    description: 'Monospace, modern, developer-focused'
  },
  {
    name: 'fira-code',
    displayName: 'Fira Code',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Fira+Code:wght@300;400;500;600;700&display=swap',
    cssFamily: "'Fira Code', monospace",
    description: 'Monospace, ligatures, coding optimized'
  },
  {
    name: 'inconsolata',
    displayName: 'Inconsolata',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Inconsolata:wght@300;400;500;600;700&display=swap',
    cssFamily: "'Inconsolata', monospace",
    description: 'Monospace, clean, readable'
  },
  {
    name: 'space-mono',
    displayName: 'Space Mono',
    googleFontsUrl: 'https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap',
    cssFamily: "'Space Mono', monospace",
    description: 'Monospace, geometric, unique'
  }
];

const STORAGE_KEY = 'app-font-preference';
const DEFAULT_FONT = 'roboto';

/**
 * Get the current font preference from localStorage
 */
export const getFontPreference = (): string => {
  if (typeof window === 'undefined') return DEFAULT_FONT;
  return localStorage.getItem(STORAGE_KEY) || DEFAULT_FONT;
};

/**
 * Save font preference to localStorage
 */
export const saveFontPreference = (fontName: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, fontName);
};

/**
 * Load a Google Font dynamically
 */
export const loadFont = (fontUrl: string): void => {
  if (typeof document === 'undefined') return;
  
  // Check if font is already loaded
  const existingLink = document.querySelector(`link[href="${fontUrl}"]`);
  if (existingLink) return;

  // Create and append link element
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = fontUrl;
  document.head.appendChild(link);
};

/**
 * Apply font to the document
 */
export const applyFont = (fontName: string): void => {
  if (typeof document === 'undefined') return;

  const font = availableFonts.find(f => f.name === fontName) || availableFonts[0];
  
  // Load the font
  loadFont(font.googleFontsUrl);
  
  // Apply to CSS variable
  const root = document.documentElement;
  root.style.setProperty('--font-family', font.cssFamily);
  
  // Also apply to body for immediate effect
  document.body.style.fontFamily = font.cssFamily;
  
  // Save preference
  saveFontPreference(fontName);
};

/**
 * Initialize font on app load
 */
export const initializeFont = (): void => {
  if (typeof window === 'undefined') return;
  
  const preferredFont = getFontPreference();
  applyFont(preferredFont);
};


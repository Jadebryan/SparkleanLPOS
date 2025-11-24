/**
 * Dynamic Color Hook for Staff App
 * Returns colors based on the active color palette
 */

import { useColorPalette } from '../context/ColorPaletteContext';
import { colors as baseColors } from './designSystem';

export const useColors = () => {
  const { activePalette } = useColorPalette();

  return {
    // Primary colors from palette
    primary: {
      50: activePalette.primary[50],
      100: activePalette.primary[50], // Use 50 for 100
      200: activePalette.primary[50], // Use 50 for 200
      300: activePalette.primary[400],
      400: activePalette.primary[400],
      500: activePalette.primary[500],
      600: activePalette.primary[600],
      700: activePalette.primary[600], // Use 600 for 700
      800: activePalette.primary[600], // Use 600 for 800
      900: activePalette.primary[600], // Use 600 for 900
    },
    // Accent colors from palette
    accent: {
      50: activePalette.accent[50],
      100: activePalette.accent[50],
      200: activePalette.accent[50],
      300: activePalette.accent[400],
      400: activePalette.accent[400],
      500: activePalette.accent[500],
      600: activePalette.accent[600],
      700: activePalette.accent[600],
      800: activePalette.accent[600],
      900: activePalette.accent[600],
    },
    // Keep other colors from base (success, warning, error, gray, etc.)
    success: baseColors.success,
    warning: baseColors.warning,
    error: baseColors.error,
    gray: baseColors.gray,
    background: baseColors.background,
    text: baseColors.text,
    border: baseColors.border,
  };
};

// Default export for Expo Router compatibility
export default useColors;


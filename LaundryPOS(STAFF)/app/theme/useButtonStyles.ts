/**
 * Dynamic Button Styles Hook for Staff App
 * Returns button styles based on the active color palette
 */

import { useColors } from './useColors';
import { createButtonStyles } from './designSystem';

export const useButtonStyles = () => {
  const colors = useColors();
  return createButtonStyles(colors.primary[500]);
};

// Default export for Expo Router compatibility
export default useButtonStyles;


/**
 * Professional Design System for Staff App
 * Optimized for 11-inch tablets
 */

import { StyleSheet, Dimensions, Platform } from 'react-native';

const { width, height } = Dimensions.get('window');

// Tablet Detection (11-inch tablets typically have width ~834px portrait, ~1194px landscape)
const isTablet = width >= 768 || (width >= 600 && height >= 600);
const isLandscape = width > height;

// ============================================
// COLOR SYSTEM
// ============================================
export const colors = {
  // Primary Brand Colors
  primary: {
    50: '#FFF7ED',
    100: '#FFEDD5',
    200: '#FED7AA',
    300: '#FDBA74',
    400: '#FB923C',
    500: '#F97316',  // Main brand orange
    600: '#EA580C',
    700: '#C2410C',
    800: '#9A3412',
    900: '#7C2D12',
  },
  
  // Accent Colors (Blue)
  accent: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#2563EB',  // Accent blue
    600: '#1D4ED8',
    700: '#1E40AF',
    800: '#1E3A8A',
    900: '#1E3A8A',
  },
  
  // Success Colors
  success: {
    50: '#F0FDF4',
    100: '#DCFCE7',
    200: '#BBF7D0',
    300: '#86EFAC',
    400: '#4ADE80',
    500: '#10B981',
    600: '#059669',
    700: '#047857',
  },
  
  // Warning Colors
  warning: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    200: '#FDE68A',
    300: '#FCD34D',
    400: '#FBBF24',
    500: '#F59E0B',
    600: '#D97706',
    700: '#B45309',
  },
  
  // Error Colors
  error: {
    50: '#FEF2F2',
    100: '#FEE2E2',
    200: '#FECACA',
    300: '#FCA5A5',
    400: '#F87171',
    500: '#EF4444',
    600: '#DC2626',
    700: '#B91C1C',
  },
  
  // Neutral Grays
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
  
  // Semantic Colors
  background: {
    primary: '#FFFFFF',
    secondary: '#F9FAFB',
    tertiary: '#F3F4F6',
  },
  
  text: {
    primary: '#111827',
    secondary: '#6B7280',
    tertiary: '#9CA3AF',
    inverse: '#FFFFFF',
  },
  
  border: {
    light: '#E5E7EB',
    medium: '#D1D5DB',
    dark: '#9CA3AF',
  },
};

// ============================================
// TYPOGRAPHY (Tablet-Optimized)
// ============================================
const baseFontSize = isTablet ? 16 : 14;
const baseLineHeight = isTablet ? 24 : 20;

export const typography = {
  h1: {
    fontSize: isTablet ? 36 : (width >= 1200 ? 32 : width >= 768 ? 28 : 24),
    fontWeight: '700' as const,
    lineHeight: isTablet ? 44 : (width >= 1200 ? 40 : width >= 768 ? 36 : 32),
    fontFamily: 'Poppins_700Bold',
    color: colors.text.primary,
  },
  h2: {
    fontSize: isTablet ? 28 : (width >= 1200 ? 24 : width >= 768 ? 22 : 20),
    fontWeight: '700' as const,
    lineHeight: isTablet ? 36 : (width >= 1200 ? 32 : width >= 768 ? 30 : 28),
    fontFamily: 'Poppins_700Bold',
    color: colors.text.primary,
  },
  h3: {
    fontSize: isTablet ? 22 : (width >= 1200 ? 20 : width >= 768 ? 18 : 16),
    fontWeight: '600' as const,
    lineHeight: isTablet ? 30 : (width >= 1200 ? 28 : width >= 768 ? 26 : 24),
    fontFamily: 'Poppins_600SemiBold',
    color: colors.text.primary,
  },
  h4: {
    fontSize: isTablet ? 20 : (width >= 1200 ? 18 : width >= 768 ? 16 : 14),
    fontWeight: '600' as const,
    lineHeight: isTablet ? 28 : (width >= 1200 ? 24 : width >= 768 ? 22 : 20),
    fontFamily: 'Poppins_600SemiBold',
    color: colors.text.primary,
  },
  body: {
    fontSize: baseFontSize,
    fontWeight: '400' as const,
    lineHeight: baseLineHeight,
    fontFamily: 'Poppins_400Regular',
    color: colors.text.primary,
  },
  bodySmall: {
    fontSize: isTablet ? 14 : 12,
    fontWeight: '400' as const,
    lineHeight: isTablet ? 20 : 16,
    fontFamily: 'Poppins_400Regular',
    color: colors.text.secondary,
  },
  label: {
    fontSize: isTablet ? 16 : 14,
    fontWeight: '500' as const,
    lineHeight: isTablet ? 24 : 20,
    fontFamily: 'Poppins_500Medium',
    color: colors.text.primary,
  },
  caption: {
    fontSize: isTablet ? 14 : 12,
    fontWeight: '400' as const,
    lineHeight: isTablet ? 20 : 16,
    fontFamily: 'Poppins_400Regular',
    color: colors.text.secondary,
  },
};

// ============================================
// SPACING SYSTEM (Tablet-Optimized)
// ============================================
export const spacing = {
  xs: isTablet ? 6 : 4,
  sm: isTablet ? 12 : 8,
  md: isTablet ? 16 : 12,
  lg: isTablet ? 20 : 16,
  xl: isTablet ? 28 : 24,
  '2xl': isTablet ? 40 : 32,
  '3xl': isTablet ? 56 : 48,
  '4xl': isTablet ? 80 : 64,
};

// ============================================
// SHADOWS
// ============================================
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  primary: {
    shadowColor: colors.primary[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  accent: {
    shadowColor: colors.accent[500],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
};

// ============================================
// BORDER RADIUS (Tablet-Optimized)
// ============================================
export const borderRadius = {
  sm: isTablet ? 8 : 6,
  md: isTablet ? 10 : 8,
  lg: isTablet ? 12 : 10,
  xl: isTablet ? 16 : 12,
  '2xl': isTablet ? 20 : 16,
  full: 9999,
};

// ============================================
// COMPONENT STYLES
// ============================================

// Enhanced Card Styles (Tablet-Optimized)
const cardPadding = isTablet ? spacing['2xl'] : spacing.xl;

export const cardStyles = StyleSheet.create({
  base: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius['2xl'],
    padding: cardPadding,
    borderWidth: 1,
    borderColor: colors.border.light,
    ...shadows.md,
  },
  elevated: {
    ...shadows.lg,
    borderColor: colors.border.medium,
  },
  interactive: {
    ...shadows.sm,
  },
});

// Enhanced Input Styles (Tablet-Optimized)
const inputMinHeight = isTablet ? 56 : 44;
const inputPaddingVertical = isTablet ? 16 : 12;
const inputPaddingHorizontal = isTablet ? 20 : 16;
const inputFontSize = isTablet ? 16 : 14;

export const inputStyles = StyleSheet.create({
  base: {
    borderWidth: 2,
    borderColor: colors.border.light,
    borderRadius: borderRadius.lg,
    paddingHorizontal: inputPaddingHorizontal,
    paddingVertical: inputPaddingVertical,
    minHeight: inputMinHeight,
    fontSize: inputFontSize,
    backgroundColor: colors.background.primary,
    fontFamily: 'Poppins_400Regular',
    color: colors.text.primary,
  },
  focus: {
    borderColor: colors.primary[500],
    ...shadows.sm,
  },
  error: {
    borderColor: colors.error[500],
    backgroundColor: colors.error[50],
  },
  success: {
    borderColor: colors.success[500],
    backgroundColor: colors.success[50],
  },
  disabled: {
    backgroundColor: colors.gray[100],
    borderColor: colors.border.light,
    opacity: 0.6,
  },
});

// Button Styles (Tablet-Optimized)
const buttonMinHeight = isTablet ? 56 : 44;
const buttonPaddingVertical = isTablet ? 16 : 14;
const buttonPaddingHorizontal = isTablet ? 32 : 24;
const buttonFontSize = isTablet ? 18 : 16;

// Create a function to generate button styles with dynamic colors
export const createButtonStyles = (primaryColor: string = colors.primary[500]) => StyleSheet.create({
  primary: {
    backgroundColor: primaryColor,
    paddingVertical: buttonPaddingVertical,
    paddingHorizontal: buttonPaddingHorizontal,
    minHeight: buttonMinHeight,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    shadowColor: primaryColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryText: {
    color: colors.text.inverse,
    fontSize: buttonFontSize,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  secondary: {
    backgroundColor: colors.background.primary,
    borderWidth: 2,
    borderColor: colors.border.medium,
    paddingVertical: buttonPaddingVertical,
    paddingHorizontal: buttonPaddingHorizontal,
    minHeight: buttonMinHeight,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  secondaryText: {
    color: colors.text.primary,
    fontSize: buttonFontSize,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  ghost: {
    backgroundColor: 'transparent',
    paddingVertical: buttonPaddingVertical - 4,
    paddingHorizontal: buttonPaddingHorizontal - 8,
    minHeight: buttonMinHeight - 8,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  ghostText: {
    color: primaryColor,
    fontSize: isTablet ? 16 : 14,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  disabled: {
    opacity: 0.5,
  },
});

// Default button styles (for backward compatibility)
export const buttonStyles = createButtonStyles(colors.primary[500]);

// Status Badge Styles
export const badgeStyles = StyleSheet.create({
  base: {
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
  },
  paid: {
    backgroundColor: colors.success[50],
    borderWidth: 1,
    borderColor: colors.success[500],
  },
  paidText: {
    color: colors.success[700],
    fontSize: isTablet ? 14 : 12,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  unpaid: {
    backgroundColor: colors.error[50],
    borderWidth: 1,
    borderColor: colors.error[500],
  },
  unpaidText: {
    color: colors.error[700],
    fontSize: isTablet ? 14 : 12,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  partial: {
    backgroundColor: colors.warning[50],
    borderWidth: 1,
    borderColor: colors.warning[500],
  },
  partialText: {
    color: colors.warning[700],
    fontSize: isTablet ? 14 : 12,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  active: {
    backgroundColor: colors.primary[50],
    borderWidth: 1,
    borderColor: colors.primary[500],
  },
  activeText: {
    color: colors.primary[700],
    fontSize: isTablet ? 14 : 12,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  inactive: {
    backgroundColor: colors.gray[100],
    borderWidth: 1,
    borderColor: colors.gray[400],
  },
  inactiveText: {
    color: colors.gray[600],
    fontSize: isTablet ? 14 : 12,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
});

// ============================================
// TABLET-SPECIFIC UTILITIES
// ============================================
export const tabletUtils = {
  isTablet,
  isLandscape,
  minTouchTarget: isTablet ? 56 : 44,
  iconSize: {
    small: isTablet ? 20 : 16,
    medium: isTablet ? 24 : 20,
    large: isTablet ? 32 : 24,
    xlarge: isTablet ? 40 : 32,
  },
  tableRowHeight: isTablet ? 72 : 60,
  sidebarWidth: isTablet ? 80 : 60,
};

// Export all as a single object for easy importing
export default {
  colors,
  typography,
  spacing,
  shadows,
  borderRadius,
  cardStyles,
  inputStyles,
  buttonStyles,
  badgeStyles,
  tabletUtils,
  isTablet,
  isLandscape,
};

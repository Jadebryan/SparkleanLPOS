import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/app/theme/designSystem';

interface AccessibleButtonProps {
  onPress: () => void;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityHint?: string;
  accessibilityState?: { disabled?: boolean; selected?: boolean };
}

const AccessibleButton: React.FC<AccessibleButtonProps> = ({
  onPress,
  label,
  icon,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  textStyle,
  accessibilityHint,
  accessibilityState,
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: disabled ? colors.gray[400] : colors.primary[500],
          borderColor: 'transparent',
          textColor: '#FFFFFF',
        };
      case 'secondary':
        return {
          backgroundColor: '#FFFFFF',
          borderColor: disabled ? colors.gray[300] : colors.gray[200],
          textColor: disabled ? colors.gray[400] : '#374151',
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
          borderColor: 'transparent',
          textColor: disabled ? colors.gray[400] : colors.accent[500],
        };
      case 'danger':
        return {
          backgroundColor: disabled ? colors.gray[400] : '#DC2626',
          borderColor: 'transparent',
          textColor: '#FFFFFF',
        };
      default:
        return {
          backgroundColor: colors.primary[500],
          borderColor: 'transparent',
          textColor: '#FFFFFF',
        };
    }
  };

  const variantStyles = getVariantStyles();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.button,
        {
          backgroundColor: variantStyles.backgroundColor,
          borderColor: variantStyles.borderColor,
          opacity: disabled || loading ? 0.6 : 1,
        },
        style,
      ]}
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      accessibilityState={{
        disabled: disabled || loading,
        ...accessibilityState,
      }}
      accessibilityLiveRegion="polite"
    >
      {loading ? (
        <Text style={[styles.text, { color: variantStyles.textColor }, textStyle]}>Loading...</Text>
      ) : (
        <>
          {icon && (
            <Ionicons
              name={icon}
              size={18}
              color={variantStyles.textColor}
              style={styles.icon}
            />
          )}
          <Text style={[styles.text, { color: variantStyles.textColor }, textStyle]}>
            {label}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 44, // Minimum touch target size
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  icon: {
    marginRight: 8,
  },
});

export default AccessibleButton;


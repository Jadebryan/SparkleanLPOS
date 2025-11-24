import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '@/app/theme/designSystem';
import { useColors } from '@/app/theme/useColors';

const { width } = Dimensions.get('window');

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose?: () => void;
  action?: {
    label: string;
    onPress: () => void;
  };
}

interface ToastConfig {
  backgroundColor: string;
  borderColor: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  textColor: string;
}

const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  duration = 3000,
  onClose,
  action,
}) => {
  const dynamicColors = useColors();
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Slide in
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Progress bar
    if (duration > 0) {
      Animated.timing(progressAnim, {
        toValue: 1,
        duration,
        useNativeDriver: false,
      }).start();
    }

    // Auto dismiss
    if (duration > 0) {
      const timer = setTimeout(() => {
        dismiss();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, []);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose?.();
    });
  };

  const getConfig = (): ToastConfig => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: colors.success[50],
          borderColor: colors.success[500],
          icon: 'checkmark-circle',
          iconColor: colors.success[600],
          textColor: colors.success[700],
        };
      case 'error':
        return {
          backgroundColor: colors.error[50],
          borderColor: colors.error[500],
          icon: 'close-circle',
          iconColor: colors.error[600],
          textColor: colors.error[700],
        };
      case 'warning':
        return {
          backgroundColor: colors.warning[50],
          borderColor: colors.warning[500],
          icon: 'warning',
          iconColor: colors.warning[600],
          textColor: colors.warning[700],
        };
      case 'info':
      default:
        return {
          backgroundColor: dynamicColors.primary[50],
          borderColor: dynamicColors.primary[500],
          icon: 'information-circle',
          iconColor: dynamicColors.primary[600],
          textColor: dynamicColors.primary[700],
        };
    }
  };

  const config = getConfig();
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <View
        style={[
          styles.toast,
          {
            backgroundColor: config.backgroundColor,
            borderColor: config.borderColor,
          },
        ]}
      >
        <Ionicons name={config.icon} size={20} color={config.iconColor} style={styles.icon} />
        
        <View style={styles.content}>
          <Text style={[styles.message, { color: config.textColor }]}>{message}</Text>
          
          {action && (
            <TouchableOpacity
              onPress={() => {
                action.onPress();
                dismiss();
              }}
              style={styles.actionButton}
            >
              <Text style={[styles.actionText, { color: config.borderColor }]}>
                {action.label}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity onPress={dismiss} style={styles.closeButton} accessibilityLabel="Close toast">
          <Ionicons name="close" size={18} color={config.textColor} />
        </TouchableOpacity>
      </View>

      {duration > 0 && (
        <View style={styles.progressBarContainer}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                width: progressWidth,
                backgroundColor: config.borderColor,
              },
            ]}
          />
        </View>
      )}
    </Animated.View>
  );
};

// Toast Container Component
interface ToastContainerProps {
  toasts: Array<ToastProps & { id: string }>;
  onRemoveToast: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onRemoveToast }) => {
  if (toasts.length === 0) return null;

  return (
    <View style={styles.toastContainer} pointerEvents="box-none">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          {...toast}
          onClose={() => onRemoveToast(toast.id)}
        />
      ))}
    </View>
  );
};

// Toast Hook/Context would go here for global state management
// For now, components can use ToastContainer directly

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 60,
    right: spacing.md,
    left: spacing.md,
    zIndex: 9999,
    alignItems: 'flex-end',
    pointerEvents: 'box-none',
  },
  container: {
    marginBottom: spacing.sm,
    width: '100%',
    maxWidth: 400,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    minHeight: 56,
  },
  icon: {
    marginRight: spacing.sm,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  message: {
    ...typography.body,
    flex: 1,
    marginRight: spacing.sm,
  },
  actionButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  actionText: {
    ...typography.label,
    fontWeight: '600',
  },
  closeButton: {
    padding: spacing.xs,
    marginLeft: spacing.xs,
  },
  progressBarContainer: {
    height: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: borderRadius.full,
    marginTop: spacing.xs,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: borderRadius.full,
  },
});

export default Toast;


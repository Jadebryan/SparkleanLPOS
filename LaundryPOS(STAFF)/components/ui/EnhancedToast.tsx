import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows } from '@/app/theme/designSystem';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  undoAction?: () => void;
  undoLabel?: string;
}

interface EnhancedToastProps {
  toast: Toast | null;
  onDismiss: (id: string) => void;
}

export const EnhancedToast: React.FC<EnhancedToastProps> = ({ toast, onDismiss }) => {
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (toast) {
      // Slide in
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 100,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto dismiss
      const duration = toast.duration || 4000;
      const timer = setTimeout(() => {
        dismiss();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [toast]);

  const dismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (toast) {
        onDismiss(toast.id);
      }
    });
  };

  if (!toast) return null;

  const getToastConfig = () => {
    switch (toast.type) {
      case 'success':
        return {
          icon: 'checkmark-circle' as const,
          color: colors.success[500],
          bgColor: colors.success[50],
          borderColor: colors.success[200],
        };
      case 'error':
        return {
          icon: 'close-circle' as const,
          color: colors.error[500],
          bgColor: colors.error[50],
          borderColor: colors.error[200],
        };
      case 'warning':
        return {
          icon: 'warning' as const,
          color: colors.warning[500],
          bgColor: colors.warning[50],
          borderColor: colors.warning[200],
        };
      case 'info':
        return {
          icon: 'information-circle' as const,
          color: colors.primary[500],
          bgColor: colors.primary[50],
          borderColor: colors.primary[200],
        };
    }
  };

  const config = getToastConfig();

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
            backgroundColor: config.bgColor,
            borderColor: config.borderColor,
          },
        ]}
      >
        <Ionicons name={config.icon} size={24} color={config.color} />
        <Text style={[styles.message, { color: config.color }]}>
          {toast.message}
        </Text>
        {toast.undoAction && (
          <TouchableOpacity
            style={styles.undoButton}
            onPress={() => {
              toast.undoAction?.();
              dismiss();
            }}
          >
            <Text style={[styles.undoText, { color: config.color }]}>
              {toast.undoLabel || 'Undo'}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={dismiss} style={styles.closeButton}>
          <Ionicons name="close" size={18} color={config.color} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 10000,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    ...shadows.lg,
    gap: spacing.sm,
  },
  message: {
    ...typography.body,
    flex: 1,
    fontWeight: '500',
  },
  undoButton: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  undoText: {
    ...typography.bodySmall,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  closeButton: {
    padding: spacing.xs,
  },
});


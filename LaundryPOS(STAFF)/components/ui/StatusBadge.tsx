import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { badgeStyles, colors } from '@/app/theme/designSystem';

type StatusType = 'paid' | 'unpaid' | 'partial' | 'pending' | 'completed' | 'approved' | 'rejected' | 'appealed';

interface StatusBadgeProps {
  status: StatusType | string;
  showIcon?: boolean;
  animated?: boolean;
  size?: 'small' | 'medium' | 'large';
  style?: any;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  showIcon = true,
  animated = false,
  size = 'medium',
  style,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const statusLower = status.toLowerCase();

  useEffect(() => {
    if (animated && (statusLower === 'pending' || statusLower === 'unpaid')) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [animated, statusLower, pulseAnim]);

  const getStatusConfig = () => {
    switch (statusLower) {
      case 'paid':
      case 'completed':
      case 'approved':
        return {
          backgroundColor: colors.success[50],
          borderColor: colors.success[500],
          textColor: colors.success[700],
          icon: 'checkmark-circle' as keyof typeof Ionicons.glyphMap,
          badgeStyle: badgeStyles.paid,
          textStyle: badgeStyles.paidText,
        };
      case 'unpaid':
      case 'rejected':
        return {
          backgroundColor: colors.error[50],
          borderColor: colors.error[500],
          textColor: colors.error[700],
          icon: 'close-circle' as keyof typeof Ionicons.glyphMap,
          badgeStyle: badgeStyles.unpaid,
          textStyle: badgeStyles.unpaidText,
        };
      case 'partial':
      case 'appealed':
        return {
          backgroundColor: colors.warning[50],
          borderColor: colors.warning[500],
          textColor: colors.warning[700],
          icon: 'time' as keyof typeof Ionicons.glyphMap,
          badgeStyle: badgeStyles.partial,
          textStyle: badgeStyles.partialText,
        };
      case 'pending':
      default:
        return {
          backgroundColor: colors.warning[50],
          borderColor: colors.warning[500],
          textColor: colors.warning[700],
          icon: 'time-outline' as keyof typeof Ionicons.glyphMap,
          badgeStyle: { backgroundColor: colors.warning[50], borderWidth: 1, borderColor: colors.warning[500] },
          textStyle: { fontSize: 12, fontWeight: '600', color: colors.warning[700] },
        };
    }
  };

  const config = getStatusConfig();
  const iconSize = size === 'small' ? 12 : size === 'large' ? 18 : 14;
  const fontSize = size === 'small' ? 11 : size === 'large' ? 15 : 12;

  const AnimatedView = animated ? Animated.View : View;

  return (
    <AnimatedView
      style={[
        badgeStyles.base,
        config.badgeStyle,
        styles.badge,
        animated && { transform: [{ scale: pulseAnim }] },
        style,
      ]}
    >
      {showIcon && (
        <Ionicons
          name={config.icon}
          size={iconSize}
          color={config.textColor}
          style={styles.icon}
        />
      )}
      <Text style={[config.textStyle, { fontSize }]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Text>
    </AnimatedView>
  );
};

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: 4,
  },
});

export default StatusBadge;


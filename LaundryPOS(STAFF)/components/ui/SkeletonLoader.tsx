import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors, spacing, borderRadius } from '@/app/theme/designSystem';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 20,
  borderRadius: borderRadiusProp,
  style,
}) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    shimmer.start();
    return () => shimmer.stop();
  }, [shimmerAnim]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width,
          height,
          borderRadius: borderRadiusProp || borderRadius.md,
          opacity,
        },
        style,
      ]}
    />
  );
};

// Pre-built skeleton components
export const SkeletonCard: React.FC<{ style?: any }> = ({ style }) => (
  <View style={[styles.cardSkeleton, style]}>
    <SkeletonLoader width="60%" height={16} style={{ marginBottom: spacing.sm }} />
    <SkeletonLoader width="40%" height={14} />
  </View>
);

export const SkeletonTableRow: React.FC<{ columns?: number }> = ({ columns = 5 }) => (
  <View style={styles.tableRow}>
    {Array.from({ length: columns }).map((_, index) => (
      <SkeletonLoader
        key={index}
        width={`${100 / columns}%`}
        height={16}
        style={{ marginHorizontal: spacing.xs }}
      />
    ))}
  </View>
);

export const SkeletonStatsCard: React.FC = () => (
  <View style={styles.statsCard}>
    <SkeletonLoader width={48} height={48} borderRadius={24} style={{ marginBottom: spacing.sm }} />
    <SkeletonLoader width="70%" height={24} style={{ marginBottom: spacing.xs }} />
    <SkeletonLoader width="50%" height={14} />
  </View>
);

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: colors.gray[200],
  },
  cardSkeleton: {
    backgroundColor: colors.background.primary,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    marginBottom: spacing.md,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  statsCard: {
    backgroundColor: colors.background.primary,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border.light,
    alignItems: 'center',
    minWidth: 180,
    flex: 1,
  },
});

export default SkeletonLoader;


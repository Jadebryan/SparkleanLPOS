import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { useShimmer } from './animations';
import { colors, borderRadius } from '@/app/theme/designSystem';

interface ShimmerLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export const ShimmerLoader: React.FC<ShimmerLoaderProps> = ({
  width = '100%',
  height = 20,
  borderRadius: borderRadiusProp,
  style,
}) => {
  const opacity = useShimmer();

  return (
    <Animated.View
      style={[
        styles.shimmer,
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

// Shimmer card component
export const ShimmerCard: React.FC<{ style?: any }> = ({ style }) => {
  return (
    <View style={[styles.card, style]}>
      <ShimmerLoader height={24} width="60%" style={styles.title} />
      <ShimmerLoader height={16} width="100%" style={styles.line} />
      <ShimmerLoader height={16} width="80%" style={styles.line} />
      <View style={styles.footer}>
        <ShimmerLoader height={16} width="40%" />
        <ShimmerLoader height={16} width="30%" />
      </View>
    </View>
  );
};

// Shimmer table row component
export const ShimmerTableRow: React.FC<{ columns?: number }> = ({ columns = 6 }) => {
  return (
    <View style={styles.row}>
      {Array.from({ length: columns }).map((_, index) => (
        <ShimmerLoader
          key={index}
          height={16}
          width={`${100 / columns}%`}
          style={styles.cell}
        />
      ))}
    </View>
  );
};

// Shimmer stats card
export const ShimmerStatsCard: React.FC = () => {
  return (
    <View style={styles.statsCard}>
      <ShimmerLoader height={20} width="50%" style={styles.statsLabel} />
      <ShimmerLoader height={32} width="70%" style={styles.statsValue} />
      <ShimmerLoader height={14} width="40%" style={styles.statsChange} />
    </View>
  );
};

const styles = StyleSheet.create({
  shimmer: {
    backgroundColor: colors.gray[200],
  },
  card: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  title: {
    marginBottom: 12,
  },
  line: {
    marginBottom: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  cell: {
    marginHorizontal: 4,
  },
  statsCard: {
    backgroundColor: colors.background.primary,
    borderRadius: borderRadius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  statsLabel: {
    marginBottom: 8,
  },
  statsValue: {
    marginBottom: 8,
  },
  statsChange: {},
});


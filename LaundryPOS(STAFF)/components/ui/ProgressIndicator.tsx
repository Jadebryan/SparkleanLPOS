import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius } from '@/app/theme/designSystem';

interface ProgressIndicatorProps {
  current: number;
  total: number;
  label?: string;
  showPercentage?: boolean;
  color?: string;
  size?: 'small' | 'medium' | 'large';
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  current,
  total,
  label,
  showPercentage = true,
  color = colors.primary[500],
  size = 'medium',
}) => {
  const percentage = total > 0 ? Math.min((current / total) * 100, 100) : 0;
  
  const sizeConfig = {
    small: { height: 4, fontSize: 10 },
    medium: { height: 6, fontSize: 12 },
    large: { height: 8, fontSize: 14 },
  };

  const config = sizeConfig[size];

  return (
    <View style={styles.container}>
      {label && (
        <View style={styles.labelRow}>
          <Text style={styles.label}>{label}</Text>
          {showPercentage && (
            <Text style={[styles.percentage, { fontSize: config.fontSize }]}>
              {Math.round(percentage)}%
            </Text>
          )}
        </View>
      )}
      <View style={[styles.track, { height: config.height }]}>
        <View
          style={[
            styles.progress,
            {
              width: `${percentage}%`,
              height: config.height,
              backgroundColor: color,
            },
          ]}
        />
      </View>
      {!label && showPercentage && (
        <Text style={[styles.percentage, styles.percentageBelow, { fontSize: config.fontSize }]}>
          {current} / {total} ({Math.round(percentage)}%)
        </Text>
      )}
    </View>
  );
};

interface MiniChartProps {
  data: number[];
  color?: string;
  height?: number;
  showLabels?: boolean;
}

export const MiniChart: React.FC<MiniChartProps> = ({
  data,
  color = colors.primary[500],
  height = 40,
  showLabels = false,
}) => {
  const maxValue = Math.max(...data, 1);

  return (
    <View style={styles.chartContainer}>
      <View style={[styles.chart, { height }]}>
        {data.map((value, index) => (
          <View
            key={index}
            style={[
              styles.bar,
              {
                height: `${(value / maxValue) * 100}%`,
                backgroundColor: color,
                opacity: 0.7 + (index % 3) * 0.1,
              },
            ]}
          />
        ))}
      </View>
      {showLabels && (
        <View style={styles.chartLabels}>
          {data.map((_, index) => (
            <Text key={index} style={styles.chartLabel}>
              {index + 1}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  label: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },
  percentage: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    fontWeight: '600',
  },
  percentageBelow: {
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  track: {
    width: '100%',
    backgroundColor: colors.gray[200],
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  progress: {
    borderRadius: borderRadius.full,
  },
  chartContainer: {
    width: '100%',
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    gap: 2,
    marginBottom: spacing.xs,
  },
  bar: {
    flex: 1,
    borderRadius: borderRadius.sm,
    minHeight: 4,
  },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  chartLabel: {
    ...typography.caption,
    color: colors.text.tertiary,
    fontSize: 10,
  },
});


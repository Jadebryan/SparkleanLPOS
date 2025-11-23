import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, shadows, cardStyles } from '@/app/theme/designSystem';
import { useFadeIn } from './animations';
import { Animated } from 'react-native';

interface StatItem {
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  onPress?: () => void;
}

interface TodaySummaryProps {
  title?: string;
  stats: StatItem[];
  onViewAll?: () => void;
}

export const TodaySummary: React.FC<TodaySummaryProps> = ({
  title = "Today's Summary",
  stats,
  onViewAll,
}) => {
  const fadeAnim = useFadeIn(300);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="calendar-outline" size={16} color={colors.primary[500]} />
          <Text style={styles.title}>{title}</Text>
        </View>
        {onViewAll && (
          <TouchableOpacity onPress={onViewAll} style={styles.viewAllButton}>
            <Text style={styles.viewAllText}>View All</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary[500]} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.statsGrid}>
        {stats.map((stat, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.statCard, stat.onPress && styles.statCardPressable]}
            onPress={stat.onPress}
            activeOpacity={stat.onPress ? 0.7 : 1}
          >
            <View style={[styles.statIconContainer, { backgroundColor: `${stat.color}15` }]}>
              <Ionicons name={stat.icon} size={20} color={stat.color} />
            </View>
            <View style={styles.statContent}>
              <Text style={styles.statLabel}>{stat.label}</Text>
              <Text style={[styles.statValue, { color: stat.color }]}>
                {stat.value}
              </Text>
              {stat.trend && (
                <View style={styles.trendContainer}>
                  <Ionicons
                    name={stat.trend.isPositive ? 'trending-up' : 'trending-down'}
                    size={12}
                    color={stat.trend.isPositive ? colors.success[600] : colors.error[600]}
                  />
                  <Text
                    style={[
                      styles.trendText,
                      {
                        color: stat.trend.isPositive
                          ? colors.success[600]
                          : colors.error[600],
                      },
                    ]}
                  >
                    {stat.trend.isPositive ? '+' : ''}
                    {stat.trend.value}%
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...cardStyles.base,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  title: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 4,
    paddingHorizontal: spacing.xs,
  },
  viewAllText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.primary[500],
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.background.secondary,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border.light,
    ...shadows.sm,
  },
  statCardPressable: {
    ...shadows.md,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    ...typography.caption,
    fontSize: 11,
    color: colors.text.secondary,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  trendText: {
    ...typography.caption,
    fontWeight: '600',
    fontSize: 10,
  },
});


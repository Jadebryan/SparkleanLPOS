import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import FilterChip from './FilterChip';
import { colors, spacing, borderRadius, typography } from '@/app/theme/designSystem';

export type FilterOption = {
  label: string;
  value: string;
  icon?: keyof typeof Ionicons.glyphMap;
  count?: number;
};

interface InlineFiltersProps {
  filters: FilterOption[];
  activeFilters: string[];
  onFilterToggle: (value: string) => void;
  onClearAll?: () => void;
  title?: string;
  showClearAll?: boolean;
}

const InlineFilters: React.FC<InlineFiltersProps> = ({
  filters,
  activeFilters,
  onFilterToggle,
  onClearAll,
  title = 'Filters',
  showClearAll = true,
}) => {
  const activeCount = activeFilters.length;

  return (
    <View style={styles.container}>
      {title && (
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {activeCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{activeCount}</Text>
            </View>
          )}
        </View>
      )}
      
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsContainer}
      >
        {filters.map((filter) => (
          <FilterChip
            key={filter.value}
            label={filter.label}
            active={activeFilters.includes(filter.value)}
            onPress={() => onFilterToggle(filter.value)}
            icon={filter.icon}
            count={filter.count}
          />
        ))}
        
        {showClearAll && activeCount > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={onClearAll}
            accessibilityLabel="Clear all filters"
            accessibilityRole="button"
          >
            <Ionicons name="close-circle" size={16} color={colors.error[600]} />
            <Text style={styles.clearButtonText}>Clear All</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.label,
    color: colors.text.primary,
    marginRight: spacing.sm,
  },
  badge: {
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: colors.text.inverse,
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
  },
  chipsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.xs,
    paddingRight: spacing.sm,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.error[50],
    borderWidth: 1,
    borderColor: colors.error[200],
    marginLeft: spacing.sm,
    marginBottom: spacing.sm,
    minHeight: 32,
  },
  clearButtonText: {
    ...typography.caption,
    color: colors.error[700],
    fontWeight: '600',
    marginLeft: spacing.xs,
  },
});

export default InlineFilters;


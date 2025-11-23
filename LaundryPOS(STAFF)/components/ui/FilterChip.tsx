import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, typography } from '@/app/theme/designSystem';

interface FilterChipProps {
  label: string;
  active?: boolean;
  onPress: () => void;
  onRemove?: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
  count?: number;
}

const FilterChip: React.FC<FilterChipProps> = ({
  label,
  active = false,
  onPress,
  onRemove,
  icon,
  count,
}) => {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      accessibilityLabel={`${label} filter${active ? ' active' : ''}`}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      {icon && (
        <Ionicons
          name={icon}
          size={14}
          color={active ? colors.primary[600] : colors.gray[600]}
          style={styles.icon}
        />
      )}
      <Text style={[styles.label, active && styles.labelActive]}>
        {label}
      </Text>
      {count !== undefined && count > 0 && (
        <View style={[styles.countBadge, active && styles.countBadgeActive]}>
          <Text style={[styles.countText, active && styles.countTextActive]}>
            {count}
          </Text>
        </View>
      )}
      {onRemove && (
        <TouchableOpacity
          onPress={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          style={styles.removeButton}
          accessibilityLabel={`Remove ${label} filter`}
          accessibilityRole="button"
        >
          <Ionicons name="close-circle" size={16} color={active ? colors.primary[600] : colors.gray[500]} />
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background.primary,
    borderWidth: 1,
    borderColor: colors.border.light,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
    minHeight: 32,
  },
  chipActive: {
    backgroundColor: colors.primary[50],
    borderColor: colors.primary[500],
  },
  icon: {
    marginRight: spacing.xs,
  },
  label: {
    ...typography.caption,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  labelActive: {
    color: colors.primary[700],
    fontWeight: '600',
  },
  countBadge: {
    marginLeft: spacing.xs,
    backgroundColor: colors.gray[200],
    borderRadius: borderRadius.full,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeActive: {
    backgroundColor: colors.primary[100],
  },
  countText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.gray[700],
  },
  countTextActive: {
    color: colors.primary[700],
  },
  removeButton: {
    marginLeft: spacing.xs,
    padding: 2,
  },
});

export default FilterChip;


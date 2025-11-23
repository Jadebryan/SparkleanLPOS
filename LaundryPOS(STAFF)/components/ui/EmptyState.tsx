import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, buttonStyles } from '@/app/theme/designSystem';

interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  style?: any;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'document-outline',
  title,
  message,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  style,
}) => {
  return (
    <View style={[styles.container, style]}>
      <View style={styles.iconContainer}>
        <Ionicons name={icon} size={64} color={colors.gray[300]} />
      </View>
      
      <Text style={styles.title}>{title}</Text>
      
      {message && (
        <Text style={styles.message}>{message}</Text>
      )}
      
      {(actionLabel || secondaryActionLabel) && (
        <View style={styles.actions}>
          {actionLabel && onAction && (
            <TouchableOpacity
              style={[buttonStyles.primary, styles.actionButton]}
              onPress={onAction}
              accessibilityLabel={actionLabel}
              accessibilityRole="button"
            >
              <Ionicons name="add-circle-outline" size={18} color={colors.text.inverse} />
              <Text style={buttonStyles.primaryText}>{actionLabel}</Text>
            </TouchableOpacity>
          )}
          
          {secondaryActionLabel && onSecondaryAction && (
            <TouchableOpacity
              style={[buttonStyles.secondary, styles.actionButton]}
              onPress={onSecondaryAction}
              accessibilityLabel={secondaryActionLabel}
              accessibilityRole="button"
            >
              <Text style={buttonStyles.secondaryText}>{secondaryActionLabel}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

// Pre-built empty states for common scenarios
export const EmptyOrders: React.FC<{ onCreateOrder?: () => void }> = ({ onCreateOrder }) => (
  <EmptyState
    icon="receipt-outline"
    title="No Orders Found"
    message="Get started by creating your first order"
    actionLabel="Create Order"
    onAction={onCreateOrder}
  />
);

export const EmptyCustomers: React.FC<{ onAddCustomer?: () => void }> = ({ onAddCustomer }) => (
  <EmptyState
    icon="people-outline"
    title="No Customers Yet"
    message="Add your first customer to start managing orders"
    actionLabel="Add Customer"
    onAction={onAddCustomer}
  />
);

export const EmptyExpenses: React.FC<{ onSubmitRequest?: () => void }> = ({ onSubmitRequest }) => (
  <EmptyState
    icon="receipt-outline"
    title="No Expense Requests"
    message="Submit your first expense request to get started"
    actionLabel="Submit Request"
    onAction={onSubmitRequest}
  />
);

export const EmptySearchResults: React.FC<{ searchTerm: string; onClearSearch?: () => void }> = ({
  searchTerm,
  onClearSearch,
}) => (
  <EmptyState
    icon="search-outline"
    title={`No results for "${searchTerm}"`}
    message="Try adjusting your search terms or filters"
    actionLabel="Clear Search"
    onAction={onClearSearch}
  />
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['2xl'],
    minHeight: 300,
  },
  iconContainer: {
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h3,
    textAlign: 'center',
    marginBottom: spacing.sm,
    color: colors.text.primary,
  },
  message: {
    ...typography.body,
    textAlign: 'center',
    color: colors.text.secondary,
    marginBottom: spacing.xl,
    maxWidth: 400,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  actionButton: {
    minWidth: 160,
  },
});

export default EmptyState;


import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing, borderRadius, buttonStyles } from '@/app/theme/designSystem';
import { useFadeIn } from './animations';
import { Animated } from 'react-native';

interface EnhancedEmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  illustration?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  tips?: string[];
  style?: any;
}

export const EnhancedEmptyState: React.FC<EnhancedEmptyStateProps> = ({
  icon = 'document-outline',
  title,
  message,
  illustration,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  tips,
  style,
}) => {
  const fadeAnim = useFadeIn(400);

  const defaultIllustration = (
    <View style={styles.illustrationContainer}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={64} color={colors.primary[300]} />
      </View>
      <View style={styles.decorativeCircle1} />
      <View style={styles.decorativeCircle2} />
    </View>
  );

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }, style]}>
      {illustration || defaultIllustration}
      
      <Text style={styles.title}>{title}</Text>
      
      {message && (
        <Text style={styles.message}>{message}</Text>
      )}

      {tips && tips.length > 0 && (
        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>Quick Tips:</Text>
          {tips.map((tip, index) => (
            <View key={index} style={styles.tipItem}>
              <Ionicons name="bulb-outline" size={16} color={colors.warning[500]} />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>
      )}
      
      {(actionLabel || secondaryActionLabel) && (
        <View style={styles.actions}>
          {actionLabel && onAction && (
            <TouchableOpacity
              style={[buttonStyles.primary, styles.actionButton]}
              onPress={onAction}
              activeOpacity={0.8}
            >
              <Ionicons name="add-circle-outline" size={20} color={colors.text.inverse} />
              <Text style={buttonStyles.primaryText}>{actionLabel}</Text>
            </TouchableOpacity>
          )}
          
          {secondaryActionLabel && onSecondaryAction && (
            <TouchableOpacity
              style={[buttonStyles.secondary, styles.actionButton]}
              onPress={onSecondaryAction}
              activeOpacity={0.8}
            >
              <Text style={buttonStyles.secondaryText}>{secondaryActionLabel}</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </Animated.View>
  );
};

// Pre-built enhanced empty states
export const EnhancedEmptyOrders: React.FC<{ onCreateOrder?: () => void }> = ({ onCreateOrder }) => (
  <EnhancedEmptyState
    icon="receipt-outline"
    title="No Orders Yet"
    message="Start managing your laundry orders by creating your first order"
    actionLabel="Create Order"
    onAction={onCreateOrder}
    tips={[
      'Orders help you track customer laundry services',
      'You can add multiple services per order',
      'Track payment status and completion progress'
    ]}
  />
);

export const EnhancedEmptyCustomers: React.FC<{ onAddCustomer?: () => void }> = ({ onAddCustomer }) => (
  <EnhancedEmptyState
    icon="people-outline"
    title="No Customers Found"
    message="Add customers to start creating orders and tracking their laundry history"
    actionLabel="Add Customer"
    onAction={onAddCustomer}
    tips={[
      'Customers help you track order history',
      'View total orders and spending per customer',
      'Quick access to customer contact information'
    ]}
  />
);

export const EnhancedEmptyExpenses: React.FC<{ onSubmitRequest?: () => void }> = ({ onSubmitRequest }) => (
  <EnhancedEmptyState
    icon="receipt-outline"
    title="No Expense Requests"
    message="Submit expense requests for supplies, utilities, or other business expenses"
    actionLabel="Submit Request"
    onAction={onSubmitRequest}
    tips={[
      'Attach receipts or photos as proof',
      'Categorize expenses for better tracking',
      'Track approval status in real-time'
    ]}
  />
);

export const EnhancedEmptySearchResults: React.FC<{ 
  searchTerm: string; 
  onClearSearch?: () => void;
  suggestions?: string[];
}> = ({ searchTerm, onClearSearch, suggestions }) => (
  <EnhancedEmptyState
    icon="search-outline"
    title={`No results for "${searchTerm}"`}
    message="Try adjusting your search terms or filters to find what you're looking for"
    actionLabel="Clear Search"
    onAction={onClearSearch}
    tips={suggestions || [
      'Check for spelling errors',
      'Try different keywords',
      'Use filters to narrow down results'
    ]}
  />
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing['2xl'],
    minHeight: 400,
  },
  illustrationContainer: {
    position: 'relative',
    marginBottom: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    width: 200,
    height: 200,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary[200],
    zIndex: 2,
  },
  decorativeCircle1: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.primary[100],
    opacity: 0.5,
    zIndex: 1,
  },
  decorativeCircle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: colors.primary[50],
    opacity: 0.3,
    zIndex: 0,
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
    lineHeight: 24,
  },
  tipsContainer: {
    width: '100%',
    maxWidth: 400,
    marginBottom: spacing.xl,
    padding: spacing.lg,
    backgroundColor: colors.warning[50],
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.warning[200],
  },
  tipsTitle: {
    ...typography.label,
    color: colors.warning[700],
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  tipText: {
    ...typography.bodySmall,
    color: colors.warning[800],
    flex: 1,
    lineHeight: 20,
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


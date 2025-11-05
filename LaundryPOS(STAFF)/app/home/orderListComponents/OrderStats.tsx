import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type OrderStatsProps = {
  totalOrders: number;
  paidOrders: number;
  unpaidOrders: number;
  totalRevenue: number;
  pendingOrders?: number;
  completedOrders?: number;
};

const OrderStats: React.FC<OrderStatsProps> = ({
  totalOrders,
  paidOrders,
  unpaidOrders,
  totalRevenue,
  pendingOrders = 0,
  completedOrders = 0,
}) => {
  return (
    <View style={styles.statsContainer}>
      {/* Total Orders */}
      <View style={styles.statCard}>
        <View style={[styles.statIconContainer, { backgroundColor: '#EFF6FF' }]}>
          <Ionicons name="document-text-outline" size={24} color="#2563EB" />
        </View>
        <View style={styles.statContent}>
          <Text style={styles.statLabel}>Total Orders</Text>
          <Text style={styles.statValue}>{totalOrders}</Text>
        </View>
      </View>

      {/* Paid Orders */}
      <View style={styles.statCard}>
        <View style={[styles.statIconContainer, { backgroundColor: '#F0FDF4' }]}>
          <Ionicons name="checkmark-circle-outline" size={24} color="#16A34A" />
        </View>
        <View style={styles.statContent}>
          <Text style={styles.statLabel}>Paid</Text>
          <Text style={[styles.statValue, { color: '#16A34A' }]}>{paidOrders}</Text>
        </View>
      </View>

      {/* Unpaid Orders */}
      <View style={styles.statCard}>
        <View style={[styles.statIconContainer, { backgroundColor: '#FEF2F2' }]}>
          <Ionicons name="close-circle-outline" size={24} color="#DC2626" />
        </View>
        <View style={styles.statContent}>
          <Text style={styles.statLabel}>Unpaid</Text>
          <Text style={[styles.statValue, { color: '#DC2626' }]}>{unpaidOrders}</Text>
        </View>
      </View>

      {/* Total Revenue */}
      <View style={styles.statCard}>
        <View style={[styles.statIconContainer, { backgroundColor: '#FFFBEB' }]}>
          <Ionicons name="cash-outline" size={24} color="#F59E0B" />
        </View>
        <View style={styles.statContent}>
          <Text style={styles.statLabel}>Total Revenue</Text>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>
            ₱{totalRevenue.toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Pending Orders */}
      <View style={styles.statCard}>
        <View style={[styles.statIconContainer, { backgroundColor: '#FEF3C7' }]}>
          <Ionicons name="time-outline" size={24} color="#F59E0B" />
        </View>
        <View style={styles.statContent}>
          <Text style={styles.statLabel}>Pending</Text>
          <Text style={[styles.statValue, { color: '#F59E0B' }]}>{pendingOrders}</Text>
        </View>
      </View>

      {/* Completed Orders */}
      <View style={styles.statCard}>
        <View style={[styles.statIconContainer, { backgroundColor: '#D1FAE5' }]}>
          <Ionicons name="checkmark-done-outline" size={24} color="#10B981" />
        </View>
        <View style={styles.statContent}>
          <Text style={styles.statLabel}>Completed</Text>
          <Text style={[styles.statValue, { color: '#10B981' }]}>{completedOrders}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
});

export default OrderStats;


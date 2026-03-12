import React from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { useColors } from '@/app/theme/useColors';

export type FilterStatus = 'All' | 'Pending' | 'In Progress' | 'Ready' | 'Completed';
export type FilterPayment = 'All' | 'Paid' | 'Unpaid' | 'Partial';
export type SortBy = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';

type SearchFilterProps = {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  showDrafts?: boolean;
  onToggleDrafts?: () => void;
  filterStatus?: FilterStatus;
  setFilterStatus?: (v: FilterStatus) => void;
  filterPayment?: FilterPayment;
  setFilterPayment?: (v: FilterPayment) => void;
  sortBy?: SortBy;
  setSortBy?: (v: SortBy) => void;
};

const SearchFilter: React.FC<SearchFilterProps> = ({ 
  searchQuery, 
  setSearchQuery,
  showDrafts = false,
  onToggleDrafts,
  filterStatus = 'All',
  setFilterStatus,
  filterPayment = 'All',
  setFilterPayment,
  sortBy = 'date-desc',
  setSortBy,
}) => {
  const dynamicColors = useColors();
  return (
    <View style={styles.container}>
      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={20} color="#9CA3AF" style={styles.searchIcon} />
        <TextInput
          placeholder="Search by order ID or customer name..."
          placeholderTextColor="#9CA3AF"
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          accessibilityLabel="Search orders"
          accessibilityHint="Type to search by order ID or customer name"
          autoCorrect={false}
          autoCapitalize="none"
        />
      </View>

      {/* Filters row */}
      <View style={styles.filtersRow}>
        {/* Drafts toggle */}
        <TouchableOpacity 
          style={[
            styles.filterButton, 
            showDrafts && [
              styles.filterButtonActive, 
              { backgroundColor: dynamicColors.primary[50], borderColor: dynamicColors.primary[500] }
            ]
          ]}
          onPress={onToggleDrafts}
          accessibilityLabel={showDrafts ? "Show all orders" : "Show draft orders"}
          accessibilityRole="button"
          accessibilityState={{ selected: showDrafts }}
        >
          <Ionicons 
            name={showDrafts ? "document-text" : "document-text-outline"} 
            size={16} 
            color={showDrafts ? dynamicColors.primary[500] : "#6B7280"} 
          />
          <Text style={[styles.filterButtonText, showDrafts && { color: dynamicColors.primary[500] }]}>
            {showDrafts ? "All" : "Drafts"}
          </Text>
        </TouchableOpacity>

        {/* Status filter */}
        {setFilterStatus && (
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Status</Text>
            <View style={styles.filterOptions}>
              {(['All', 'Pending', 'In Progress', 'Ready', 'Completed'] as FilterStatus[]).map((s) => (
                <TouchableOpacity
                  key={s}
                  style={[styles.filterChip, filterStatus === s && { backgroundColor: dynamicColors.primary[100], borderColor: dynamicColors.primary[500] }]}
                  onPress={() => setFilterStatus(s)}
                >
                  <Text style={[styles.filterChipText, filterStatus === s && { color: dynamicColors.primary[700], fontWeight: '600' }]}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Payment filter */}
        {setFilterPayment && (
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Payment</Text>
            <View style={styles.filterOptions}>
              {(['All', 'Paid', 'Unpaid', 'Partial'] as FilterPayment[]).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.filterChip, filterPayment === p && { backgroundColor: dynamicColors.primary[100], borderColor: dynamicColors.primary[500] }]}
                  onPress={() => setFilterPayment(p)}
                >
                  <Text style={[styles.filterChipText, filterPayment === p && { color: dynamicColors.primary[700], fontWeight: '600' }]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Sort */}
        {setSortBy && (
          <View style={styles.filterGroup}>
            <Text style={styles.filterLabel}>Sort</Text>
            <View style={styles.filterOptions}>
              <TouchableOpacity
                style={[styles.filterChip, sortBy === 'date-desc' && { backgroundColor: dynamicColors.primary[100], borderColor: dynamicColors.primary[500] }]}
                onPress={() => setSortBy('date-desc')}
              >
                <Text style={[styles.filterChipText, sortBy === 'date-desc' && { color: dynamicColors.primary[700], fontWeight: '600' }]}>Date ↓</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, sortBy === 'date-asc' && { backgroundColor: dynamicColors.primary[100], borderColor: dynamicColors.primary[500] }]}
                onPress={() => setSortBy('date-asc')}
              >
                <Text style={[styles.filterChipText, sortBy === 'date-asc' && { color: dynamicColors.primary[700], fontWeight: '600' }]}>Date ↑</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, sortBy === 'amount-desc' && { backgroundColor: dynamicColors.primary[100], borderColor: dynamicColors.primary[500] }]}
                onPress={() => setSortBy('amount-desc')}
              >
                <Text style={[styles.filterChipText, sortBy === 'amount-desc' && { color: dynamicColors.primary[700], fontWeight: '600' }]}>Amount ↓</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterChip, sortBy === 'amount-asc' && { backgroundColor: dynamicColors.primary[100], borderColor: dynamicColors.primary[500] }]}
                onPress={() => setSortBy('amount-asc')}
              >
                <Text style={[styles.filterChipText, sortBy === 'amount-asc' && { color: dynamicColors.primary[700], fontWeight: '600' }]}>Amount ↑</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

export default SearchFilter;

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    gap: 12,
  },
  filtersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
  },
  filterGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  filterLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  filterChipText: {
    fontSize: 13,
    color: '#374151',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    height: 44,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    paddingVertical: 0,
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  filterButtonActive: {
    backgroundColor: '#EFF6FF',
    // borderColor: '#2563EB', // Now using dynamic color via inline style
  },
  filterButtonTextActive: {
    // color: '#2563EB', // Now using dynamic color via inline style
    fontWeight: '600',
  },
});

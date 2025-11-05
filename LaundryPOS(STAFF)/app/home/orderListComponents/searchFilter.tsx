import React from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from "react-native";
import { Ionicons } from '@expo/vector-icons';

type SearchFilterProps = {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  showDrafts?: boolean;
  onToggleDrafts?: () => void;
  onOpenFilters?: () => void;
};

const SearchFilter: React.FC<SearchFilterProps> = ({ 
  searchQuery, 
  setSearchQuery,
  showDrafts = false,
  onToggleDrafts,
  onOpenFilters,
}) => {
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
        />
      </View>

      {/* Filter Buttons */}
      <View style={styles.filterContainer}>
        <TouchableOpacity 
          style={[styles.filterButton, showDrafts && styles.filterButtonActive]}
          onPress={onToggleDrafts}
        >
          <Ionicons 
            name={showDrafts ? "document-text" : "document-text-outline"} 
            size={16} 
            color={showDrafts ? "#2563EB" : "#6B7280"} 
          />
          <Text style={[styles.filterButtonText, showDrafts && styles.filterButtonTextActive]}>
            {showDrafts ? "All Orders" : "Drafts"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={onOpenFilters}
        >
          <Ionicons name="options-outline" size={16} color="#6B7280" />
          <Text style={styles.filterButtonText}>Filters</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default SearchFilter;

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchContainer: {
    flex: 1,
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
    borderColor: '#2563EB',
  },
  filterButtonTextActive: {
    color: '#2563EB',
    fontWeight: '600',
  },
});

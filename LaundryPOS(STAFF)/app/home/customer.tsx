import React, { useState, useRef, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Text, RefreshControl, Modal, Animated, Dimensions, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GlobalStyles from "../styles/GlobalStyle";
import { colors, spacing, borderRadius, cardStyles, buttonStyles, badgeStyles } from '@/app/theme/designSystem';
import { useColors } from '@/app/theme/useColors';
import { useButtonStyles } from '@/app/theme/useButtonStyles';
import { usePermissions } from '@/hooks/usePermissions';

// Components
import ModernSidebar from './components/ModernSidebar';
import Header from './components/Header';
import CustomerTable from './manageCustomersComponents/customerTable';
import AddCustomerModal from './addOrderComponents/AddCustomerModal';
import { API_BASE_URL } from '@/constants/api';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { 
  exportCustomersToCSV, 
  exportCustomersToExcel, 
  exportCustomersToPDF,
  getExportFilename 
} from '@/utils/exportUtils';
import { useToast } from '@/app/context/ToastContext';
import { EnhancedEmptyCustomers } from '@/components/ui/EnhancedEmptyState';
import { FloatingActionButton } from '@/components/ui/FloatingActionButton';

type Customer = {
  _id: string;
  customerName: string;
  phoneNumber: string;
  email?: string;
  totalOrders?: number;
  totalSpent?: number;
  lastOrder?: string;
  isArchived?: boolean;
  stationId?: string;
};

export default function Customer() {
  const dynamicColors = useColors();
  const dynamicButtonStyles = useButtonStyles();
  const { showSuccess, showError } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState('name-asc');
  const [refreshing, setRefreshing] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [exportButtonLayout, setExportButtonLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const exportButtonRef = useRef<any>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const spinValue = useRef(new Animated.Value(0)).current;
  const [loading, setLoading] = useState(false);
  const { hasPermission: hasPermissionFor } = usePermissions();
  const canArchiveCustomers = hasPermissionFor('customers', 'archive');
  const canUnarchiveCustomers = hasPermissionFor('customers', 'unarchive');

  // Global customer search (across all branches)
  const [globalSearchTerm, setGlobalSearchTerm] = useState("");
  const [globalResults, setGlobalResults] = useState<Customer[]>([]);
  const [isGlobalSearchLoading, setIsGlobalSearchLoading] = useState(false);
  const [isGlobalModalVisible, setIsGlobalModalVisible] = useState(false);

  // Calculate stats
  const totalCustomers = customers.length;
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  // Calculate new customers this month
  // If API provides createdAt, use it; otherwise estimate based on orders
  const newThisMonth = customers.filter(c => {
    // If customer has no orders or last order is recent, consider them new
    // This is an approximation - ideally API would provide createdAt date
    if ((c.totalOrders || 0) === 0) return true;
    if (c.lastOrder && c.lastOrder !== 'No orders yet') {
      try {
        const lastOrderDate = new Date(c.lastOrder);
        const monthDiff = (now.getFullYear() - lastOrderDate.getFullYear()) * 12 + (now.getMonth() - lastOrderDate.getMonth());
        return monthDiff <= 1; // Created within last month
      } catch {
        return false;
      }
    }
    return false;
  }).length;
  
  const totalRevenue = customers.reduce((sum, c) => sum + (c.totalSpent || 0), 0);
  const totalOrders = customers.reduce((sum, c) => sum + (c.totalOrders || 0), 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const handleSearch = (term: string) => {
    setSearchTerm(term);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    // Refresh will be handled by CustomerTable component
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleReset = async () => {
    // Refresh customer data
    setIsRefreshing(true);
    
    // Start spinning animation
    spinValue.setValue(0);
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    ).start();
    
    try {
      // Increment refreshTrigger to force CustomerTable to remount and fetch fresh data
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error refreshing customers:', error);
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
        spinValue.stopAnimation();
        spinValue.setValue(0);
      }, 1000);
    }
  };

  const handleExport = (format: 'CSV' | 'Excel' | 'PDF') => {
    // Get filtered customers based on search and sort
    const customersToExport = customers.filter(customer => {
      // Apply search filter
      const matchesSearch = searchTerm === "" || 
        (customer.customerName ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (customer.email ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (customer.phoneNumber ?? "").includes(searchTerm);
      
      return matchesSearch;
    });

    if (customersToExport.length === 0) {
      showError("No customers to export");
      return;
    }

    const filename = getExportFilename('customers');
    
    const performExport = async () => {
      try {
        switch (format) {
          case 'CSV':
            exportCustomersToCSV(customersToExport, filename);
            break;
          case 'Excel':
            exportCustomersToExcel(customersToExport, filename);
            break;
          case 'PDF':
            await exportCustomersToPDF(customersToExport, filename);
            break;
        }
        
        showSuccess(`${customersToExport.length} customers exported as ${format}`);
      } catch (error: any) {
        showError(error.message || "Export failed. Please try again.");
        console.error('Export error:', error);
      }
    };

    performExport();
  };

  const handleCustomerAdded = (newCustomer: Customer) => {
    setCustomers([...customers, newCustomer]);
    setIsAddModalOpen(false);
    
    // Trigger CustomerTable refresh
    setRefreshTrigger(prev => prev + 1);
    
    // Show success toast
    showSuccess(`Customer "${newCustomer.customerName}" added successfully!`);
  };

  // Global customer search handler
  const handleGlobalSearch = async () => {
    const term = globalSearchTerm.trim();
    if (term.length < 2) {
      showError('Please enter at least 2 characters to search globally.');
      return;
    }

    try {
      setIsGlobalSearchLoading(true);
      const token =
        (await AsyncStorage.getItem('token')) || (await AsyncStorage.getItem('userToken'));
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await axios.get(
        `${API_BASE_URL}/customers/global/search?search=${encodeURIComponent(term)}`,
        { headers }
      );
      const payload = Array.isArray(res.data?.data) ? res.data.data : res.data || [];
      const rows: any[] = Array.isArray(payload)
        ? payload
        : Array.isArray(payload.customers)
        ? payload.customers
        : [];

      const mapped: Customer[] = rows.map((c: any) => ({
        _id: c._id || c.id,
        customerName: c.name || c.customerName || '',
        phoneNumber: c.phone || c.phoneNumber || '',
        email: c.email || '',
        totalOrders: c.totalOrders || 0,
        totalSpent: c.totalSpent || 0,
        lastOrder: c.lastOrder ? new Date(c.lastOrder).toLocaleDateString() : 'No orders yet',
        isArchived: c.isArchived || false,
        stationId: c.stationId || '',
      }));

      setGlobalResults(mapped);
      setIsGlobalModalVisible(true);
    } catch (error: any) {
      console.error('Global customer search error:', error);
      showError(error?.message || 'Failed to search customers globally.');
      setGlobalResults([]);
    } finally {
      setIsGlobalSearchLoading(false);
    }
  };

  // Attach an existing customer from another branch to this branch
  const handleAttachCustomerToBranch = async (customer: Customer) => {
    try {
      const token =
        (await AsyncStorage.getItem('token')) || (await AsyncStorage.getItem('userToken'));
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      await axios.put(`${API_BASE_URL}/customers/${customer._id}/assign-station`, {}, { headers });

      showSuccess(
        `Customer "${customer.customerName}" has been assigned to this branch.`
      );

      // Refresh local customers list so the newly assigned customer shows up
      setRefreshTrigger((prev) => prev + 1);
      setIsGlobalModalVisible(false);
    } catch (error: any) {
      console.error('Attach customer to branch error:', error);
      showError(error?.response?.data?.message || error?.message || 'Failed to assign customer.');
    }
  };

  return (
    <View style={GlobalStyles.mainLayout}>
      {/* Modern Sidebar */}
      <ModernSidebar />

      {/* MAIN CONTENT */}
      <View style={GlobalStyles.mainContent}>
        {/* Modern Header */}
        <Header title="Customer Management" />

        {/* Content - ScrollView for page scrolling */}
        <ScrollView 
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 16, paddingBottom: 20 }}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
        >
          {/* Success Banner */}
          {showSuccessMessage && (
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle" size={20} color="#059669" />
              <Text style={styles.successBannerText}>{successMessage}</Text>
              <TouchableOpacity onPress={() => setShowSuccessMessage(false)} style={styles.successBannerClose}>
                <Ionicons name="close" size={20} color="#059669" />
              </TouchableOpacity>
            </View>
          )}

          {/* Page Controls */}
          <View style={styles.pageHeader}>
            <View style={styles.headerStats}>
              <View style={styles.statItem}>
                <Ionicons name="people-outline" size={16} color={dynamicColors.primary[500]} />
                <View style={styles.statContent}>
                  <Text style={[styles.statValue, { color: dynamicColors.primary[500] }]}>{totalCustomers}</Text>
                  <Text style={styles.statLabel}>Total</Text>
                </View>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Ionicons name="calendar-outline" size={16} color="#F59E0B" />
                <View style={styles.statContent}>
                  <Text style={[styles.statValue, { color: '#F59E0B' }]}>{newThisMonth}</Text>
                  <Text style={styles.statLabel}>New This Month</Text>
                </View>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Ionicons name="cash-outline" size={16} color={dynamicColors.accent[500]} />
                <View style={styles.statContent}>
                  <Text style={[styles.statValue, { color: dynamicColors.accent[500] }]}>₱{totalRevenue.toFixed(0)}</Text>
                  <Text style={styles.statLabel}>Revenue</Text>
                </View>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Ionicons name="receipt-outline" size={16} color="#059669" />
                <View style={styles.statContent}>
                  <Text style={[styles.statValue, { color: '#059669' }]}>{totalOrders}</Text>
                  <Text style={styles.statLabel}>Total Orders</Text>
                </View>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Ionicons name="trending-up-outline" size={16} color="#7C3AED" />
                <View style={styles.statContent}>
                  <Text style={[styles.statValue, { color: '#7C3AED' }]}>₱{Math.round(avgOrderValue)}</Text>
                  <Text style={styles.statLabel}>Avg Order</Text>
                </View>
              </View>
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity 
                style={styles.actionButton} 
                onPress={handleReset}
                disabled={isRefreshing}
              >
                <Animated.View
                  style={{
                    transform: [{
                      rotate: spinValue.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0deg', '360deg'],
                      }),
                    }],
                  }}
                >
                  <Ionicons 
                    name="refresh" 
                    size={16} 
                    color={isRefreshing ? "#9CA3AF" : "#6B7280"}
                  />
                </Animated.View>
              </TouchableOpacity>
            <View style={styles.exportDropdownContainer}>
              <TouchableOpacity 
                ref={exportButtonRef}
                style={[styles.exportButton, dynamicButtonStyles.primary]} 
                onPress={() => {
                  if (exportButtonRef.current) {
                    exportButtonRef.current.measureInWindow((x: number, y: number, width: number, height: number) => {
                      setExportButtonLayout({ x, y, width, height });
                      setShowExportDropdown(!showExportDropdown);
                    });
                  } else {
                    setShowExportDropdown(!showExportDropdown);
                  }
                }}
              >
                <Ionicons name="download-outline" size={16} color="#FFFFFF" />
                <Text style={[styles.exportButtonText, dynamicButtonStyles.primaryText]}>Export</Text>
                <Ionicons name="chevron-down" size={14} color="#FFFFFF" style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={[styles.primaryButton, dynamicButtonStyles.primary]} onPress={() => setIsAddModalOpen(true)}>
              <Ionicons name="person-add-outline" size={16} color="#FFFFFF" />
              <Text style={[styles.primaryButtonText, dynamicButtonStyles.primaryText]}>Add Customer</Text>
            </TouchableOpacity>
          </View>
        </View>

          {/* Global Customer Search (across all branches) */}
          <View style={styles.globalSearchCard}>
            <Text style={styles.globalSearchTitle}>Global Customer Search</Text>
            <Text style={styles.globalSearchSubtitle}>
              Search all branches for an existing customer, then attach them to this branch.
            </Text>
            <View style={styles.globalSearchRow}>
              <TextInput
                style={styles.globalSearchInput}
                placeholder="Search by name, email, or phone across all branches..."
                value={globalSearchTerm}
                onChangeText={setGlobalSearchTerm}
              />
              <TouchableOpacity
                style={[styles.globalSearchButton, dynamicButtonStyles.primary]}
                onPress={handleGlobalSearch}
                disabled={isGlobalSearchLoading}
              >
                <Ionicons
                  name="search-outline"
                  size={16}
                  color="#FFFFFF"
                  style={{ marginRight: 4 }}
                />
                <Text style={[styles.globalSearchButtonText, dynamicButtonStyles.primaryText]}>
                  {isGlobalSearchLoading ? 'Searching...' : 'Search'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Search and Filter Bar - scroll disabled to allow parent ScrollView to handle scrolling */}
          <CustomerTable 
            key={`${searchTerm}-${sortBy}-${refreshTrigger}`} 
            searchTerm={searchTerm} 
            onSearchChange={setSearchTerm}
            sortBy={sortBy}
            onSortChange={setSortBy}
            onCustomersChange={setCustomers}
            canArchive={canArchiveCustomers}
            canUnarchive={canUnarchiveCustomers}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            scrollEnabled={false}
          />
        </ScrollView>

        {/* Add Customer Modal */}
        <AddCustomerModal
          visible={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onCustomerAdded={handleCustomerAdded}
          existingCustomers={customers}
        />

        {/* Export Dropdown Modal */}
        {showExportDropdown && (
          <Modal
            visible={showExportDropdown}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowExportDropdown(false)}
          >
            <TouchableOpacity
              style={styles.exportDropdownOverlay}
              activeOpacity={1}
              onPress={() => setShowExportDropdown(false)}
            >
              <View 
                style={[
                  styles.exportDropdownWrapper,
                  {
                    position: 'absolute',
                    top: exportButtonLayout.y > 0 ? exportButtonLayout.y + exportButtonLayout.height + 8 : 80,
                    right: exportButtonLayout.x > 0 
                      ? Dimensions.get('window').width - exportButtonLayout.x - exportButtonLayout.width
                      : 16,
                  }
                ]}
                onStartShouldSetResponder={() => true}
              >
                <View style={styles.exportDropdownMenu}>
                  <View style={styles.exportHeader}>
                    <Text style={styles.exportHeaderText}>Export Customers</Text>
                    <Text style={styles.exportHeaderSubtext}>
                      {customers.filter(c => 
                        searchTerm === "" || 
                        (c.customerName ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (c.email ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (c.phoneNumber ?? "").includes(searchTerm)
                      ).length} customers
                    </Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.exportOption} 
                    onPress={() => {
                      handleExport('CSV');
                      setShowExportDropdown(false);
                    }}
                  >
                    <Ionicons name="document-text-outline" size={18} color="#374151" />
                    <Text style={styles.exportOptionText}>CSV Format</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.exportOption} 
                    onPress={() => {
                      handleExport('Excel');
                      setShowExportDropdown(false);
                    }}
                  >
                    <Ionicons name="document-text-outline" size={18} color="#374151" />
                    <Text style={styles.exportOptionText}>Excel Format</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.exportOption, { borderBottomWidth: 0 }]} 
                    onPress={() => {
                      handleExport('PDF');
                      setShowExportDropdown(false);
                    }}
                  >
                    <Ionicons name="document-text-outline" size={18} color="#374151" />
                    <Text style={styles.exportOptionText}>PDF Format</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          </Modal>
        )}

        {/* Global Search Results Modal */}
        <Modal
          visible={isGlobalModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIsGlobalModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.exportDropdownOverlay}
            activeOpacity={1}
            onPress={() => setIsGlobalModalVisible(false)}
          >
            <View
              style={[
                styles.exportDropdownWrapper,
                {
                  justifyContent: 'center',
                  alignItems: 'center',
                },
              ]}
              onStartShouldSetResponder={() => true}
            >
              <View style={styles.globalModalCard}>
                <View style={styles.globalModalHeaderRow}>
                  <Text style={styles.globalModalTitle}>Global Search Results</Text>
                  <TouchableOpacity onPress={() => setIsGlobalModalVisible(false)}>
                    <Ionicons name="close" size={20} color="#6B7280" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.globalModalSubtitle}>
                  Tap &ldquo;Add to this branch&rdquo; to assign a customer to the current branch.
                </Text>
                {isGlobalSearchLoading ? (
                  <Text style={{ textAlign: 'center', marginTop: 12 }}>
                    Searching customers...
                  </Text>
                ) : globalResults.length === 0 ? (
                  <Text style={{ textAlign: 'center', marginTop: 12 }}>
                    No customers found for &quot;{globalSearchTerm}&quot;.
                  </Text>
                ) : (
                  <ScrollView style={{ maxHeight: 300, marginTop: 8 }}>
                    {globalResults.map((c) => (
                      <View key={c._id} style={styles.globalResultRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.globalResultName}>{c.customerName}</Text>
                          <Text style={styles.globalResultMeta}>
                            {c.phoneNumber || 'No phone'} • {c.email || 'No email'}
                          </Text>
                          <Text style={styles.globalResultMeta}>
                            Branch: {c.stationId || 'Unassigned'}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={[styles.globalAttachButton, dynamicButtonStyles.primary]}
                          onPress={() => handleAttachCustomerToBranch(c)}
                        >
                          <Text
                            style={[
                              styles.globalAttachButtonText,
                              dynamicButtonStyles.primaryText,
                            ]}
                          >
                            Add to this branch
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Floating Action Button */}
        <FloatingActionButton
          mainIcon="person-add"
          mainAction={() => setIsAddModalOpen(true)}
          actions={[
            {
              icon: 'person-add-outline',
              label: 'Add Customer',
              onPress: () => setIsAddModalOpen(true),
              color: colors.primary[500],
            },
            {
              icon: 'download-outline',
              label: 'Export',
              onPress: () => setShowExportDropdown(true),
              color: colors.warning[500],
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xl,
    gap: spacing.md,
    flexWrap: 'wrap',
  },
  headerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
    flexWrap: 'wrap',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  statContent: {
    flexDirection: 'column',
    gap: 1,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Poppins_700Bold',
  },
  statLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontFamily: 'Poppins_400Regular',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: '#E5E7EB',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 0,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 40,
    minHeight: 40,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    // color: '#2563EB', // Now using dynamic color via inline style
    fontFamily: 'Poppins_500Medium',
  },
  primaryButton: {
    ...buttonStyles.primary,
  },
  primaryButtonText: {
    ...buttonStyles.primaryText,
  },
  scrollView: {
    flex: 1,
  },
  actionButtonActive: {
    backgroundColor: '#E0F2FE',
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    fontFamily: 'Poppins_500Medium',
  },
  toggleButtonTextActive: {
    // color: '#2563EB', // Now using dynamic color via inline style
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  exportDropdownContainer: {
    position: 'relative',
  },
  exportButton: {
    // ...buttonStyles.primary, // Now using dynamic button styles
  },
  exportButtonText: {
    // ...buttonStyles.primaryText, // Now using dynamic button styles
    marginLeft: spacing.sm,
  },
  exportDropdownOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  exportDropdownWrapper: {
    alignItems: 'flex-end',
  },
  exportDropdownMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    minWidth: 200,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  exportHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  exportHeaderText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    fontFamily: 'Poppins_700Bold',
  },
  exportHeaderSubtext: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    fontFamily: 'Poppins_500Medium',
  },
  exportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  exportOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    fontFamily: 'Poppins_500Medium',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    borderWidth: 1,
    borderColor: '#059669',
    borderRadius: 8,
    padding: 16,
    margin: 16,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  successBannerText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
    fontFamily: 'Poppins_600SemiBold',
  },
  successBannerClose: {
    padding: 4,
  },
  globalSearchCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  globalSearchTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    fontFamily: 'Poppins_700Bold',
  },
  globalSearchSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 12,
    fontFamily: 'Poppins_400Regular',
  },
  globalSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  globalSearchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    backgroundColor: '#FFFFFF',
  },
  globalSearchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  globalSearchButtonText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  globalModalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    width: '90%',
    maxWidth: 500,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  globalModalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  globalModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Poppins_700Bold',
    marginBottom: 4,
  },
  globalModalSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Poppins_400Regular',
    marginBottom: 8,
  },
  globalResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 12,
  },
  globalResultName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'Poppins_600SemiBold',
  },
  globalResultMeta: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Poppins_400Regular',
  },
  globalAttachButton: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
  },
  globalAttachButtonText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
});

import React, { useState, useRef, useEffect } from 'react';
import { View, ScrollView, StyleSheet, TouchableOpacity, Text, RefreshControl, Modal, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import GlobalStyles from "../styles/GlobalStyle";
import { colors, typography, spacing, borderRadius, cardStyles, buttonStyles, badgeStyles } from '@/app/theme/designSystem';

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
  exportCustomersToJSON, 
  exportCustomersToPDF,
  getExportFilename 
} from '@/utils/exportUtils';

type Customer = {
  _id: string;
  customerName: string;
  phoneNumber: string;
  email?: string;
  totalOrders?: number;
  totalSpent?: number;
  lastOrder?: string;
  isArchived?: boolean;
};

export default function Customer() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState('name-asc');
  const [refreshing, setRefreshing] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showStats, setShowStats] = useState(true);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [exportButtonLayout, setExportButtonLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const exportButtonRef = useRef<any>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const spinValue = useRef(new Animated.Value(0)).current;

  // Load stats visibility preference from AsyncStorage
  useEffect(() => {
    const loadStatsPreference = async () => {
      try {
        const saved = await AsyncStorage.getItem('customer-management-show-stats');
        if (saved !== null) {
          setShowStats(JSON.parse(saved));
        }
      } catch (error) {
        console.error('Error loading stats preference:', error);
      }
    };
    loadStatsPreference();
  }, []);

  // Save stats visibility preference to AsyncStorage
  useEffect(() => {
    const saveStatsPreference = async () => {
      try {
        await AsyncStorage.setItem('customer-management-show-stats', JSON.stringify(showStats));
      } catch (error) {
        console.error('Error saving stats preference:', error);
      }
    };
    saveStatsPreference();
  }, [showStats]);

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

  const handleExport = (format: 'CSV' | 'Excel' | 'JSON' | 'PDF') => {
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
      Alert.alert("Export", "No customers to export");
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
          case 'JSON':
            exportCustomersToJSON(customersToExport, filename);
            break;
        }
        
        Alert.alert("Success", `${customersToExport.length} customers exported as ${format}`);
      } catch (error: any) {
        Alert.alert("Error", error.message || "Export failed. Please try again.");
        console.error('Export error:', error);
      }
    };

    performExport();
  };

  const handleStats = () => {
    setShowStats(!showStats);
  };

  const handleCustomerAdded = (newCustomer: Customer) => {
    setCustomers([...customers, newCustomer]);
    setIsAddModalOpen(false);
    
    // Trigger CustomerTable refresh
    setRefreshTrigger(prev => prev + 1);
    
    // Show success banner
    setSuccessMessage(`Customer "${newCustomer.customerName}" added successfully!`);
    setShowSuccessMessage(true);
    setTimeout(() => {
      setShowSuccessMessage(false);
    }, 5000); // Hide after 5 seconds
  };

  return (
    <View style={GlobalStyles.mainLayout}>
      {/* Modern Sidebar */}
      <ModernSidebar />

      {/* MAIN CONTENT */}
      <View style={GlobalStyles.mainContent}>
        {/* Modern Header */}
        <Header title="Customer Management" />

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

        {/* Page Header */}
        <View style={styles.pageHeader}>
          <View style={styles.titleSection}>
            <Ionicons name="people-outline" size={28} color="#111827" style={{ marginRight: 12 }} />
            <View>
              <Text style={styles.pageTitle}>Customer Management</Text>
              <Text style={styles.pageSubtitle}>Manage customer information and relationships</Text>
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
                  size={18} 
                  color={isRefreshing ? "#9CA3AF" : "#6B7280"}
                />
              </Animated.View>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.actionButton, !showStats && styles.actionButtonActive]} 
              onPress={handleStats}
            >
              <Ionicons 
                name={showStats ? "stats-chart-outline" : "eye-off-outline"} 
                size={18} 
                color="#2563EB" 
              />
              <Text style={styles.actionButtonText}>Stats</Text>
            </TouchableOpacity>
            <View style={styles.exportDropdownContainer}>
              <TouchableOpacity 
                ref={exportButtonRef}
                style={styles.exportButton} 
                onPress={() => {
                  if (exportButtonRef.current) {
                    exportButtonRef.current.measure((fx: number, fy: number, fwidth: number, fheight: number, px: number, py: number) => {
                      setExportButtonLayout({ x: px, y: py, width: fwidth, height: fheight });
                      setShowExportDropdown(!showExportDropdown);
                    });
                  } else {
                    setShowExportDropdown(!showExportDropdown);
                  }
                }}
              >
                <Ionicons name="download-outline" size={18} color="#FFFFFF" />
                <Text style={styles.exportButtonText}>Export</Text>
                <Ionicons name="chevron-down" size={16} color="#FFFFFF" style={{ marginLeft: 4 }} />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.primaryButton} onPress={() => setIsAddModalOpen(true)}>
              <Ionicons name="person-add-outline" size={18} color="#FFFFFF" />
              <Text style={styles.primaryButtonText}>Add Customer</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Grid */}
        {showStats && (
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, styles.statCardBlue]}>
              <View style={[styles.statIcon, styles.statIconBlue]}>
                <Ionicons name="folder-outline" size={24} color="#2563EB" />
              </View>
              <View>
                <Text style={styles.statNumber}>{totalCustomers}</Text>
                <Text style={styles.statLabel}>Total Customers</Text>
              </View>
            </View>

            <View style={[styles.statCard, styles.statCardOrange]}>
              <View style={[styles.statIcon, styles.statIconOrange]}>
                <Ionicons name="calendar-outline" size={24} color="#F59E0B" />
              </View>
              <View>
                <Text style={styles.statNumber}>{newThisMonth}</Text>
                <Text style={styles.statLabel}>New This Month</Text>
              </View>
            </View>

            <View style={[styles.statCard, styles.statCardGreen]}>
              <View style={[styles.statIcon, styles.statIconGreen]}>
                <Ionicons name="cash-outline" size={24} color="#059669" />
              </View>
              <View>
                <Text style={styles.statNumber}>₱{totalRevenue.toLocaleString()}</Text>
                <Text style={styles.statLabel}>Total Revenue</Text>
              </View>
            </View>

            <View style={[styles.statCard, styles.statCardPurple]}>
              <View style={[styles.statIcon, styles.statIconPurple]}>
                <Ionicons name="bar-chart-outline" size={24} color="#7C3AED" />
              </View>
              <View>
                <Text style={styles.statNumber}>₱{Math.round(avgOrderValue)}</Text>
                <Text style={styles.statLabel}>Avg. Order Value</Text>
              </View>
            </View>
          </View>
        )}

        <ScrollView 
          style={styles.scrollView}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#2563EB"
            />
          }
        >
          {/* Search and Filter Bar */}
          <CustomerTable 
            key={`${searchTerm}-${sortBy}-${refreshTrigger}`} 
            searchTerm={searchTerm} 
            onSearchChange={setSearchTerm}
            sortBy={sortBy}
            onSortChange={setSortBy}
            onCustomersChange={setCustomers}
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
                    right: exportButtonLayout.x > 0 && typeof window !== 'undefined' 
                      ? window.innerWidth - exportButtonLayout.x - exportButtonLayout.width 
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
                    style={styles.exportOption} 
                    onPress={() => {
                      handleExport('JSON');
                      setShowExportDropdown(false);
                    }}
                  >
                    <Ionicons name="document-text-outline" size={18} color="#374151" />
                    <Text style={styles.exportOptionText}>JSON Format</Text>
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
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.xl,
    backgroundColor: colors.background.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  titleSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pageTitle: {
    ...typography.h2,
    marginBottom: spacing.xs,
  },
  pageSubtitle: {
    ...typography.body,
    color: colors.text.secondary,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2563EB',
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
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  statCard: {
    flex: 1,
    minWidth: 180,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  statCardBlue: {
    borderLeftColor: '#2563EB',
  },
  statCardOrange: {
    borderLeftColor: '#F59E0B',
  },
  statCardGreen: {
    borderLeftColor: '#059669',
  },
  statCardPurple: {
    borderLeftColor: '#7C3AED',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statIconBlue: {
    backgroundColor: '#EFF6FF',
  },
  statIconOrange: {
    backgroundColor: '#FFFBEB',
  },
  statIconGreen: {
    backgroundColor: '#ECFDF5',
  },
  statIconPurple: {
    backgroundColor: '#F5F3FF',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    fontFamily: 'Poppins_700Bold',
  },
  statLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
    fontFamily: 'Poppins_500Medium',
  },
  actionButtonActive: {
    backgroundColor: '#E0F2FE',
  },
  exportDropdownContainer: {
    position: 'relative',
  },
  exportButton: {
    ...buttonStyles.primary,
  },
  exportButtonText: {
    ...buttonStyles.primaryText,
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
});

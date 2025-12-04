import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Modal,
  TextInput,
  StyleSheet,
  Alert,
  ScrollView,
  FlatList,
  RefreshControl,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { Dropdown } from 'react-native-element-dropdown';
import EmailInput from "@/components/EmailInput";
import { API_BASE_URL } from "@/constants/api";
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EnhancedEmptyCustomers } from '@/components/ui/EnhancedEmptyState';
import { useToast } from '@/app/context/ToastContext';
import { useColors } from '@/app/theme/useColors';
import { useButtonStyles } from '@/app/theme/useButtonStyles';

type Customer = {
  _id: string;
  customerName: string;
  phoneNumber: string;
  email?: string;
  totalOrders?: number;
  totalSpent?: number;
  lastOrder?: string;
  points?: number;
  isArchived?: boolean;
};

type CustomerTableProps = {
  searchTerm?: string;
  onSearchChange?: (term: string) => void;
  sortBy?: string;
  onSortChange?: (sort: string) => void;
  onCustomersChange?: (customers: Customer[]) => void;
  canArchive?: boolean;
  canUnarchive?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  scrollEnabled?: boolean;
};

const CustomerTable: React.FC<CustomerTableProps> = ({ 
  searchTerm = "",
  onSearchChange,
  sortBy = 'name-asc',
  onSortChange,
  onCustomersChange,
  canArchive = false,
  canUnarchive = false,
  refreshing = false,
  onRefresh,
  scrollEnabled = true,
}) => {
  const { showSuccess } = useToast();
  const dynamicColors = useColors();
  const dynamicButtonStyles = useButtonStyles();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [processingCustomerId, setProcessingCustomerId] = useState<string | null>(null);
  
  // Animation values for edit modal (matching Admin app style)
  const editModalOpacity = useRef(new Animated.Value(0)).current;
  const editModalScale = useRef(new Animated.Value(0.9)).current;

  const API_URL = `${API_BASE_URL}/customers`;
  
  // Animate edit modal (matching Admin app style)
  useEffect(() => {
    if (editModalVisible) {
      // Reset to initial values first
      editModalOpacity.setValue(0);
      editModalScale.setValue(0.9);
      // Then animate
      Animated.parallel([
        Animated.timing(editModalOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(editModalScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(editModalOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(editModalScale, {
          toValue: 0.9,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [editModalVisible]);

  // Fetch customers from backend
  useEffect(() => {
    fetchCustomers();
  }, []);

  const mapResponseToCustomers = (payload: any, archivedFlag: boolean): Customer[] => {
    const customersArray = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.customers)
          ? payload.customers
          : [];

    return customersArray.map((c: any) => ({
      _id: c._id || c.id,
      customerName: c.customerName || c.name,
      phoneNumber: c.phoneNumber || c.phone,
      email: c.email || '',
      totalOrders: c.totalOrders || 0,
      totalSpent: c.totalSpent || 0,
      lastOrder: c.lastOrder ? new Date(c.lastOrder).toLocaleDateString() : 'No orders yet',
      points: c.points || 0,
      isArchived: archivedFlag || c.isArchived || false,
    }));
  };

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('userToken');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const [activeRes, archivedRes] = await Promise.all([
        axios.get(`${API_URL}?showArchived=false`, { headers }),
        axios.get(`${API_URL}?showArchived=true`, { headers }).catch(() => ({ data: [] })),
      ]);

      const activeCustomers = mapResponseToCustomers(activeRes.data, false);
      const archivedCustomers = mapResponseToCustomers(archivedRes.data, true);
      const combined = [...activeCustomers, ...archivedCustomers];

      setCustomers(combined);
      if (onCustomersChange) {
        onCustomersChange(combined);
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  // Get customer initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Filter customers based on search term
  // Memoize filtered customers
  const filteredCustomers = useMemo(() => customers.filter(customer => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      customer.customerName.toLowerCase().includes(term) ||
      (customer.email && customer.email.toLowerCase().includes(term)) ||
      customer.phoneNumber.includes(term)
    );
  }), [customers, searchTerm]);

  // Memoize sorted customers
  const sortedCustomers = useMemo(() => [...filteredCustomers].sort((a, b) => {
    switch (sortBy) {
      case 'name-asc':
        return a.customerName.localeCompare(b.customerName);
      case 'name-desc':
        return b.customerName.localeCompare(a.customerName);
      case 'orders':
        return (b.totalOrders || 0) - (a.totalOrders || 0);
      case 'spent':
        return (b.totalSpent || 0) - (a.totalSpent || 0);
      default:
        return 0;
    }
  }), [filteredCustomers, sortBy]);

  // Open view modal
  const handleView = (customer: Customer) => {
    setSelectedCustomer(customer);
    setViewModalVisible(true);
    fetchRecentOrders(customer).catch(() => setRecentOrders([]));
  };

  const fetchRecentOrders = async (customer: Customer) => {
    try {
      const token = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('userToken');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      // Use search to narrow, then filter client-side for safety
      const searchKey = encodeURIComponent(customer.customerName || customer.phoneNumber || '');
      const res = await axios.get(`${API_BASE_URL}/orders?search=${searchKey}`, { headers });
      const payload = res.data?.data || res.data || [];
      const orders: any[] = Array.isArray(payload) ? payload : (Array.isArray(payload.orders) ? payload.orders : []);

      // Filter to this customer (by name or phone), sort by date desc, take latest 5
      const filtered = orders
        .filter((o: any) => {
          const nameMatch = (o.customer || o.customerName || '').toLowerCase().trim() === (customer.customerName || '').toLowerCase().trim();
          const phoneMatch = (o.customerPhone || o.phone || '').replace(/\D/g,'') === (customer.phoneNumber || '').replace(/\D/g,'');
          const idMatch = o.customerId && (o.customerId === customer._id);
          return nameMatch || phoneMatch || idMatch;
        })
        .sort((a: any, b: any) => new Date(b.date || b.createdAt || 0).getTime() - new Date(a.date || a.createdAt || 0).getTime())
        .slice(0, 5)
        .map((o: any) => ({
          id: o.id || o.orderId || o._id,
          date: new Date(o.date || o.createdAt).toLocaleDateString(),
          amount: typeof o.total === 'string' ? o.total : `₱${(parseFloat(String(o.total || 0)) || 0).toFixed(2)}`,
          service: o.items && o.items.length > 0 ? o.items[0].service : 'Laundry Service',
        }));

      setRecentOrders(filtered);
    } catch (e) {
      console.error('Failed to load recent orders:', e);
      setRecentOrders([]);
    }
  };

  // Open edit modal
  const handleEdit = (customer: Customer) => {
    setSelectedCustomer({ ...customer });
    setEditModalVisible(true);
  };

  // Update customer
  const handleUpdate = async () => {
    if (!selectedCustomer) return;

    // Validation
    if (!selectedCustomer.customerName?.trim() || !selectedCustomer.phoneNumber?.trim()) {
      Alert.alert("Error", "Please fill in name and phone number");
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('userToken');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await axios.put(
        `${API_URL}/${selectedCustomer._id}`,
        {
          name: selectedCustomer.customerName.trim(),
          phone: selectedCustomer.phoneNumber.trim(),
          email: selectedCustomer.email?.trim() || undefined,
        },
        { headers }
      );

      // Handle response format - could be direct data or wrapped in data property
      const responseData = response.data.data || response.data;

      // Update local state
      setCustomers((prev) =>
        prev.map((c) => (c._id === selectedCustomer._id ? {
          ...c,
          customerName: responseData.name || responseData.customerName || selectedCustomer.customerName,
          phoneNumber: responseData.phone || responseData.phoneNumber || selectedCustomer.phoneNumber,
          email: responseData.email || selectedCustomer.email || '',
        } : c))
      );

      // Notify parent component
      if (onCustomersChange) {
        const updatedCustomers = customers.map((c) => (c._id === selectedCustomer._id ? {
          ...c,
          customerName: responseData.name || responseData.customerName || selectedCustomer.customerName,
          phoneNumber: responseData.phone || responseData.phoneNumber || selectedCustomer.phoneNumber,
          email: responseData.email || selectedCustomer.email || '',
        } : c));
        onCustomersChange(updatedCustomers);
      }

      setEditModalVisible(false);
      setSelectedCustomer(null);
      showSuccess("Customer updated successfully!");
      
      // Refresh the list to ensure consistency
      fetchCustomers();
    } catch (error: any) {
      console.error("Error updating customer:", error);
      const errorMessage = error?.response?.data?.message || 
                          error?.response?.data?.errors?.join?.('\n') ||
                          error?.message || 
                          "Failed to update customer";
      Alert.alert("Error", errorMessage);
    }
  };


  return (
    <View style={styles.container}>
      {/* Search and Filter Bar */}
      <View style={styles.searchFilterBar}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, email, or phone..."
            placeholderTextColor="#9CA3AF"
            value={searchTerm}
            onChangeText={(text) => onSearchChange?.(text)}
          />
          {searchTerm.length > 0 && (
            <TouchableOpacity onPress={() => onSearchChange?.('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filterControls}>
          <View style={styles.filterGroup}>
            <Dropdown
              key={sortBy} // Force re-render when sortBy changes
              style={styles.sortSelect}
              containerStyle={styles.dropdownContainer}
              data={[
                { label: "Name (A-Z)", value: "name-asc" },
                { label: "Name (Z-A)", value: "name-desc" },
                { label: "Most Orders", value: "orders" },
                { label: "Highest Spending", value: "spent" },
              ]}
              labelField="label"
              valueField="value"
              placeholder="Sort by..."
              value={sortBy}
              onChange={(item) => onSortChange?.(item.value)}
            />
          </View>

        </View>
      </View>

      {/* Customer Table */}
      <View style={styles.tableContainer}>
        <View style={styles.tableHeader}>
          <Text style={[styles.headerCell, { flex: 2 }]}>CUSTOMER</Text>
          <Text style={[styles.headerCell, { flex: 2 }]}>CONTACT</Text>
          <Text style={[styles.headerCell, { flex: 1 }]}>ORDERS</Text>
          <Text style={[styles.headerCell, { flex: 1.5 }]}>TOTAL SPENT</Text>
          <Text style={[styles.headerCell, { flex: 1.2 }]}>LAST ORDER</Text>
          <Text style={[styles.headerCell, { flex: 1 }]}>ACTIONS</Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={dynamicColors.primary[500]} />
          </View>
        ) : sortedCustomers.length > 0 ? (
          <FlatList
            data={sortedCustomers}
            keyExtractor={(item) => item._id}
            scrollEnabled={scrollEnabled}
            nestedScrollEnabled={scrollEnabled}
            refreshControl={
              onRefresh ? (
                <RefreshControl
                  refreshing={refreshing || false}
                  onRefresh={onRefresh}
                  tintColor={dynamicColors.primary[500]}
                />
              ) : undefined
            }
            renderItem={({ item: customer }) => (
              <View style={styles.tableRow}>
              {/* Customer */}
              <View style={[styles.tableCell, { flex: 2, flexDirection: 'row', alignItems: 'center' }]}>
                <View style={[styles.avatar, { backgroundColor: dynamicColors.primary[500] }]}>
                  <Text style={styles.avatarText}>{getInitials(customer.customerName)}</Text>
                </View>
                <Text style={styles.customerName}>{customer.customerName}</Text>
              </View>

              {/* Contact */}
              <View style={[styles.tableCell, { flex: 2 }]}>
                <View style={styles.contactInfo}>
                  {customer.email && (
                    <View style={styles.contactItem}>
                      <Ionicons name="mail-outline" size={12} color="#6B7280" />
                      <Text style={styles.contactText} numberOfLines={1}>{customer.email}</Text>
                    </View>
                  )}
                  <View style={styles.contactItem}>
                    <Ionicons name="call-outline" size={12} color="#6B7280" />
                    <Text style={styles.contactText}>{customer.phoneNumber}</Text>
                  </View>
                </View>
              </View>

              {/* Orders */}
              <View style={[styles.tableCell, { flex: 1 }]}>
                <Text style={styles.statValue}>{customer.totalOrders || 0}</Text>
              </View>

              {/* Total Spent */}
              <View style={[styles.tableCell, { flex: 1.5 }]}>
                <Text style={[styles.statValue, styles.statValuePrimary]}>
                  ₱{(customer.totalSpent || 0).toLocaleString()}
              </Text>
              </View>

              {/* Last Order */}
              <View style={[styles.tableCell, { flex: 1.2 }]}>
                <Text style={styles.statValue}>{customer.lastOrder || 'No orders yet'}</Text>
              </View>

              {/* Actions */}
              <View style={[styles.tableCell, { flex: 1, flexDirection: 'row', gap: 8 }]}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => handleView(customer)}
                >
                  <Ionicons name="eye-outline" size={18} color={dynamicColors.primary[500]} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionButtonEdit]}
                  onPress={() => handleEdit(customer)}
                >
                  <Ionicons name="create-outline" size={18} color="#16A34A" />
                </TouchableOpacity>
              </View>
            </View>
            )}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            initialNumToRender={10}
            windowSize={10}
            ListEmptyComponent={() => (
              <View style={styles.emptyContainer}>
                <EnhancedEmptyCustomers onAddCustomer={() => {
                  // This will be handled by parent component
                }} />
              </View>
            )}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <EnhancedEmptyCustomers onAddCustomer={() => {
              // This will be handled by parent component
            }} />
          </View>
        )}
      </View>

      {/* View Customer Modal */}
      <Modal
        visible={viewModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setViewModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Customer Details</Text>
              <TouchableOpacity onPress={() => setViewModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {selectedCustomer && (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* Customer Header */}
                <View style={styles.customerDetailsHeader}>
                  <View style={[styles.customerAvatarLarge, { backgroundColor: dynamicColors.primary[500], shadowColor: dynamicColors.primary[500] }]}>
                    <Text style={styles.customerAvatarText}>{getInitials(selectedCustomer.customerName)}</Text>
                  </View>
                  <View>
                    <Text style={styles.customerNameModal}>{selectedCustomer.customerName}</Text>
                    <Text style={styles.customerEmailModal}>{selectedCustomer.email || 'No email'}</Text>
                  </View>
                </View>

                {/* Details Grid */}
                <View style={styles.detailsGrid}>
                  <View style={styles.detailCard}>
                    <Text style={styles.detailLabel}>EMAIL ADDRESS</Text>
                    <View style={styles.detailValue}>
                      <Ionicons name="mail-outline" size={16} color={dynamicColors.primary[500]} />
                      <Text style={styles.detailValueText}>{selectedCustomer.email || 'N/A'}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.detailCard}>
                    <Text style={styles.detailLabel}>PHONE NUMBER</Text>
                    <View style={styles.detailValue}>
                      <Ionicons name="call-outline" size={16} color={dynamicColors.primary[500]} />
                      <Text style={styles.detailValueText}>{selectedCustomer.phoneNumber}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.detailCard}>
                    <Text style={styles.detailLabel}>TOTAL ORDERS</Text>
                    <Text style={[styles.detailValueText, styles.detailValueHighlightBlue, { color: dynamicColors.primary[500] }]}>
                      {selectedCustomer.totalOrders || 0}
                    </Text>
                  </View>
                  
                  <View style={styles.detailCard}>
                    <Text style={styles.detailLabel}>TOTAL SPENT</Text>
                    <Text style={[styles.detailValueText, styles.detailValueHighlightOrange, { color: dynamicColors.accent[500] }]}>
                      ₱{(selectedCustomer.totalSpent || 0).toLocaleString()}
                    </Text>
                  </View>
                  
                  <View style={styles.detailCard}>
                    <Text style={styles.detailLabel}>POINTS ACCUMULATED</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={[styles.detailValueText, styles.detailValueHighlightBlue, { color: dynamicColors.primary[500] }]}>
                        {selectedCustomer.points || 0} points
                      </Text>
                      <Text style={{ fontSize: 12, color: '#6B7280', marginLeft: 4 }}>
                        (1 point = ₱1 discount)
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.detailCard}>
                    <Text style={styles.detailLabel}>LAST ORDER</Text>
                    <Text style={styles.detailValueText}>
                      {selectedCustomer.lastOrder || 'No orders yet'}
                    </Text>
                  </View>
                  
                  <View style={styles.detailCard}>
                    <Text style={styles.detailLabel}>CUSTOMER SINCE</Text>
                    <Text style={styles.detailValueText}>Jan 15, 2024</Text>
                  </View>
                </View>

                {/* Recent Order History */}
                <View style={styles.recentActivity}>
                  <View style={[styles.recentActivityTitleContainer, { borderBottomColor: dynamicColors.accent[500] }]}>
                    <Text style={[styles.recentActivityTitle, { color: dynamicColors.primary[500] }]}>Recent Order History</Text>
                  </View>
                  <View style={styles.activityList}>
                    {recentOrders.length === 0 ? (
                      <Text style={{ color: '#6B7280' }}>No recent orders found.</Text>
                    ) : (
                      recentOrders.map((o, idx) => (
                        <View key={idx} style={[styles.activityItem, { borderLeftColor: dynamicColors.primary[500] }]}>
                          <Text style={styles.activityDate}>{o.date}</Text>
                          <View style={styles.activityDetails}>
                            <Text style={styles.activityText}>
                              <Text style={[styles.activityOrderId, { color: dynamicColors.primary[500] }]}>#{o.id}</Text> - {o.service}
                            </Text>
                            <Text style={[styles.activityAmount, { color: dynamicColors.accent[500] }]}>{o.amount}</Text>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                </View>
              </ScrollView>
        )}

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonClose]}
                onPress={() => setViewModalVisible(false)}
              >
                <Text style={styles.modalButtonCloseText}>Close</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonEdit, dynamicButtonStyles.primary]}
                onPress={() => {
                  setViewModalVisible(false);
                  if (selectedCustomer) handleEdit(selectedCustomer);
                }}
              >
                <Ionicons name="pencil-outline" size={18} color="#FFFFFF" />
                <Text style={[styles.modalButtonEditText, dynamicButtonStyles.primaryText]}>Edit Customer</Text>
              </TouchableOpacity>
            </View>
          </View>
      </View>
      </Modal>

      {/* Edit Customer Modal */}
      <Modal
        visible={editModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setEditModalVisible(false)}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardView}
          >
            <Pressable 
              onPress={(e) => e.stopPropagation()}
              style={{ width: '100%', maxWidth: 600, alignSelf: 'center' }}
            >
              <Animated.View
                style={[
                  styles.modalContent,
                  {
                    transform: [{ scale: editModalScale }],
                    opacity: editModalOpacity,
                  },
                ]}
              >
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleContainer}>
                    <Ionicons name="pencil-outline" size={24} color={dynamicColors.primary[500]} />
                    <View>
                      <Text style={styles.modalTitle}>Edit Customer</Text>
                      <Text style={styles.modalSubtitle}>Update customer information</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                    <Ionicons name="close" size={24} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                {selectedCustomer && (
                  <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.formGrid}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Full Name *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="Enter customer's full name"
                      value={selectedCustomer.customerName}
                      onChangeText={(text) =>
                        setSelectedCustomer({ ...selectedCustomer, customerName: text })
                      }
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Email Address *</Text>
                    <EmailInput
                      style={styles.textInput}
                      placeholder="customer@example.com"
                      value={selectedCustomer.email || ''}
                      onChangeText={(text) =>
                        setSelectedCustomer({ ...selectedCustomer, email: text })
                      }
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Phone Number *</Text>
                    <TextInput
                      style={styles.textInput}
                      placeholder="+63 912 345 6789"
                      value={selectedCustomer.phoneNumber}
                      onChangeText={(text) =>
                        setSelectedCustomer({ ...selectedCustomer, phoneNumber: text })
                      }
                      keyboardType="phone-pad"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Last Order Date</Text>
                    <View style={styles.dateInputContainer}>
                      <TextInput
                        style={[styles.textInput, styles.dateInput]}
                        placeholder="mm/dd/yyyy"
                        value={selectedCustomer.lastOrder || ''}
                        onChangeText={(text) =>
                          setSelectedCustomer({ ...selectedCustomer, lastOrder: text })
                        }
                      />
                      <Ionicons name="calendar-outline" size={20} color="#6B7280" style={styles.calendarIcon} />
                    </View>
                  </View>
                </View>

                <View style={styles.formNote}>
                  <Text style={styles.formNoteText}>
                    💡 <Text style={styles.formNoteBold}>Note:</Text> Make sure all required fields are filled correctly before updating.
                  </Text>
                  </View>
                  </ScrollView>
                )}

                <View style={styles.modalFooter}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonCancel]}
                    onPress={() => setEditModalVisible(false)}
                  >
                    <Text style={styles.modalButtonCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonSave, { backgroundColor: dynamicColors.primary[500] }]}
                    onPress={handleUpdate}
                  >
                    <Ionicons name="save-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.modalButtonSaveText}>Update Customer</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  searchFilterBar: {
    marginBottom: 16,
    gap: 12,
  },
  searchBox: {
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
  clearButton: {
    padding: 4,
  },
  filterControls: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  filterGroup: {
    flex: 1,
  },
  sortSelect: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FFFFFF',
    minHeight: 44,
  },
  dropdownContainer: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  tableContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  headerCell: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  tableCell: {
    paddingHorizontal: 4,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    // backgroundColor: '#2563EB', // Now using dynamic color via inline style
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  customerName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    flex: 1,
  },
  contactInfo: {
    gap: 4,
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  contactText: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  statValuePrimary: {
    // color: '#2563EB', // Now using dynamic color via inline style
    fontWeight: '600',
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButtonEdit: {
    backgroundColor: '#D1FAE5',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  keyboardView: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 25,
    elevation: 10,
    alignSelf: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '400',
    marginTop: 4,
  },
  modalBody: {
    padding: 20,
  },
  customerDetailsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#E5E7EB',
  },
  customerAvatarLarge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    // backgroundColor: '#2563EB', // Now using dynamic color via inline style
    justifyContent: 'center',
    alignItems: 'center',
    // shadowColor: '#2563EB', // Now using dynamic color via inline style
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  customerAvatarText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 20,
  },
  customerNameModal: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  customerEmailModal: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
    marginBottom: 24,
  },
  detailCard: {
    width: '48%',
    marginHorizontal: '1%',
    marginBottom: 16,
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailValueText: {
    fontWeight: '700',
    color: '#111827',
    fontSize: 15,
  },
  detailValueHighlightBlue: {
    // color: '#2563EB', // Now using dynamic color via inline style
    fontSize: 18,
  },
  detailValueHighlightOrange: {
    // color: '#F97316', // Now using dynamic color via inline style
    fontSize: 18,
  },
  recentActivity: {
    marginTop: 24,
  },
  recentActivityTitleContainer: {
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 2,
    // borderBottomColor: '#F97316', // Now using dynamic color via inline style
  },
  recentActivityTitle: {
    fontSize: 16,
    fontWeight: '700',
    // color: '#111827', // Now using dynamic color via inline style
  },
  activityList: {
    gap: 12,
  },
  activityItem: {
    padding: 14,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderLeftWidth: 3,
    // borderLeftColor: '#2563EB', // Now using dynamic color via inline style
  },
  activityDate: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
    fontWeight: '600',
  },
  activityDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  activityOrderId: {
    fontWeight: '700',
    // color: '#2563EB', // Now using dynamic color via inline style
  },
  activityAmount: {
    fontWeight: '700',
    // color: '#F97316', // Now using dynamic color via inline style
    fontSize: 14,
  },
  formGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -10,
  },
  inputGroup: {
    width: '50%',
    paddingHorizontal: 10,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#FFFFFF',
  },
  dateInputContainer: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateInput: {
    flex: 1,
    paddingRight: 40,
  },
  calendarIcon: {
    position: 'absolute',
    right: 12,
    pointerEvents: 'none',
  },
  formNote: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    padding: 16,
    marginTop: 20,
  },
  formNoteText: {
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
  formNoteBold: {
    fontWeight: '700',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 16,
    paddingHorizontal: 24,
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  modalButtonClose: {
    backgroundColor: '#F3F4F6',
  },
  modalButtonCancel: {
    backgroundColor: '#F3F4F6',
  },
  modalButtonSave: {
    // backgroundColor: '#2563EB', // Now using dynamic color via inline style
  },
  modalButtonEdit: {
    // backgroundColor: '#2563EB', // Now using dynamic color via inline style
  },
  modalButtonEditText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
    // color: '#2563EB', // Now using dynamic color via inline style
  },
  modalButtonCloseText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  modalButtonCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  modalButtonSaveText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

// Memoize the component to prevent unnecessary re-renders
export default React.memo(CustomerTable);

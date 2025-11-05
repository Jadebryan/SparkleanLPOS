import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from "@/constants/api";

type Order = {
  orderId: string;
  customerName: string;
  createDate: string;
  laundryStatus: string;
  feeStatus: string;
  totalFee: number;
  change?: number;
  createdBy?: string | null;
  lastUpdatedBy?: string | null;
  __raw?: any; // <-- allow storing the full backend object
};

type OrderTableProps = {
  setVisible: (value: boolean) => void;
  setSelectedOrder: (order: any) => void;
  searchQuery: string;
  orders?: Order[];
  loading?: boolean;
  onRefresh?: () => void;
  onEditOrder?: (order: any) => void;
  onViewInvoice?: (order: any) => void;
  onPrintReceipt?: (order: any) => void;
};

const OrderTableComponent: React.FC<OrderTableProps> = ({
  setVisible,
  setSelectedOrder,
  searchQuery,
  orders: ordersProp,
  loading: loadingProp,
  onRefresh,
  onEditOrder,
  onViewInvoice,
  onPrintReceipt,
}) => {
  // Use provided orders/loading or fetch internally (for backward compatibility)
  const [internalOrders, setInternalOrders] = useState<Order[]>([]);
  const [internalLoading, setInternalLoading] = useState(true);

  // Use props if provided, otherwise use internal state
  const orders = ordersProp !== undefined ? ordersProp : internalOrders;
  const loading = loadingProp !== undefined ? loadingProp : internalLoading;

  // Only fetch internally if orders are not provided as props
  useEffect(() => {
    if (ordersProp === undefined) {
    loadUserAndOrders();
    }
  }, []);

  const loadUserAndOrders = async () => {
    try {
      const userData = await AsyncStorage.getItem("user");
      if (!userData) {
        console.warn("No logged-in user found.");
        setInternalLoading(false);
        return;
      }

      const parsedUser = JSON.parse(userData);
      const stationId = parsedUser.stationId || parsedUser._id || parsedUser.id;
      if (!stationId) {
        console.warn("No stationId on user.");
        setInternalLoading(false);
        return;
      }

      await fetchOrdersByStation(stationId);
    } catch (error) {
      console.error("Error loading user:", error);
      setInternalLoading(false);
    }
  };

  const fetchOrdersByStation = async (stationId: string) => {
    try {
      const token = await AsyncStorage.getItem("token") || await AsyncStorage.getItem("userToken");
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/orders?stationId=${stationId}`, {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch orders: ${response.status}`);
      }

      const data = await response.json();

      // Handle different response formats
      let ordersData = data;
      if (data && typeof data === 'object') {
        if (data.success && Array.isArray(data.data)) {
          ordersData = data.data;
        } else if (Array.isArray(data.orders)) {
          ordersData = data.orders;
        } else if (data.data && Array.isArray(data.data.orders)) {
          ordersData = data.data.orders;
        }
      }

      // normalize for table consumption
      const normalized: Order[] = Array.isArray(ordersData)
        ? ordersData.map((o: any) => ({
            orderId: o.orderId || o._id || o.id || `ORD-${Date.now()}`,
            customerName: o.customerName || o.customer?.name || o.customer || "Unknown",
            createDate: o.createDate || o.date || o.createdAt || "",
            laundryStatus: o.laundryStatus || o.status || "Pending",
            feeStatus: o.feeStatus || o.paymentStatus || (o.paid === o.total ? "Paid" : "Unpaid"),
            totalFee: parseFloat(o.totalFee || o.total || o.amount || 0),
            createdBy: o.createdBy || null,
            lastUpdatedBy: o.lastUpdatedBy || null,
            // keep original object for view details
            __raw: o,
          }))
        : [];

      setInternalOrders(normalized);
    } catch (error) {
      console.error("Error fetching orders:", error);
      setInternalOrders([]);
    } finally {
      setInternalLoading(false);
    }
  };

  // Memoize filtered orders to avoid recalculation on every render
  const filteredOrders = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return orders.filter(
    (order) =>
        (order.orderId ?? "").toLowerCase().includes(query) ||
        (order.customerName ?? "").toLowerCase().includes(query)
  );
  }, [orders, searchQuery]);

  // Pagination: 5 per page
  const PAGE_SIZE = 5;
  const [page, setPage] = useState(1);

  // Reset to first page on search/orders change
  useEffect(() => {
    setPage(1);
  }, [searchQuery, orders.length]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));
  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredOrders.slice(start, start + PAGE_SIZE);
  }, [filteredOrders, page]);

  // Memoize formatDate function
  const formatDate = useCallback((dateString: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, []);

  // Memoize renderItem to prevent unnecessary re-renders
  const renderItem = useCallback(({ item }: { item: Order }) => (
    <View style={orderStyle.TableData}>
              <Text style={[orderStyle.cell, { flex: 1, fontWeight: '600', color: '#2563EB' }]}>
                {item.orderId}
              </Text>
              <Text style={[orderStyle.cell, { flex: 1, color: '#6B7280' }]}>
                {formatDate(item.createDate)}
              </Text>
              <View style={[orderStyle.cell, { flex: 1.5, flexDirection: 'row', alignItems: 'center', paddingLeft: 12 }]}>
                <View style={orderStyle.customerAvatar}>
                  <Text style={orderStyle.customerInitial}>
                    {item.customerName?.charAt(0)?.toUpperCase() || '?'}
                  </Text>
                </View>
                <Text style={[orderStyle.cell, { flex: 1, marginLeft: 8, textAlign: 'left' }]}>
                  {item.customerName}
              </Text>
              </View>
              <View style={[orderStyle.cell, { flex: 1, paddingLeft: 12 }]}>
                <View style={{ flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                  <View style={[
                    orderStyle.paymentBadge,
                    item.feeStatus === "Paid" 
                      ? orderStyle.paymentBadgePaid 
                      : item.feeStatus === "Partial"
                      ? orderStyle.paymentBadgePartial
                      : orderStyle.paymentBadgeUnpaid
                  ]}>
                    <Text style={[
                      orderStyle.paymentBadgeText,
                  item.feeStatus === "Paid"
                        ? orderStyle.paymentBadgeTextPaid 
                        : item.feeStatus === "Partial"
                        ? orderStyle.paymentBadgeTextPartial
                        : orderStyle.paymentBadgeTextUnpaid
                    ]}>
                      {item.feeStatus?.toUpperCase() || 'UNPAID'}
                    </Text>
                  </View>
          {item.feeStatus === "Paid" && (
                    <Text style={{
                      fontSize: 10,
              color: item.change && item.change > 0 ? '#059669' : '#6B7280',
                      fontWeight: '500',
                    }}>
              Change: ₱{(item.change || 0).toFixed(2)}
              </Text>
                  )}
                </View>
              </View>
              <Text style={[orderStyle.cell, { flex: 1, fontWeight: '600', color: '#111827' }]}>
                ₱{item.totalFee.toFixed(2)}
              </Text>
              <View style={[orderStyle.cell, { flex: 1.2, flexDirection: 'row', justifyContent: 'center', gap: 8 }]}>
              <TouchableOpacity
                onPress={() => {
                  setSelectedOrder(item.__raw || item);
                  setVisible(true);
                }}
                  style={orderStyle.actionButton}
                >
                  <Ionicons name="eye-outline" size={18} color="#2563EB" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    if (onEditOrder) {
                      onEditOrder(item.__raw || item);
                    } else {
                      setSelectedOrder(item.__raw || item);
                      setVisible(true);
                    }
                  }}
                  style={orderStyle.actionButton}
                >
                  <Ionicons name="create-outline" size={18} color="#16A34A" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    const orderData = item.__raw || item;
                    if (onViewInvoice) {
                      onViewInvoice(orderData);
                    } else {
                      Alert.alert("Error", "View Invoice handler not available");
                    }
                  }}
                  style={orderStyle.actionButton}
                >
                  <Ionicons name="document-text-outline" size={18} color="#6B7280" />
              </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            const orderData = item.__raw || item;
            if (onPrintReceipt) {
              onPrintReceipt(orderData);
            } else {
              Alert.alert("Error", "Print Receipt handler not available");
            }
          }}
          style={orderStyle.actionButton}
        >
          <Ionicons name="print-outline" size={18} color="#2563EB" />
        </TouchableOpacity>
              </View>
            </View>
  ), [formatDate, setSelectedOrder, setVisible, onEditOrder, onViewInvoice, onPrintReceipt]);

  // Table header component
  const renderHeader = useCallback(() => (
    <View style={orderStyle.TableHeader}>
      <Text style={[orderStyle.cell, orderStyle.HeaderText, { flex: 1 }]}>
        ORDER ID
      </Text>
      <Text style={[orderStyle.cell, orderStyle.HeaderText, { flex: 1 }]}>
        DATE
      </Text>
      <Text style={[orderStyle.cell, orderStyle.HeaderText, { flex: 1.5, textAlign: 'left', paddingLeft: 12 }]}>
        CUSTOMER
      </Text>
      <Text style={[orderStyle.cell, orderStyle.HeaderText, { flex: 1, textAlign: 'left', paddingLeft: 12 }]}>
        PAYMENT
      </Text>
      <Text style={[orderStyle.cell, orderStyle.HeaderText, { flex: 1 }]}>
        AMOUNT
      </Text>
      <Text style={[orderStyle.cell, orderStyle.HeaderText, { flex: 1.2 }]}>
        ACTIONS
      </Text>
    </View>
  ), []);

  // Empty component
  const renderEmpty = useCallback(() => (
          <Text style={{ textAlign: "center", padding: 20, color: "#6b7280" }}>
            No orders found.
          </Text>
  ), []);

  // Key extractor for FlatList
  const keyExtractor = useCallback((item: Order) => item.orderId || item.__raw?._id || item.__raw?.id || Math.random().toString(), []);

  if (loading) {
    return (
      <View style={orderStyle.Table}>
        {renderHeader()}
        <ActivityIndicator size="large" color="#2e63c5" style={{ margin: 20 }} />
      </View>
    );
  }

  return (
    <View style={orderStyle.Table}>
      <FlatList
        data={paginatedOrders}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={10}
        windowSize={10}
        getItemLayout={(data, index) => ({
          length: 80, // Approximate row height
          offset: 80 * index,
          index,
        })}
        ListFooterComponent={() => (
          <View style={orderStyle.paginationBar}>
            <TouchableOpacity
              onPress={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={[orderStyle.pageBtn, page <= 1 && orderStyle.pageBtnDisabled]}
            >
              <Ionicons name="chevron-back" size={16} color={page <= 1 ? '#9CA3AF' : '#2563EB'} />
              <Text style={[orderStyle.pageBtnText, page <= 1 && orderStyle.pageBtnTextDisabled]}>Prev</Text>
            </TouchableOpacity>
            <Text style={orderStyle.pageInfo}>Page {page} of {totalPages}</Text>
            <TouchableOpacity
              onPress={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              style={[orderStyle.pageBtn, page >= totalPages && orderStyle.pageBtnDisabled]}
            >
              <Text style={[orderStyle.pageBtnText, page >= totalPages && orderStyle.pageBtnTextDisabled]}>Next</Text>
              <Ionicons name="chevron-forward" size={16} color={page >= totalPages ? '#9CA3AF' : '#2563EB'} />
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
};

// Memoize and export the component
export default React.memo(OrderTableComponent);

// styles unchanged (copied from your file)
const orderStyle = StyleSheet.create({
  Table: {
    marginTop: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    backgroundColor: "rgba(255, 255, 255, 0.98)",
  },
  TableHeader: {
    flexDirection: "row",
    backgroundColor: "#f9fafb",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingVertical: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  HeaderText: {
    fontWeight: "600",
    color: "#374151",
    textAlign: "center",
    fontSize: 14,
  },
  TableData: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    backgroundColor: "#ffffff",
    alignItems: "center",
  },
  cell: {
    textAlign: "center",
    paddingVertical: 12,
    fontSize: 14,
    color: "#111827",
  },
  customerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#2563EB",
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerInitial: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  paymentBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  paymentBadgePaid: {
    backgroundColor: '#D1FAE5',
  },
  paymentBadgePartial: {
    backgroundColor: '#FEF3C7',
  },
  paymentBadgeUnpaid: {
    backgroundColor: '#FEE2E2',
  },
  paymentBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  paymentBadgeTextPaid: {
    color: '#059669',
  },
  paymentBadgeTextPartial: {
    color: '#D97706',
  },
  paymentBadgeTextUnpaid: {
    color: '#DC2626',
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  pageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  pageBtnDisabled: {
    opacity: 0.6,
  },
  pageBtnText: {
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 13,
  },
  pageBtnTextDisabled: {
    color: '#9CA3AF',
  },
  pageInfo: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '600',
  },
  greenStatus: {
    color: "#16a34a",
    fontWeight: "600",
  },
  yellowStatus: {
    color: "#ca8a04",
    fontWeight: "600",
  },
  orangeStatus: {
    color: "#ea580c",
    fontWeight: "600",
  },
  redStatus: {
    color: "#dc2626",
    fontWeight: "600",
  },
});

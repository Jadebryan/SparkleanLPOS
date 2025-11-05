import { View, Text, ScrollView, TouchableOpacity, Modal, Alert, ActivityIndicator, TextInput } from "react-native";
import { useState, useEffect } from "react";
import { Dropdown } from "react-native-element-dropdown";
import { Ionicons } from "@expo/vector-icons";
import orderListStyle from "./oderListStyle";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL } from "@/constants/api";

type Order = {
  orderId: string;
  id?: string;
  _id?: string;
  customerName?: string;
  customer?: string;
  createDate?: string;
  date?: string;
  createdAt?: string;
  pickupDate?: string;
  service?: string;
  quantity?: number | string;
  items?: Array<{
    service: string;
    quantity: string;
    amount?: number;
    status?: string;
  }>;
  serviceFee?: number;
  discount?: number | string;
  totalFee?: number;
  total?: string | number;
  amountPaid?: number;
  paid?: number;
  balance?: number | string;
  feeStatus?: string;
  payment?: string;
  notes?: string;
  createdBy?: any;
  updatedBy?: any;
  updateDate?: string;
  lastUpdatedBy?: string | null;
  lastEditedBy?: any;
  lastEditedAt?: string | Date;
  stationId?: string;
};

type ViewTransactionProps = {
  visible: boolean;
  setVisible: (value: boolean) => void;
  orderData: Order | null;
  initialEditMode?: boolean;
  onOrderUpdated?: () => void;
  onViewInvoice?: (order: Order) => void;
};

const ViewTransaction: React.FC<ViewTransactionProps> = ({ 
  visible, 
  setVisible, 
  orderData, 
  initialEditMode = false, 
  onOrderUpdated,
  onViewInvoice,
}) => {
  const [isEditing, setIsEditing] = useState(initialEditMode);
  const [paymentStatus, setPaymentStatus] = useState("Unpaid");
  const [orderStatus, setOrderStatus] = useState("Pending");
  const [userId, setUserId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [finalPaidInput, setFinalPaidInput] = useState<string>("");
  const [originalPayment, setOriginalPayment] = useState<string>("Unpaid");
  const [originalPaid, setOriginalPaid] = useState<number>(0);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const u = await AsyncStorage.getItem("user");
        if (u) {
          const parsed = JSON.parse(u);
          setUserId(parsed._id || null);
        }
      } catch (err) {
        console.error("Failed to read user:", err);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (orderData) {
      setPaymentStatus(orderData.payment || orderData.feeStatus || "Unpaid");
      // Get order status from first item if available, otherwise default to "Pending"
      if (orderData.items && orderData.items.length > 0 && orderData.items[0].status) {
        setOrderStatus(orderData.items[0].status);
      } else {
        setOrderStatus("Pending");
      }
      setIsEditing(initialEditMode);
      const initialPaid = orderData.paid || orderData.amountPaid || 0;
      setFinalPaidInput("");
      setOriginalPayment(orderData.payment || orderData.feeStatus || "Unpaid");
      setOriginalPaid(initialPaid);
    }
  }, [orderData, initialEditMode]);

  const handleCancel = () => {
    if (!orderData) return;
    setPaymentStatus(orderData.payment || orderData.feeStatus || "Unpaid");
    if (orderData.items && orderData.items.length > 0 && orderData.items[0].status) {
      setOrderStatus(orderData.items[0].status);
    } else {
      setOrderStatus("Pending");
    }
    setIsEditing(false);
  };

  const handleClose = () => {
    if (isEditing) {
      handleCancel();
    }
    setVisible(false);
  };

  const handleSave = async () => {
    if (!orderData) return;

    setIsSaving(true);
    try {
      const token = await AsyncStorage.getItem("token") || await AsyncStorage.getItem("userToken");
      
      if (!token) {
        Alert.alert("Error", "Authentication required.");
        setIsSaving(false);
        return;
      }

      const orderId = orderData.orderId || orderData.id || orderData._id;
      
      if (!orderId) {
        Alert.alert("Error", "Order ID not found.");
        setIsSaving(false);
      return;
    }

      // Prepare update data - include items with status if order status changed
      const updateData: any = { payment: paymentStatus };
      
      if (userId) {
        updateData.updatedBy = userId;
      }

      // If order status changed, update all items' status
      if (orderData.items && orderData.items.length > 0) {
        updateData.items = orderData.items.map((item: any) => ({
          service: item.service,
          quantity: item.quantity,
          amount: item.amount || 0,
          status: orderStatus || item.status || "Pending"
        }));
      }

      // Payment validation when marking as Paid/Partial
      const totalFeeNum = (()=>{
        if (typeof orderData.total === 'number') return orderData.total;
        if (typeof orderData.total === 'string') return parseFloat(orderData.total.replace(/[^\d.]/g, '')) || 0;
        if (orderData.totalFee) return orderData.totalFee;
        return 0;
      })();
      let effectivePaid = orderData.paid || orderData.amountPaid || 0;
      if (isEditing && paymentStatus === 'Paid') {
        const finalNum = parseFloat(finalPaidInput || '0') || 0;
        effectivePaid = originalPaid + finalNum;
        if (originalPayment !== 'Paid') {
          if (effectivePaid < totalFeeNum) {
            Alert.alert('Validation', 'Cannot mark as Paid: amount paid is less than total.');
            setIsSaving(false);
            return;
          }
          updateData.paid = effectivePaid;
          updateData.change = Math.max(0, effectivePaid - totalFeeNum);
        } else {
          updateData.paid = originalPaid;
        }
      } else if (isEditing && paymentStatus === 'Partial') {
        const addNum = parseFloat(finalPaidInput || '0') || 0;
        effectivePaid = originalPaid + addNum;
        if (effectivePaid <= 0) {
          Alert.alert('Validation', 'Enter a valid partial payment.');
          setIsSaving(false);
          return;
        }
        if (effectivePaid >= totalFeeNum) {
          Alert.alert('Validation', 'Partial payment cannot fully pay the order. Choose Paid instead.');
          setIsSaving(false);
          return;
        }
        updateData.paid = effectivePaid;
      }
      // If not paid, preserve paid if present
      if (paymentStatus !== 'Paid' && paymentStatus !== 'Partial') {
        if (orderData.paid || orderData.amountPaid) {
          updateData.paid = orderData.paid || orderData.amountPaid;
        }
      }

      console.log("Updating order:", orderId, "with data:", updateData);

      const response = await fetch(`${API_BASE_URL}/orders/${encodeURIComponent(orderId)}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();
      console.log("Update response:", response.status, data);

      if (response.ok) {
        setSuccessMessage("Order updated successfully!");
        setShowSuccessModal(true);
        setIsEditing(false);
        if (onOrderUpdated) {
          onOrderUpdated();
        }
      } else {
        const errorMsg = data.message || data.error || `Failed to update order. Status: ${response.status}`;
        console.error("Update failed:", errorMsg);
        Alert.alert("Error", errorMsg);
      }
    } catch (error: any) {
      console.error("Update error:", error);
      Alert.alert("Error", error.message || "Server error. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleViewInvoiceClick = () => {
    if (orderData && onViewInvoice) {
      onViewInvoice(orderData);
    }
  };

  if (!orderData) return null;

  const formatDate = (dateStr?: string | Date) => {
    if (!dateStr) return "N/A";
    try {
      return new Date(dateStr).toLocaleDateString();
    } catch {
      return String(dateStr);
    }
  };

  const formatDateTime = (dateStr?: string | Date) => {
    if (!dateStr) return "N/A";
    try {
      return new Date(dateStr).toLocaleString();
    } catch {
      return String(dateStr);
    }
  };

  const formatTime = (dateStr?: string | Date) => {
    if (!dateStr) return "N/A";
    try {
      return new Date(dateStr).toLocaleTimeString();
    } catch {
      return String(dateStr);
    }
  };

  const getOrderId = () => {
    return orderData.orderId || orderData.id || orderData._id || "N/A";
  };

  const getCustomerName = () => {
    return orderData.customerName || orderData.customer || "N/A";
  };

  const getTotalAmount = () => {
    if (orderData.totalFee) return `₱${orderData.totalFee.toFixed(2)}`;
    if (orderData.total) {
      const total = typeof orderData.total === 'string' ? orderData.total : `₱${orderData.total.toFixed(2)}`;
      return total;
    }
    return "₱0.00";
  };

  const getLastEditedInfo = () => {
    if (orderData.lastEditedBy && orderData.lastEditedAt) {
      const editorName = typeof orderData.lastEditedBy === 'object' 
        ? (orderData.lastEditedBy.fullName || orderData.lastEditedBy.username || orderData.lastEditedBy.email || "Unknown")
        : (orderData.lastUpdatedBy || "Unknown");
      return `Last edited by ${editorName} on ${formatDateTime(orderData.lastEditedAt)}`;
    }
    return null;
  };

  const getStatusBadgeStyle = (status: string) => {
    const statusLower = status.toLowerCase().replace(/ /g, '-');
    switch (statusLower) {
      case 'pending':
        return { backgroundColor: '#FEF3C7', color: '#92400E' };
      case 'in-progress':
        return { backgroundColor: '#DBEAFE', color: '#1E40AF' };
      case 'ready-for-pickup':
        return { backgroundColor: '#FDE68A', color: '#B45309' };
      case 'completed':
        return { backgroundColor: '#D1FAE5', color: '#065F46' };
      default:
        return { backgroundColor: '#F3F4F6', color: '#374151' };
    }
  };

  const orderItems = orderData.items || (orderData.service ? [{
    service: orderData.service,
    quantity: String(orderData.quantity || "1"),
    amount: orderData.serviceFee || 0,
    status: orderStatus
  }] : []);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Order Details - {getOrderId()}</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#111827" />
          </TouchableOpacity>
            </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Details Grid */}
            <View style={styles.detailsGrid}>
              {/* Left Column */}
              <View style={styles.detailColumn}>
                <DetailCard label="ORDER ID" value={getOrderId()} />
                <DetailCard label="CUSTOMER NAME" value={getCustomerName()} />
                <DetailCard 
                  label="PAYMENT STATUS" 
                  value={paymentStatus}
                  editable={isEditing && paymentStatus !== 'Paid' && originalPayment !== 'Paid'}
                  type="select"
                  options={["Unpaid", "Partial", "Paid"]}
                  selectedValue={paymentStatus}
                  onValueChange={setPaymentStatus}
                />
                {orderData.stationId && (
                  <DetailCard 
                    label="STATION/BRANCH" 
                    value={orderData.stationId}
                    highlight
                  />
                )}
            </View>

              {/* Right Column */}
              <View style={styles.detailColumn}>
                <DetailCard label="ORDER DATE" value={formatDate(orderData.createDate || orderData.date || orderData.createdAt)} />
                <DetailCard label="ORDER TIME" value={formatTime(orderData.createDate || orderData.date || orderData.createdAt)} />
                <DetailCard label="TOTAL AMOUNT" value={getTotalAmount()} amount />
                <DetailCard 
                  label="PAID AMOUNT" 
                  value={`₱${(orderData.paid || orderData.amountPaid || 0).toFixed(2)}`}
                  amount
                />
                {(isEditing && paymentStatus === 'Paid' && originalPayment !== 'Paid') || (isEditing && paymentStatus === 'Partial') ? (
                  <View style={styles.detailCard}>
                    <Text style={styles.detailLabel}>{paymentStatus === 'Partial' ? 'PARTIAL PAYMENT' : 'FINAL PAYMENT'}</Text>
                    <TextInput
                      keyboardType="numeric"
                      value={finalPaidInput}
                      onChangeText={(txt)=> setFinalPaidInput(txt)}
                      placeholder="0.00"
                      style={{ borderWidth:1, borderColor:'#E5E7EB', borderRadius:6, paddingHorizontal:12, height:40 }}
                    />
                    <Text style={{ marginTop:6, fontSize:12, color:'#6B7280' }}>
                      {(() => {
                        const subtotal = (()=>{
                          if (typeof orderData.total === 'number') return orderData.total;
                          if (typeof orderData.total === 'string') return parseFloat(orderData.total.replace(/[^\d.]/g, '')) || 0;
                          if (orderData.totalFee) return orderData.totalFee;
                          return 0;
                        })();
                        const finalNum = parseFloat(finalPaidInput || '0') || 0;
                        const effective = originalPaid + finalNum;
                        const diff = effective - subtotal;
                        if (paymentStatus === 'Partial') {
                          return `Previous Paid: ₱${originalPaid.toFixed(2)} • This Payment: ₱${finalNum.toFixed(2)} • New Total Paid: ₱${effective.toFixed(2)} • Remaining: ₱${Math.max(0, subtotal - effective).toFixed(2)}`
                        }
                        return `Previous Paid: ₱${originalPaid.toFixed(2)} • Final Payment: ₱${finalNum.toFixed(2)} • Total Paid: ₱${effective.toFixed(2)}${diff > 0 ? ` • Change: ₱${diff.toFixed(2)}` : diff < 0 ? ` • Remaining: ₱${Math.abs(diff).toFixed(2)}` : ' • Fully paid'}`
                      })()}
                    </Text>
                  </View>
                ) : null}
                <DetailCard 
                  label="BALANCE" 
                  value={typeof orderData.balance === 'string' ? orderData.balance : `₱${(orderData.balance || 0).toFixed(2)}`}
                />
                {paymentStatus === 'Paid' && (
                  <View style={styles.detailCard}>
                    <Text style={styles.detailLabel}>CHANGE</Text>
                    <Text style={[styles.detailValue, { color: (orderData.change || 0) > 0 ? '#059669' : '#6B7280', fontWeight: '700' }] }>
                      ₱{(orderData.change || 0).toFixed(2)}
                    </Text>
                  </View>
                )}
                <DetailCard 
                  label="ORDER STATUS" 
                  value={orderStatus}
                editable={isEditing}
                  type="select"
                  options={["Pending", "In Progress", "Ready for Pickup", "Completed"]}
                  selectedValue={orderStatus}
                  onValueChange={setOrderStatus}
              />
              </View>
            </View>

            {/* Last Edited Info */}
            {getLastEditedInfo() && (
              <View style={styles.lastEditedInfo}>
                <Ionicons name="create-outline" size={14} color="#666" />
                <Text style={styles.lastEditedText}>{getLastEditedInfo()}</Text>
            </View>
            )}

            {/* Order Items Section */}
            {orderItems.length > 0 && (
              <View style={styles.itemsSection}>
                <View style={styles.itemsHeader}>
                  <Text style={styles.itemsTitle}>Order Items</Text>
                </View>
                <View style={styles.itemsList}>
                  {orderItems.map((item, index) => {
                    const badgeStyle = getStatusBadgeStyle(item.status || "Pending");
                    return (
                      <View key={index} style={styles.itemRow}>
                        <View style={styles.itemInfo}>
                          <Text style={styles.itemService}>{item.service}</Text>
                          <Text style={styles.itemQty}>{item.quantity}</Text>
                        </View>
                        <View style={[styles.statusBadge, { backgroundColor: badgeStyle.backgroundColor }]}>
                          <Text style={[styles.statusBadgeText, { color: badgeStyle.color }]}>
                            {item.status || "Pending"}
                          </Text>
            </View>
              </View>
                    );
                  })}
              </View>
            </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity 
              onPress={handleClose} 
              style={[styles.footerButton, styles.secondaryButton]}
            >
              <Text style={styles.secondaryButtonText}>Close</Text>
            </TouchableOpacity>
            {onViewInvoice && (
              <TouchableOpacity 
                onPress={handleViewInvoiceClick} 
                style={[styles.footerButton, styles.secondaryButton]}
              >
                <Ionicons name="document-text-outline" size={18} color="#374151" style={{ marginRight: 8 }} />
                <Text style={styles.secondaryButtonText}>View Invoice</Text>
              </TouchableOpacity>
            )}
            {!isEditing ? (
              <TouchableOpacity 
                onPress={handleEdit} 
                style={[styles.footerButton, styles.secondaryButton]}
              >
                <Ionicons name="create-outline" size={18} color="#374151" style={{ marginRight: 8 }} />
                <Text style={styles.secondaryButtonText}>Edit</Text>
              </TouchableOpacity>
          ) : (
              <TouchableOpacity 
                onPress={handleSave} 
                style={[styles.footerButton, styles.primaryButton]}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.primaryButtonText}>Saving...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.primaryButtonText}>Save Changes</Text>
                  </>
                )}
            </TouchableOpacity>
          )}
        </View>
      </View>
      </View>

      {/* Success Modal */}
      {showSuccessModal && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setShowSuccessModal(false)}>
          <View style={styles.feedbackOverlay}>
            <View style={styles.feedbackCard}>
              <Text style={styles.feedbackTitle}>Success</Text>
              <Text style={styles.feedbackText}>{successMessage || 'Action completed successfully.'}</Text>
              <TouchableOpacity style={[styles.footerButton, styles.primaryButton, { alignSelf: 'flex-end', marginTop: 16 }]} onPress={() => setShowSuccessModal(false)}>
                <Text style={styles.primaryButtonText}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </Modal>
  );
};

// Detail Card Component
const DetailCard: React.FC<{
  label: string;
  value: string;
  editable?: boolean;
  type?: "text" | "select";
  options?: string[];
  selectedValue?: string;
  onValueChange?: (value: string) => void;
  amount?: boolean;
  highlight?: boolean;
}> = ({ 
  label,
  value,
  editable = false, 
  type = "text",
  options = [],
  selectedValue,
  onValueChange,
  amount = false,
  highlight = false,
}) => {
  if (type === "select" && editable) {
  const dropdownData = options.map((opt) => ({ label: opt, value: opt }));

  return (
      <View style={styles.detailCard}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Dropdown
          data={dropdownData}
          labelField="label"
          valueField="value"
          value={selectedValue}
          placeholder="Select option"
          style={styles.dropdown}
          placeholderStyle={styles.dropdownPlaceholder}
          selectedTextStyle={styles.dropdownSelectedText}
          containerStyle={styles.dropdownContainer}
          onChange={(item) => onValueChange?.(item.value)}
        />
      </View>
    );
  }

            return (
    <View style={styles.detailCard}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={[
        styles.detailValue,
        amount && styles.detailValueAmount,
        highlight && styles.detailValueHighlight
      ]}>
        {value}
                </Text>
              </View>
            );
};

const styles = {
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 700,
    height: "80%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingHorizontal: 24,
    backgroundColor: "#F9FAFB",
    borderBottomWidth: 2,
    borderBottomColor: "#E5E7EB",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBody: {
    padding: 24,
    flex: 1,
  },
  detailsGrid: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 24,
    flexWrap: "wrap",
  },
  detailColumn: {
    flex: 1,
    minWidth: 280,
    gap: 16,
  },
  detailCard: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    padding: 12,
    paddingHorizontal: 16,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  detailValueAmount: {
    fontSize: 18,
    color: "#F97316", // Orange
  },
  detailValueHighlight: {
    color: "#059669", // Green for change
    fontFamily: "monospace",
  },
  dropdown: {
    height: 40,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 6,
    paddingHorizontal: 12,
  },
  dropdownPlaceholder: {
    color: "#9CA3AF",
  },
  dropdownSelectedText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  dropdownContainer: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginTop: 4,
  },
  lastEditedInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 20,
    padding: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
  },
  lastEditedText: {
    fontSize: 13,
    color: "#666666",
  },
  itemsSection: {
    marginTop: 24,
  },
  itemsHeader: {
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: "#F97316",
  },
  itemsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  itemsList: {
    gap: 12,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    paddingHorizontal: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  itemInfo: {
    flex: 1,
    gap: 4,
  },
  itemService: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  itemQty: {
    fontSize: 13,
    color: "#6B7280",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    padding: 16,
    paddingHorizontal: 24,
    backgroundColor: "#F9FAFB",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
  },
  footerButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  secondaryButton: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  primaryButton: {
    backgroundColor: "#2563EB",
  },
  primaryButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  feedbackOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  feedbackCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  feedbackTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  feedbackText: {
    fontSize: 16,
    color: '#374151',
  },
};

export default ViewTransaction;

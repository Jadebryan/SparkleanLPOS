import React, { useState, useEffect, useRef } from "react";
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  Keyboard,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Platform,
} from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { Dropdown } from 'react-native-element-dropdown';
import MaskInput from 'react-native-mask-input';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/constants/api';
import axios from 'axios';
import AddCustomerModal from './AddCustomerModal';
import designSystem, { colors, typography, spacing, borderRadius, cardStyles, inputStyles, buttonStyles, badgeStyles } from '@/app/theme/designSystem';
import { useColors } from '@/app/theme/useColors';
import { useButtonStyles } from '@/app/theme/useButtonStyles';
import { useToast } from '@/app/context/ToastContext';
import { useModalTabs } from '@/app/context/ModalTabContext';

// Interface for order data
export interface OrderData {
  orderId: string;
  customerName: string;
  customerPhone?: string;
  date: string;
  service: string;
  quantity: number;
  serviceFee: number;
  amountPaid: number;
  feeStatus: "Paid" | "Partial" | "Unpaid";
  discount?: number;
  pickupDate: string;
  notes?: string;
  createdBy: string;
  stationId: string;
}

interface Service {
  _id: string;
  name: string;
  base_price: number;
  price?: number;
  unit?: string;
  category?: string;
  isActive?: boolean;
  isArchived?: boolean;
  isPopular?: boolean;
}

interface Discount {
  _id: string;
  code?: string;
  name: string;
  type?: 'percentage' | 'fixed';
  value: number;
  minPurchase?: number;
  active?: boolean;
  isArchived?: boolean;
  usageCount?: number;
  maxUsage?: number;
  validFrom?: string;
  validUntil?: string;
}

interface ServiceItem {
  id: string;
  serviceId: string;
  serviceName: string;
  quantity: number;
  price: number;
  amount: number;
  unit?: string;
}

// Function to create a new order
export const addOrder = async (orderData: any) => {
  try {
    console.log("=== addOrder function called ===");
    console.log("API_BASE_URL:", API_BASE_URL);
    console.log("Order data:", JSON.stringify(orderData, null, 2));
    
    const token = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('userToken');
    console.log("Token found:", token ? "Yes" : "No");
    
    const headers: any = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    
    console.log("Request headers:", headers);
    console.log("Request URL:", `${API_BASE_URL}/orders`);

    const response = await axios.post(`${API_BASE_URL}/orders`, orderData, { headers });
    console.log("Order API response status:", response.status);
    console.log("Order API response data:", response.data);
    
    // Handle different response formats
    if (response.data) {
      // Check if response has success field
      if (response.data.success === false) {
        const errorMsg = response.data.message || 'Order creation failed';
        console.error("Order creation failed with success: false", errorMsg);
        throw new Error(errorMsg);
      }
      // Return the data (could be response.data or response.data.data)
      console.log("Order created successfully!");
      return response.data.data || response.data;
    }
    return response.data;
  } catch (error: any) {
    console.error("=== Error in addOrder function ===");
    console.error("Error type:", error?.constructor?.name);
    console.error("Error message:", error?.message);
    console.error("Error response status:", error?.response?.status);
    console.error("Error response status text:", error?.response?.statusText);
    console.error("Error response data:", error?.response?.data);
    console.error("Full error object:", error);
    
    // Extract detailed error information
    const errorData = error?.response?.data || {};
    const message = errorData.message || 
                   errorData.error || 
                   error?.message || 
                   "Something went wrong. Please check the console for details.";
    
    // If there are detailed validation errors, show them
    let errorDetails = '';
    if (errorData.errors && Array.isArray(errorData.errors) && errorData.errors.length > 0) {
      errorDetails = '\n\nValidation errors:\n' + errorData.errors.join('\n');
    } else if (errorData.errorDetails && Array.isArray(errorData.errorDetails) && errorData.errorDetails.length > 0) {
      errorDetails = '\n\nValidation errors:\n' + errorData.errorDetails.map((e: any) => `${e.field}: ${e.message}`).join('\n');
    }
    
    const fullMessage = message + errorDetails;
    console.error("Alert message:", fullMessage);
    console.error("Error details:", errorData);
    
    Alert.alert("Error creating order", fullMessage);
    throw error;
  }
};

// Generate unique order ID
export const generateUniqueOrderId = async () => {
  try {
    const token = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('userToken');
    const headers: any = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    
    const response = await axios.get(`${API_BASE_URL}/orders`, { headers });
    if (Array.isArray(response.data) && response.data.length > 0) {
      const lastOrder = response.data[response.data.length - 1];
      const lastId = lastOrder.orderId?.match(/\d+/)?.[0];
      if (lastId) {
        const nextNum = parseInt(lastId) + 1;
        return `ORD-${new Date().getFullYear()}-${String(nextNum).padStart(3, '0')}`;
      }
    }
    return `ORD-${new Date().getFullYear()}-001`;
  } catch (error) {
    return `ORD-${Date.now()}`;
  }
};

interface AddOrderFormProps {
  isModal?: boolean;
  onOrderCreated?: () => void;
  onClose?: () => void;
  draftOrderId?: string | null;
  tabId?: string;
  onDataChange?: (data: any) => void;
  initialData?: any;
}

const AddOrderForm: React.FC<AddOrderFormProps> = ({
  isModal = false,
  onOrderCreated,
  onClose,
  draftOrderId = null,
  tabId,
  onDataChange,
  initialData,
}) => {
  const { showSuccess, showError, showInfo } = useToast();
  const dynamicColors = useColors();
  const dynamicButtonStyles = useButtonStyles();
  const { registerDraftSave } = useModalTabs();
  const [userId, setUserId] = useState<string>("");
  const [userStation, setUserStation] = useState<string>("");
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);
  const [customers, setCustomers] = useState<{ _id: string; customerName: string; phoneNumber: string; email?: string }[]>([]);
  
  // Form state
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [showCustomerSuggestions, setShowCustomerSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const [selectedServiceId, setSelectedServiceId] = useState<string>("");
  const [quantity, setQuantity] = useState("1");
  const [orderServices, setOrderServices] = useState<ServiceItem[]>([]);
  
  const [pickupDate, setPickupDate] = useState("");
  const [selectedDiscountId, setSelectedDiscountId] = useState("");
  const [paidAmount, setPaidAmount] = useState("0");
  const [paymentStatus, setPaymentStatus] = useState<"Paid" | "Partial" | "Unpaid">("Unpaid");
  const [notes, setNotes] = useState("");

  const [discountOptions, setDiscountOptions] = useState<Discount[]>([]);
  const [loadingDiscounts, setLoadingDiscounts] = useState(true);
  
  // Modal states
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [pendingCustomerData, setPendingCustomerData] = useState<{ name: string; phone: string } | null>(null);
  const [skipCustomerCreation, setSkipCustomerCreation] = useState(false);
  const [showCustomerConfirmationModal, setShowCustomerConfirmationModal] = useState(false);
  
  // Success feedback state
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [paidAmountError, setPaidAmountError] = useState("");
  
  // Overpayment modal state
  const [showOverpaymentModal, setShowOverpaymentModal] = useState(false);
  const [overpaymentData, setOverpaymentData] = useState<{paidValue: number, totalAmount: number, changeDue: number} | null>(null);
  const [pendingOrderCreation, setPendingOrderCreation] = useState(false);

  // Reset form when modal closes (track previous isModal value)
  const prevIsModalRef = useRef(isModal);
  useEffect(() => {
    if (prevIsModalRef.current && !isModal) {
      // Modal was open and now closed - reset form
      setCustomerName("");
      setCustomerPhone("");
      setOrderServices([]);
      setSelectedServiceId("");
      setQuantity("1");
      setPickupDate("");
      setSelectedDiscountId("");
      setPaidAmount("0");
      setPaymentStatus("Unpaid");
      setNotes("");
      setShowCustomerSuggestions(false);
      setSkipCustomerCreation(false);
    }
    prevIsModalRef.current = isModal;
  }, [isModal]);

  // Fetch logged-in user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const storedUser = await AsyncStorage.getItem('user');
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          if (parsed._id) setUserId(parsed._id);
          if (parsed.stationId) setUserStation(parsed.stationId);
        }
      } catch (err) {
        console.error("Failed to load user:", err);
      }
    };
    fetchUser();
  }, []);

  // Fetch services, customers, and discounts
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('userToken');
        const headers: any = { 'Content-Type': 'application/json' };
        if (token) headers.Authorization = `Bearer ${token}`;

        // Fetch services
        const servicesRes = await axios.get(`${API_BASE_URL}/services`, { headers });
        const servicesData = Array.isArray(servicesRes.data) 
          ? servicesRes.data 
          : servicesRes.data?.data || servicesRes.data?.services || [];
        const activeServices = servicesData
          .filter((s: any) => s.isActive !== false && !s.isArchived)
          .map((s: any) => ({
            _id: s._id || s.id,
            name: s.name,
            base_price: s.base_price || s.price,
            price: s.price || s.base_price,
            unit: s.unit || 'item',
            category: s.category,
            isActive: true,
            isArchived: false,
            isPopular: s.isPopular || false,
          }));
        setServices(activeServices);
        
        // Fetch customers
        const customersRes = await axios.get(`${API_BASE_URL}/customers`, { headers });
        const customersRaw = Array.isArray(customersRes.data)
          ? customersRes.data
          : customersRes.data?.data || customersRes.data?.customers || [];
        
        // Map backend customer format (name, phone) to frontend format (customerName, phoneNumber)
        const customersData = customersRaw
          .filter((c: any) => c && (c.name || c.customerName)) // Filter out null/undefined
          .map((c: any) => ({
            _id: c._id || c.id,
            customerName: c.name || c.customerName || '',
            phoneNumber: c.phone || c.phoneNumber || '',
            email: c.email || '',
          }));
        setCustomers(customersData);

        // Fetch discounts
        const discountsRes = await axios.get(`${API_BASE_URL}/discounts`, { headers });
        const discountsData = Array.isArray(discountsRes.data)
          ? discountsRes.data
          : discountsRes.data?.data || discountsRes.data?.discounts || [];
        const now = new Date();
        const processedDiscounts: Discount[] = discountsData.map((d: any) => ({
            _id: d._id || d.id,
            code: d.code,
            name: d.name,
            type: d.type || 'fixed',
            value: d.value,
            minPurchase: d.minPurchase || 0,
          active: d.isActive !== false,
          isArchived: !!d.isArchived,
          usageCount: d.usageCount || 0,
          maxUsage: d.maxUsage || 0,
          validFrom: d.validFrom,
          validUntil: d.validUntil,
        }));

        const availableDiscounts = processedDiscounts.filter(d => {
          if (!d.active || d.isArchived) return false;
          if (d.maxUsage && d.maxUsage > 0 && d.usageCount !== undefined && d.usageCount >= d.maxUsage) {
            return false;
          }
          const validFrom = d.validFrom ? new Date(d.validFrom) : new Date(0);
          const validUntil = d.validUntil ? new Date(d.validUntil) : new Date('2100-01-01');
          return validFrom <= now && validUntil >= now;
        });

        setDiscountOptions(availableDiscounts);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoadingServices(false);
        setLoadingDiscounts(false);
      }
    };
    fetchData();
  }, []);

  // Check if customer exists
  const isExistingCustomer = (name: string, phone: string) => {
    if (!name && !phone) return false;
    return customers.some(customer => {
      if (!customer) return false;
      const customerNameLower = customer.customerName?.toLowerCase() || '';
      const customerPhone = customer.phoneNumber || '';
      const nameLower = name?.toLowerCase().trim() || '';
      const phoneTrim = phone?.trim() || '';
      
      return (customerNameLower === nameLower) || (customerPhone === phoneTrim);
    });
  };

  // Filter customers for autocomplete
  const filteredCustomerSuggestions = customerName.trim()
    ? customers
        .filter(customer => {
          if (!customer) return false;
          const custName = customer.customerName || '';
          const custPhone = customer.phoneNumber || '';
          const searchTerm = customerName.toLowerCase();
          
          return (
            custName.toLowerCase().includes(searchTerm) ||
            custPhone.includes(customerName) ||
            (customerPhone.trim() && custPhone.includes(customerPhone))
          );
        })
        .slice(0, 5)
    : [];

  // Handle customer selection
  const handleCustomerSelect = (customer: { customerName: string; phoneNumber: string }) => {
    setCustomerName(customer.customerName);
    setCustomerPhone(customer.phoneNumber);
    setShowCustomerSuggestions(false);
    setSelectedSuggestionIndex(0);
  };

  // Add service to order
  const handleAddService = () => {
    if (!selectedServiceId) {
      Alert.alert("Error", "Please select a service");
      return;
    }
    
    const service = services.find(s => s._id === selectedServiceId);
    if (!service) return;

    // Check if service already exists (don't allow duplicates)
    const existingIndex = orderServices.findIndex(os => os.serviceId === selectedServiceId);
    if (existingIndex >= 0) {
      Alert.alert("Service Already Added", "This service is already in the order. Please update the quantity in the services list.");
      return;
    }

    const qty = parseInt(quantity) || 1;
    if (qty <= 0) {
      Alert.alert("Error", "Quantity must be greater than 0");
      return;
    }

    // Calculate amount based on unit type
    const servicePrice = service.price || service.base_price;
    const unit = service.unit || 'item';
    let amount = 0;
    
    if (unit === 'flat') {
      amount = servicePrice; // Flat rate, quantity doesn't matter
    } else {
      amount = servicePrice * qty;
    }

    // Add new service
    const newService: ServiceItem = {
      id: Date.now().toString(),
      serviceId: selectedServiceId,
      serviceName: service.name,
      quantity: qty,
      price: servicePrice,
      amount: amount,
      unit: unit,
    };
    setOrderServices([...orderServices, newService]);

    // Reset form
    setSelectedServiceId("");
    setQuantity("1");
  };

  // Update service quantity inline
  const handleUpdateQuantity = (serviceItemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveService(serviceItemId);
      return;
    }
    
    setOrderServices(orderServices.map(os => {
      if (os.id === serviceItemId) {
        const service = services.find(s => s._id === os.serviceId);
        if (service) {
          const unit = os.unit || service.unit || 'item';
          let newAmount = 0;
          
          if (unit === 'flat') {
            newAmount = os.price; // Flat rate
          } else {
            newAmount = os.price * newQuantity;
          }
          
          return { ...os, quantity: newQuantity, amount: newAmount };
        }
      }
      return os;
    }));
  };

  // Remove service from order
  const handleRemoveService = (serviceId: string) => {
    setOrderServices(orderServices.filter(os => os.id !== serviceId));
  };

  // Calculate totals with discount validation
  useEffect(() => {
    // Recalculate when orderServices, discount, or paid amount changes
    const calculateTotals = () => {
      let subtotal = orderServices.reduce((sum, item) => sum + item.amount, 0);
      
      let discountValue = 0;
      if (selectedDiscountId && subtotal > 0) {
        const selectedDiscount = discountOptions.find(d => d._id === selectedDiscountId && d.active !== false);
        if (selectedDiscount) {
          // Check minimum purchase requirement
          if (subtotal >= (selectedDiscount.minPurchase || 0)) {
            if (selectedDiscount.type === 'percentage') {
              discountValue = subtotal * (selectedDiscount.value / 100);
            } else {
              discountValue = selectedDiscount.value;
            }
          } else if (selectedDiscount.minPurchase > 0) {
            // Silently remove discount if minimum purchase not met (e.g., when items are removed)
            // The discount will be hidden from the dropdown automatically
            setSelectedDiscountId("");
            discountValue = 0;
          }
        }
      }
      
      const total = Math.max(0, subtotal - discountValue);
      const paid = parseFloat(paidAmount.replace(/[^0-9.]/g, '')) || 0;
      const balance = total - paid; // Can be negative (overpayment)
      
      // Update payment status based on balance and paid amount
      if (paid >= total && total > 0) {
        // Fully paid (or overpaid)
        setPaymentStatus("Paid");
      } else if (paid > 0 && paid < total) {
        // Partial payment
        setPaymentStatus("Partial");
      } else {
        // Unpaid
        setPaymentStatus("Unpaid");
      }
    };
    
    calculateTotals();
  }, [orderServices, selectedDiscountId, paidAmount, discountOptions]);

  // Calculate totals for display
  const subtotal = orderServices.reduce((sum, item) => sum + item.amount, 0);
  const selectedDiscount = discountOptions.find(d => d._id === selectedDiscountId);
  let discountAmount = 0;
  if (selectedDiscount && subtotal >= (selectedDiscount.minPurchase || 0)) {
    if (selectedDiscount.type === 'percentage') {
      discountAmount = subtotal * (selectedDiscount.value / 100);
    } else {
      discountAmount = selectedDiscount.value;
    }
  }
  const totalAmount = Math.max(0, subtotal - discountAmount);
  const paid = parseFloat(paidAmount.replace(/[^0-9.]/g, '')) || 0;
  const balanceDue = totalAmount - paid; // Can be negative (overpayment = change due)
  const changeDue = balanceDue < 0 ? Math.abs(balanceDue) : 0;

  // Auto-save draft to tab context and localStorage
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      // Only auto-save if there's actual data
      if (customerName.trim() || orderServices.length > 0 || paidAmount || notes.trim()) {
        const formData = {
          customerName,
          customerPhone,
          orderServices,
          selectedDiscountId,
          paidAmount,
          pickupDate,
          paymentStatus,
          notes,
          savedAt: new Date().toISOString(),
        };
        
        // Save to tab context if tabId is provided
        if (tabId && onDataChange) {
          onDataChange({ formData }); // Wrap in formData key
        }
        
        // Only save to localStorage if NOT using tabs (backward compatibility)
        if (!tabId) {
          saveDraftToLocalStorage(formData);
        }
      }
    }, 1000); // Debounce: save 1 second after user stops typing

    return () => clearTimeout(timeoutId);
  }, [customerName, customerPhone, orderServices, selectedDiscountId, paidAmount, pickupDate, notes, tabId, onDataChange]);

  // Save draft to localStorage
  const saveDraftToLocalStorage = (draft?: any) => {
    try {
      const data = draft || {
        customerName,
        customerPhone,
        orderServices,
        selectedDiscountId,
        paidAmount,
        pickupDate,
        paymentStatus,
        notes,
        savedAt: new Date().toISOString(),
      };
      AsyncStorage.setItem('orderDraft', JSON.stringify(data));
    } catch (error) {
      console.error('Error saving draft:', error);
    }
  };

  // Track if form has been initialized for this tab
  const formInitializedRef = useRef<Set<string>>(new Set());

  // Restore draft from initialData (tab context) or localStorage on mount
  useEffect(() => {
    // If form was already initialized for this tab, don't re-initialize
    if (tabId && formInitializedRef.current.has(tabId)) {
      return;
    }

    const restoreDraft = async () => {
      try {
        // First, try to use initialData from tab context
        if (initialData && Object.keys(initialData).length > 0) {
          if (initialData.customerName || initialData.orderServices?.length > 0) {
            setCustomerName(initialData.customerName || '');
            setCustomerPhone(initialData.customerPhone || '');
            setOrderServices(initialData.orderServices || []);
            setSelectedDiscountId(initialData.selectedDiscountId || '');
            setPaidAmount(initialData.paidAmount || '0');
            setPickupDate(initialData.pickupDate || '');
            setPaymentStatus(initialData.paymentStatus || 'Unpaid');
            setNotes(initialData.notes || '');
            if (tabId) formInitializedRef.current.add(tabId);
            return; // Don't load from localStorage if we have tab data
          }
        }
        
        // For tab-based modals, don't load from localStorage - start fresh
        // Only load from localStorage if NOT using tabs (backward compatibility)
        if (tabId) {
          // New tab - start with empty form
          setCustomerName('');
          setCustomerPhone('');
          setOrderServices([]);
          setSelectedDiscountId('');
          setPaidAmount('0');
          setPickupDate('');
          setPaymentStatus('Unpaid');
          setNotes('');
          formInitializedRef.current.add(tabId);
          return;
        }
        
        // Fallback to localStorage only for non-tab modals (backward compatibility)
        const savedDraft = await AsyncStorage.getItem('orderDraft');
        if (savedDraft) {
          const draft = JSON.parse(savedDraft);
          if (draft && Object.keys(draft).length > 0) {
            // Only restore if there's actual data
            if (draft.customerName || draft.orderServices?.length > 0) {
              setCustomerName(draft.customerName || '');
              setCustomerPhone(draft.customerPhone || '');
              setOrderServices(draft.orderServices || []);
              setSelectedDiscountId(draft.selectedDiscountId || '');
              setPaidAmount(draft.paidAmount || '0');
              setPickupDate(draft.pickupDate || '');
              setPaymentStatus(draft.paymentStatus || 'Unpaid');
              setNotes(draft.notes || '');
            }
          }
        }
      } catch (error) {
        console.error('Error restoring draft:', error);
      }
    };
    restoreDraft();
  }, [tabId, initialData]); // Run when tabId or initialData changes

  // handleSaveDraft will be defined later, we'll register it there

  // Create order
  const handleCreateOrder = async () => {
    console.log("=== handleCreateOrder called ===");
    try {
    Keyboard.dismiss();

    if (!customerName.trim()) {
      Alert.alert("Error", "Please enter customer name");
      return;
    }

    if (orderServices.length === 0) {
      Alert.alert("Error", "Please add at least one service");
      return;
    }

    // Check if customer exists
      const customerExists = isExistingCustomer(customerName, customerPhone);
      console.log("Customer exists check:", customerExists, "Name:", customerName, "Phone:", customerPhone);

      if (!customerExists) {
        // Customer doesn't exist, show confirmation modal first
      setPendingCustomerData({ name: customerName.trim(), phone: customerPhone.trim() });
        console.log("Showing customer confirmation modal");
        setShowCustomerConfirmationModal(true);
      return;
    }

    // Customer exists, proceed with order creation
      console.log("Customer exists - proceeding with order creation");
    await createOrder();
    } catch (error) {
      console.error("Error in handleCreateOrder:", error);
      Alert.alert("Error", "An error occurred. Please try again.");
    }
  };

  const createOrder = async (skipCustomer: boolean = false) => {
    try {
      // Use the passed parameter or fall back to state
      const shouldSkip = skipCustomer || skipCustomerCreation;
      console.log("createOrder called with skipCustomer:", skipCustomer, "shouldSkip:", shouldSkip);
      
      // Validation: Only prevent negative amounts (overpayment is allowed)
      const paidValue = parseFloat(paidAmount.replace(/[^0-9.]/g, '')) || 0;
      
      if (paidValue < 0) {
        Alert.alert(
          "Invalid Amount",
          "Paid amount cannot be negative. Please enter a valid amount.",
          [{ text: "OK" }]
        );
        return;
      }

      // Show confirmation if overpayment detected
      if (paidValue > totalAmount && totalAmount > 0) {
        const changeDue = paidValue - totalAmount;
        setOverpaymentData({
          paidValue,
          totalAmount,
          changeDue
        });
        setPendingOrderCreation(true);
        // Store skip flag in overpayment data so it's preserved
        setSkipCustomerCreation(shouldSkip);
        setShowOverpaymentModal(true);
        return;
      }

      // Normal payment, proceed with order creation
      await createOrderConfirmed(paidValue, shouldSkip);
    } catch (error: any) {
      console.error("Create order failed:", error);
      if (!error?.response) {
        Alert.alert("Error", "Failed to create order. Please try again.");
      }
    }
  };

  const createOrderConfirmed = async (paidValue: number, skipCustomer: boolean = false) => {
    try {
      // Use the passed parameter or fall back to state
      const shouldSkip = skipCustomer || skipCustomerCreation;
      console.log("=== Starting order creation ===");
      console.log("Order Services:", orderServices);
      console.log("Customer Name:", customerName);
      console.log("Customer Phone:", customerPhone);
      console.log("Paid Amount:", paidValue);
      console.log("Selected Discount ID:", selectedDiscountId);
      console.log("skipCustomerCreation flag:", shouldSkip);

      // Prepare order items with proper unit handling
      // Note: Backend generates orderId automatically
      const items = orderServices.map(os => {
        const service = services.find(s => s._id === os.serviceId);
        const unit = os.unit || service?.unit || 'item';
        
        let quantityStr = '';
        if (unit === 'flat') {
          quantityStr = '1 flat';
        } else if (unit === 'kg') {
          quantityStr = `${os.quantity}kg`;
        } else {
          quantityStr = `${os.quantity} ${unit === 'item' ? 'item' : unit}${os.quantity > 1 ? 's' : ''}`;
        }

        const item = {
          service: os.serviceName,
          quantity: quantityStr,
          amount: os.amount,
          discount: '0%',
          status: 'Pending',
        };
        console.log("Item created:", item);
        return item;
      });

      console.log("Items array:", items);

      // Use actual paid amount (overpayment allowed - will be handled as change due)
      const actualPaid = paidValue;

      // Backend expects 'customer' not 'customerName', and handles orderId, date, createdBy, stationId automatically
      // Backend calculates payment status automatically, so we don't need to send it
      const orderData: any = {
        customer: customerName.trim(),
        items,
        paid: actualPaid,
      };
      
      // Add optional fields only if they have values
      if (customerPhone && customerPhone.trim()) {
        orderData.customerPhone = customerPhone.trim();
      }
      
      if (selectedDiscountId && selectedDiscountId.trim() !== '') {
        orderData.discountId = selectedDiscountId.trim();
      }
      
      if (pickupDate && pickupDate.trim() !== '') {
        orderData.pickupDate = pickupDate.trim();
      }
      
      if (notes && notes.trim()) {
        orderData.notes = notes.trim();
      }

      // Include stationId if available (many backends require it for staff orders)
      if (userStation && String(userStation).trim() !== '') {
        orderData.stationId = String(userStation).trim();
      }

      // Add skipCustomerCreation flag (always send it explicitly)
      orderData.skipCustomerCreation = shouldSkip;

      console.log("Order data to send:", JSON.stringify(orderData, null, 2));
      console.log("skipCustomerCreation flag being sent:", shouldSkip);

      const response = await addOrder(orderData);
      console.log("Order creation response:", response);
      
      // Clear draft from localStorage after successful order creation
      await AsyncStorage.removeItem('orderDraft');
      
      // Reset form immediately
      setCustomerName("");
      setCustomerPhone("");
      setOrderServices([]);
      setSelectedServiceId("");
      setQuantity("1");
      setPickupDate("");
      setSelectedDiscountId("");
      setPaidAmount("0");
      setPaymentStatus("Unpaid");
      setNotes("");
      setShowCustomerSuggestions(false);
      setSkipCustomerCreation(false); // Reset the flag
      
      // Success feedback
      const successMsg = "Order created successfully!";
      setSuccessMessage(successMsg);
      
      // Show toast notification immediately
      showSuccess(successMsg);
      
      if (isModal && onOrderCreated) {
        // Refresh orders list
        onOrderCreated();
        // Close modal after a short delay to allow toast to be visible
        if (onClose) {
          setTimeout(() => {
            onClose();
          }, 800); // Increased delay to ensure toast is visible
        }
      } else {
      setShowSuccessModal(true);
      }
    } catch (error: any) {
      console.error("=== Create order failed ===");
      console.error("Error object:", error);
      console.error("Error response:", error?.response);
      console.error("Error response data:", error?.response?.data);
      console.error("Error message:", error?.message);
      console.error("Error stack:", error?.stack);
      
      // Show error toast notification
      const errorMessage = error?.response?.data?.message || error?.message || "Failed to create order. Please try again.";
      showError(errorMessage);
      
      // Don't show error alert here since addOrder already shows it
      // But make sure we show a message if something else went wrong
      if (!error?.response) {
        const errorMsg = error?.message || "Failed to create order. Please check the console for details.";
        console.error("No response from server. Error:", errorMsg);
        Alert.alert("Error", errorMsg);
      } else {
        // Log the full error details
        console.error("Server responded with error:", {
          status: error.response.status,
          statusText: error.response.statusText,
          data: error.response.data
        });
      }
    }
  };

  const handleCustomerAdded = (newCustomer: { _id: string; customerName: string; phoneNumber: string; email?: string }) => {
    // Check if customer already exists in the list (avoid duplicates)
    const customerExists = customers.some(c => 
      c._id === newCustomer._id || 
      (c.phoneNumber === newCustomer.phoneNumber && newCustomer.phoneNumber) ||
      (c.customerName?.toLowerCase() === newCustomer.customerName?.toLowerCase() && newCustomer.customerName)
    );
    
    if (!customerExists && newCustomer._id) {
      // Only add if customer has an ID and doesn't already exist
    setCustomers([...customers, newCustomer]);
    } else if (!customerExists && !newCustomer._id) {
      // If no ID, try to find it in the existing list or refresh
      console.log('Customer added but no ID provided, refreshing customers list...');
      // Refresh customers list
      const refreshCustomers = async () => {
        try {
          const token = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('userToken');
          const headers: any = { 'Content-Type': 'application/json' };
          if (token) headers.Authorization = `Bearer ${token}`;
          const customersRes = await axios.get(`${API_BASE_URL}/customers`, { headers });
          const customersRaw = Array.isArray(customersRes.data)
            ? customersRes.data
            : customersRes.data?.data || customersRes.data?.customers || [];
          const customersData = customersRaw
            .filter((c: any) => c && (c.name || c.customerName))
            .map((c: any) => ({
              _id: c._id || c.id,
              customerName: c.name || c.customerName || '',
              phoneNumber: c.phone || c.phoneNumber || '',
              email: c.email || '',
            }));
          setCustomers(customersData);
        } catch (error) {
          console.error('Error refreshing customers:', error);
        }
      };
      refreshCustomers();
    }
    
    setIsAddCustomerModalOpen(false);
    setPendingCustomerData(null);
    setSkipCustomerCreation(false); // Reset the flag when customer is added
    
    // After adding customer, create the order
    createOrder();
  };

  const handleAddCustomerCancel = () => {
    setIsAddCustomerModalOpen(false);
    setPendingCustomerData(null);
    Alert.alert("Info", "Order creation cancelled. Please add customer information first.");
  };

  const handleCustomerConfirmationYes = () => {
    setShowCustomerConfirmationModal(false);
    setIsAddCustomerModalOpen(true);
  };

  const handleCustomerConfirmationSkip = async () => {
    console.log("=== handleCustomerConfirmationSkip called ===");
    setShowCustomerConfirmationModal(false);
    setPendingCustomerData(null);
    setSkipCustomerCreation(true);
    console.log("skipCustomerCreation set to: true");
    // Pass the flag directly to avoid React state timing issues
    await createOrder(true);
  };

  const handleSaveDraft = async () => {
    try {
      // Only validate that paid amount is not negative (overpayment is allowed)
      const paidValue = parseFloat(paidAmount.replace(/[^0-9.]/g, '')) || 0;
      
      if (paidValue < 0) {
        Alert.alert(
          "Invalid Amount",
          "Paid amount cannot be negative. Please enter a valid amount.",
          [{ text: "OK" }]
        );
        return;
      }

      // Save to AsyncStorage for quick restore
      saveDraftToLocalStorage();
      
      // If there's data, also save to database
      if (customerName.trim() && orderServices.length > 0) {
        // Find customer
        const customer = customers.find(c => 
          c.customerName.toLowerCase() === customerName.toLowerCase() ||
          c.phoneNumber === customerPhone
        );

        if (customer) {
          // Map order services to backend format
          const items = orderServices.map(os => {
            const service = services.find(s => s._id === os.serviceId);
            if (!service) throw new Error('Service not found');
            
            let quantityStr = '';
            if (service.unit === 'flat') {
              quantityStr = '1 flat';
            } else if (service.unit === 'kg') {
              quantityStr = `${os.quantity}kg`;
            } else {
              quantityStr = `${os.quantity} ${service.unit === 'item' ? 'item' : service.unit}${os.quantity > 1 ? 's' : ''}`;
            }

            const itemAmount = service.unit === 'flat' ? (service.price || service.base_price) : (service.price || service.base_price) * os.quantity;

            return {
              service: service.name,
              quantity: quantityStr,
              discount: '0%',
              status: 'Pending',
              amount: itemAmount
            };
          });

          // Calculate totals
          let totalAmount = 0;
          items.forEach(item => {
            totalAmount += item.amount || 0;
          });

          let discountAmount = 0;
          let discountCode = '0%';
          if (selectedDiscountId) {
            const selectedDiscount = discountOptions.find(d => d._id === selectedDiscountId && d.active && !d.isArchived);
            if (selectedDiscount) {
              if (selectedDiscount.type === 'percentage') {
                discountAmount = totalAmount * (selectedDiscount.value / 100);
              } else {
                discountAmount = selectedDiscount.value;
              }
              discountCode = selectedDiscount.type === 'percentage' 
                ? `${selectedDiscount.value}%` 
                : `₱${selectedDiscount.value}`;
            }
          }

          const finalTotal = totalAmount - discountAmount;
          const paid = parseFloat(paidAmount.replace(/[^0-9.]/g, '')) || 0;
          const balanceAmount = finalTotal - paid;

          // Save draft to database - use 'customer' not 'customerName'
          const draftData = {
            customer: customerName.trim(),
            customerPhone: customerPhone.trim(),
            customerId: customer._id,
            items: items,
            discountId: selectedDiscountId && selectedDiscountId.trim() !== '' ? selectedDiscountId : null,
            paid: paid,
            pickupDate: pickupDate && pickupDate.trim() !== '' ? pickupDate : null,
            notes: notes.trim() || '',
            isDraft: true,
            total: `₱${finalTotal.toFixed(2)}`,
            balance: balanceAmount <= 0 ? `₱0.00` : `₱${balanceAmount.toFixed(2)}`, // Balance can't be negative in display
            payment: paid >= finalTotal ? 'Paid' : (paid > 0 ? 'Partial' : 'Unpaid')
          };

          // Try to save to database
          try {
            const token = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('userToken');
            const headers: any = { 'Content-Type': 'application/json' };
            if (token) headers.Authorization = `Bearer ${token}`;
            
            await axios.post(`${API_BASE_URL}/orders/draft`, draftData, { headers });
            
            // Show success banner
            setSuccessMessage("Draft saved successfully! 💾");
            setShowSuccessMessage(true);
            setTimeout(() => {
              setShowSuccessMessage(false);
            }, 5000);
            
            // Also show toast notification
            showSuccess("Draft saved successfully! 💾");
          } catch (error: any) {
            console.error('Error saving draft to DB:', error);
            // Still save locally even if DB save fails
            setSuccessMessage("Draft saved locally! 💾");
            setShowSuccessMessage(true);
            setTimeout(() => {
              setShowSuccessMessage(false);
            }, 5000);
            
            showInfo("Draft saved locally! 💾");
          }
        } else {
          // Just save to localStorage if customer not found
          setSuccessMessage("Draft saved locally! 💾");
          setShowSuccessMessage(true);
          setTimeout(() => {
            setShowSuccessMessage(false);
          }, 5000);
          
          try {
            Alert.alert("Info", "Draft saved locally! 💾");
          } catch (e) {
            console.log("Alert not available");
          }
        }
      } else {
        setSuccessMessage("Draft saved locally! 💾");
        setShowSuccessMessage(true);
        setTimeout(() => {
          setShowSuccessMessage(false);
        }, 5000);
        
        try {
          Alert.alert("Info", "Draft saved locally! 💾");
        } catch (e) {
          console.log("Alert not available");
        }
      }
    } catch (error: any) {
      console.error('Error saving draft:', error);
      // Still save to localStorage even if DB save fails
      setSuccessMessage("Draft saved locally! 💾");
      setShowSuccessMessage(true);
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 5000);
      
      try {
        Alert.alert("Info", "Draft saved locally! 💾");
      } catch (e) {
        console.log("Alert not available");
      }
    }
  };

  // Register draft save function with tab context after it's defined
  useEffect(() => {
    if (tabId) {
      registerDraftSave(tabId, handleSaveDraft);
    }
  }, [tabId, registerDraftSave]); // Register when tabId changes

  const handlePrintSummary = async () => {
    // Fetch station information if userStation is available
    let stationInfo = null;
    if (userStation) {
      try {
        const token = await AsyncStorage.getItem('token');
        const response = await fetch(`${API_BASE_URL}/stations`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const stations = await response.json();
          const stationsArray = Array.isArray(stations) ? stations : (stations.data || stations || []);
          const stationIdToMatch = String(userStation).toUpperCase().trim();
          stationInfo = stationsArray.find((s: any) => {
            const stationStationId = String(s.stationId || '').toUpperCase().trim();
            const stationId = String(s._id || s.id || '').toUpperCase().trim();
            return stationStationId === stationIdToMatch || stationId === stationIdToMatch;
          });
          if (stationInfo) {
            console.log('Create order - Station found for receipt:', stationInfo);
          }
        }
      } catch (stationError) {
        console.warn('Create order - Could not fetch station info:', stationError);
      }
    }
    
    // Build station info strings
    const stationName = stationInfo?.name ? ` - ${stationInfo.name}` : '';
    const stationAddress = stationInfo?.address || '123 Laundry Street, Clean City';
    const stationPhone = stationInfo?.phone ? `Phone: ${stationInfo.phone}` : 'Phone: +63 912 345 6789';
    const companyName = `Sparklean Laundry Shop${stationName}`;
    
    // Native path: use expo-print with thermal 58mm layout
    if (Platform.OS !== 'web') {
      try {
        const getServiceLabel = (orderService: ServiceItem) => {
          const service = services.find(s => s._id === orderService.serviceId);
          if (!service) return 'Unknown Service';
          if (service.unit === 'flat') return service.name;
          const unitLabel = service.unit === 'kg' ? 'kg' : 'items';
          return `${service.name} (${orderService.quantity} ${unitLabel})`;
        };
        const getServicePrice = (orderService: ServiceItem) => {
          const service = services.find(s => s._id === orderService.serviceId);
          if (!service) return 0;
          if (service.unit === 'flat') return service.price || service.base_price;
          return (service.price || service.base_price) * orderService.quantity;
        };

        const discountInfo = selectedDiscountId 
          ? discountOptions.find(d => d._id === selectedDiscountId)?.code || ''
          : '';

        const itemsRows = orderServices.map((os) => {
          const price = getServicePrice(os);
          return `<div class=\"row\"><div class=\"col-left\">${getServiceLabel(os)}</div><div class=\"col-right\">₱${price.toFixed(2)}</div></div>`;
        }).join('');

        const receiptHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset=\"utf-8\" />
              <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
              <style>
                @page { size: 58mm auto; margin: 0 }
                body { margin:0; padding:0; width:58mm; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Courier New', monospace; }
                .ticket{ width:58mm; margin:0 auto; padding:6px; color:#111827 }
                .center{text-align:center}
                .row{ display:flex; justify-content:space-between; gap:6px; font-size:11px; padding:4px 0 }
                .col-left{ flex:1 }
                .col-right{ min-width:64px; text-align:right }
                .divider{ border-top:1px dashed #9CA3AF; margin:6px 0 }
                .big{ font-weight:800; font-size:13px }
              </style>
            </head>
            <body>
              <div class=\"ticket\">
                <div class=\"center big\">${companyName}</div>
                <div class=\"center\" style=\"color:#6B7280;font-size:10px\">${stationAddress}</div>
                <div class=\"center\" style=\"color:#6B7280;font-size:10px\">${stationPhone}</div>
                <div class=\"center\" style=\"color:#6B7280;font-size:11px\">${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}</div>
                <div class=\"divider\"></div>
                <div class=\"row\"><div class=\"big\">ITEMS</div><div></div></div>
                ${itemsRows}
                <div class=\"divider\"></div>
                <div class=\"row\"><div>Subtotal</div><div>₱${subtotal.toFixed(2)}</div></div>
                ${discount > 0 ? `<div class=\"row\"><div>Discount ${discountInfo?`(${discountInfo})`:''}</div><div>-₱${discount.toFixed(2)}</div></div>` : ''}
                <div class=\"row big\"><div>Total</div><div>₱${total.toFixed(2)}</div></div>
                <div class=\"row\"><div>Paid</div><div>₱${amountPaid.toFixed(2)}</div></div>
                <div class=\"row\"><div>Change</div><div>₱${Math.max(amountPaid - total, 0).toFixed(2)}</div></div>
                <div class=\"divider\"></div>
                <div class=\"center\" style=\"color:#6B7280;font-size:11px\">Thank you for your business!</div>
              </div>
            </body>
          </html>`;

        (async () => {
          const Print = await import('expo-print');
          try {
            await Print.printAsync({ html: receiptHtml });
            return;
          } catch (err) {
            // Fallback: render as PDF and share/open
            try {
              const file = await Print.printToFileAsync({ html: receiptHtml });
              try {
                const Sharing = await import('expo-sharing');
                if ((Sharing as any).isAvailableAsync && await (Sharing as any).isAvailableAsync()) {
                  await (Sharing as any).shareAsync(file.uri, { UTI: 'com.adobe.pdf', mimeType: 'application/pdf' });
                } else {
                  Alert.alert('Receipt saved', `PDF saved to: ${file.uri}`);
                }
              } catch {
                Alert.alert('Receipt saved', `PDF saved to: ${file.uri}`);
              }
            } catch (e2) {
              Alert.alert('Print Error', 'Printing is unavailable. Please install a Print Service plugin or try sharing the PDF.');
            }
          }
        })();
      } catch (e) {
        Alert.alert('Print Error', 'Unable to print receipt on this device.');
      }
      return;
    }
    // Web path: existing DOM-based preview
    if (typeof window !== 'undefined') {
      // Create a hidden print container if it doesn't exist
      let printContainer = document.querySelector('.print-only-summary');
      if (!printContainer) {
        printContainer = document.createElement('div');
        printContainer.className = 'print-only-summary';
        printContainer.style.display = 'none';
        document.body.appendChild(printContainer);
      }

      // Get service label helper
      const getServiceLabel = (orderService: ServiceItem) => {
        const service = services.find(s => s._id === orderService.serviceId);
        if (!service) return 'Unknown Service';
        if (service.unit === 'flat') {
          return service.name;
        }
        const unitLabel = service.unit === 'kg' ? 'kg' : 'items';
        return `${service.name} (${orderService.quantity} ${unitLabel})`;
      };

      const getServicePrice = (orderService: ServiceItem) => {
        const service = services.find(s => s._id === orderService.serviceId);
        if (!service) return 0;
        if (service.unit === 'flat') {
          return service.price || service.base_price;
        }
        return (service.price || service.base_price) * orderService.quantity;
      };

      // Update print container content
      const discountInfo = selectedDiscountId 
        ? discountOptions.find(d => d._id === selectedDiscountId)?.code || ''
        : '';
      
      printContainer.innerHTML = `
        <div class="order-receipt">
          <div class="receipt-header">
            <div class="company-info">
              <div class="company-logo">
                <svg width="40" height="40" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <defs>
                    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stop-color="#60A5FA" />
                      <stop offset="100%" stop-color={dynamicColors.primary[500]} />
                    </linearGradient>
                    <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stop-color="#E0F2FE" />
                      <stop offset="100%" stop-color="#BFDBFE" />
                    </linearGradient>
                  </defs>
                  <rect x="4" y="6" width="56" height="48" rx="14" fill="url(#bg)" />
                  <g transform="translate(14,14)">
                    <rect x="0" y="0" width="36" height="30" rx="6" fill="#F8FAFC" />
                    <rect x="0.75" y="0.75" width="34.5" height="28.5" rx="5.25" stroke="#94A3B8" stroke-width="1.5" fill="none" />
                    <circle cx="6" cy="6" r="2" fill="#F59E0B" />
                    <circle cx="12" cy="6" r="2" fill="#F59E0B" fill-opacity="0.6" />
                    <circle cx="20" cy="18" r="9.5" fill="url(#glass)" stroke="#60A5FA" stroke-width="2" />
                    <circle cx="20" cy="18" r="6.5" fill="#E8F1FF" fill-opacity="0.6" />
                    <circle cx="18" cy="17" r="1.2" fill="#0F172A" />
                    <circle cx="22" cy="17" r="1.2" fill="#0F172A" />
                    <path d="M17 20c1.2 1 3.8 1 5 0" stroke="#0F172A" stroke-width="1.5" stroke-linecap="round" />
                  </g>
                  <g fill="#E0F2FE">
                    <circle cx="15" cy="14" r="3" />
                    <circle cx="22" cy="10" r="2" />
                    <circle cx="50" cy="12" r="2.4" />
                    <circle cx="48" cy="50" r="2.8" />
                  </g>
                </svg>
              </div>
              <div class="company-details">
                <h2>${companyName}</h2>
                <p>${stationAddress}</p>
                <p>${stationPhone}</p>
              </div>
            </div>
            <div class="receipt-info">
              <h3>ORDER RECEIPT</h3>
              <p>Date: ${new Date().toLocaleDateString()}</p>
              <p>Time: ${new Date().toLocaleTimeString()}</p>
            </div>
          </div>

          <div class="receipt-content">
            <div class="customer-section">
              <h4>Customer</h4>
              <p><strong>${customerName || 'N/A'}</strong></p>
              <p>${customerPhone || 'N/A'}</p>
            </div>

            <div class="service-section">
              <h4>Service Details</h4>
              ${orderServices.map((orderService) => {
                const servicePrice = getServicePrice(orderService);
                return `
                  <div class="service-item">
                    <span class="service-name">${getServiceLabel(orderService)}</span>
                    <span class="service-price">₱${servicePrice.toFixed(2)}</span>
                  </div>
                `;
              }).join('')}
            </div>

            <div class="payment-section">
              <div class="payment-row">
                <span>Subtotal:</span>
                <span>₱${subtotal.toFixed(2)}</span>
              </div>
              ${discountAmount > 0 ? `
                <div class="payment-row">
                  <span>Discount${discountInfo ? ` (${discountInfo})` : ''}:</span>
                  <span>-₱${discountAmount.toFixed(2)}</span>
                </div>
              ` : ''}
              <div class="payment-row total">
                <span>Total:</span>
                <span>₱${totalAmount.toFixed(2)}</span>
              </div>
              <div class="payment-row">
                <span>Paid:</span>
                <span>₱${paid.toFixed(2)}</span>
              </div>
              ${changeDue > 0 ? `
                <div class="payment-row change">
                  <span>Change Due:</span>
                  <span>₱${changeDue.toFixed(2)}</span>
                </div>
              ` : balanceDue > 0 ? `
                <div class="payment-row balance">
                  <span>Balance Due:</span>
                  <span>₱${balanceDue.toFixed(2)}</span>
                </div>
              ` : `
                <div class="payment-row paid">
                  <span>Status:</span>
                  <span>Fully Paid ✓</span>
                </div>
              `}
            </div>

            <div class="status-section">
              <p><strong>Status:</strong> ${paymentStatus.toLowerCase()}</p>
              ${pickupDate ? `<p><strong>Pickup:</strong> ${new Date(pickupDate).toISOString().split('T')[0]}</p>` : ''}
              ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}
            </div>
          </div>

          <div class="receipt-footer">
            <p>Thank you for your business!</p>
            <p>keep this receipt for your records</p>
          </div>
        </div>
      `;

      // Open preview window
      setTimeout(() => {
        const printWindow = window.open('', '_blank', 'width=400,height=600,scrollbars=yes,resizable=yes');
        if (printWindow) {
          const printContent = printContainer?.innerHTML;
          if (printContent) {
            printWindow.document.write(`
              <!DOCTYPE html>
              <html>
              <head>
                <title>Receipt Preview - La Bubbles Laundry Shop</title>
                <style>
                  * {
                    margin: 0;
                    padding: 0;
                    box-sizing: border-box;
                  }
                  body {
                    margin: 0;
                    padding: 20px;
                    font-family: 'Arial', sans-serif;
                    background: #f5f5f5;
                    display: flex;
                    justify-content: center;
                    align-items: flex-start;
                    min-height: 100vh;
                    overflow-x: hidden;
                    width: 100%;
                  }
                  .preview-container {
                    background: white;
                    border-radius: 8px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                    padding: 20px;
                    max-width: 400px;
                    width: 100%;
                    box-sizing: border-box;
                  }
                  .preview-header {
                    text-align: center;
                    margin-bottom: 20px;
                    padding-bottom: 15px;
                    border-bottom: 2px solid #007bff;
                  }
                  .preview-title {
                    font-size: 18px;
                    font-weight: bold;
                    color: #007bff;
                    margin-bottom: 10px;
                  }
                  .preview-subtitle {
                    font-size: 14px;
                    color: #666;
                    margin-bottom: 15px;
                  }
                  .print-buttons {
                    display: flex;
                    gap: 10px;
                    justify-content: center;
                    margin-bottom: 20px;
                  }
                  .btn {
                    padding: 10px 20px;
                    border: none;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 14px;
                    font-weight: bold;
                    transition: all 0.2s ease;
                  }
                  .btn-primary {
                    background: #007bff;
                    color: white;
                  }
                  .btn-primary:hover {
                    background: #0056b3;
                  }
                  .btn-secondary {
                    background: #6c757d;
                    color: white;
                  }
                  .btn-secondary:hover {
                    background: #545b62;
                  }
                  .receipt-preview {
                    border: 2px solid #000;
                    background: white;
                    transform: scale(0.8);
                    transform-origin: top center;
                    margin: 0 auto;
                    width: fit-content;
                    overflow: hidden;
                  }
                  .order-receipt {
                    width: 80mm;
                    padding: 5mm;
                    font-family: 'Courier New', monospace;
                    font-size: 12px;
                    line-height: 1.2;
                    box-sizing: border-box;
                    margin: 0;
                    overflow: hidden;
                  }
                  .receipt-header {
                    text-align: center;
                    margin-bottom: 5mm;
                    padding-bottom: 3mm;
                    border-bottom: 1px dashed #000;
                  }
                  .company-logo {
                    font-size: 20px;
                    margin-bottom: 2mm;
                  }
                  .company-details h2 {
                    font-size: 14px;
                    font-weight: bold;
                    margin: 0 0 1mm 0;
                  }
                  .company-details p {
                    font-size: 10px;
                    margin: 0;
                  }
                  .receipt-info h3 {
                    font-size: 16px;
                    font-weight: bold;
                    margin: 2mm 0;
                  }
                  .receipt-info p {
                    font-size: 10px;
                    margin: 0;
                  }
                  .receipt-content {
                    margin-bottom: 5mm;
                  }
                  .customer-section, .service-section, .payment-section, .status-section {
                    margin-bottom: 3mm;
                  }
                  .customer-section h4, .service-section h4 {
                    font-size: 11px;
                    font-weight: bold;
                    margin: 0 0 1mm 0;
                    text-transform: uppercase;
                  }
                  .customer-section p {
                    font-size: 10px;
                    margin: 0;
                  }
                  .service-item {
                    display: flex;
                    justify-content: space-between;
                    padding: 1mm 0;
                    border-bottom: 1px dotted #000;
                  }
                  .service-name {
                    font-size: 10px;
                  }
                  .service-price {
                    font-size: 10px;
                    font-weight: bold;
                  }
                  .payment-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 0.5mm 0;
                    font-size: 10px;
                  }
                  .payment-row.total {
                    font-weight: bold;
                    border-top: 1px solid #000;
                    border-bottom: 1px solid #000;
                    padding: 1mm 0;
                    margin: 1mm 0;
                  }
                  .payment-row.balance {
                    font-weight: bold;
                    background: #f0f0f0;
                    padding: 1mm;
                    margin-top: 1mm;
                  }
                  .payment-row.change {
                    font-weight: bold;
                    background: #d1fae5;
                    padding: 1mm;
                    margin-top: 1mm;
                    color: #059669;
                  }
                  .payment-row.paid {
                    font-weight: bold;
                    background: #d1fae5;
                    padding: 1mm;
                    margin-top: 1mm;
                    color: #059669;
                  }
                  .status-section p {
                    font-size: 9px;
                    margin: 0.5mm 0;
                  }
                  .receipt-footer {
                    text-align: center;
                    padding-top: 3mm;
                    border-top: 1px dashed #000;
                  }
                  .receipt-footer p {
                    font-size: 9px;
                    margin: 0.5mm 0;
                  }
                  .preview-footer {
                    text-align: center;
                    margin-top: 20px;
                    padding-top: 15px;
                    border-top: 1px solid #ddd;
                    color: #666;
                    font-size: 12px;
                  }
                </style>
              </head>
              <body>
                <div class="preview-container">
                  <div class="preview-header">
                    <div class="preview-title">🖨️ Receipt Preview</div>
                    <div class="preview-subtitle">This is how your receipt will look when printed</div>
                    <div class="print-buttons">
                      <button class="btn btn-primary" onclick="printReceipt()">🖨️ Print Now</button>
                      <button class="btn btn-secondary" onclick="window.close()">❌ Close</button>
                    </div>
                  </div>
                  
                  <div class="receipt-preview">
                    ${printContent}
                  </div>
                  
                  <div class="preview-footer">
                    <p>💡 <strong>Tip:</strong> Make sure your thermal receipt printer is connected and set as default printer</p>
                  </div>
                </div>
                
                <script>
                  function printReceipt() {
                    // Create a new window for actual printing
                    const printWindow = window.open('', '_blank');
                    if (printWindow) {
                      const receiptContent = document.querySelector('.receipt-preview').innerHTML;
                      printWindow.document.write(\`
                        <!DOCTYPE html>
                        <html>
                        <head>
                          <title>Receipt</title>
                          <style>
                            @page {
                              size: 80mm 200mm;
                              margin: 0;
                            }
                            * {
                              margin: 0;
                              padding: 0;
                              box-sizing: border-box;
                            }
                            body {
                              margin: 0;
                              padding: 0;
                              font-family: 'Courier New', monospace;
                              font-size: 12px;
                              line-height: 1.2;
                              width: 80mm;
                              overflow: hidden;
                            }
                            .order-receipt {
                              width: 80mm;
                              padding: 5mm;
                              box-sizing: border-box;
                              margin: 0;
                              overflow: hidden;
                            }
                            .receipt-header {
                              text-align: center;
                              margin-bottom: 5mm;
                              padding-bottom: 3mm;
                              border-bottom: 1px dashed #000;
                            }
                            .company-logo {
                              font-size: 20px;
                              margin-bottom: 2mm;
                            }
                            .company-details h2 {
                              font-size: 14px;
                              font-weight: bold;
                              margin: 0 0 1mm 0;
                            }
                            .company-details p {
                              font-size: 10px;
                              margin: 0;
                            }
                            .receipt-info h3 {
                              font-size: 16px;
                              font-weight: bold;
                              margin: 2mm 0;
                            }
                            .receipt-info p {
                              font-size: 10px;
                              margin: 0;
                            }
                            .receipt-content {
                              margin-bottom: 5mm;
                            }
                            .customer-section, .service-section, .payment-section, .status-section {
                              margin-bottom: 3mm;
                            }
                            .customer-section h4, .service-section h4 {
                              font-size: 11px;
                              font-weight: bold;
                              margin: 0 0 1mm 0;
                              text-transform: uppercase;
                            }
                            .customer-section p {
                              font-size: 10px;
                              margin: 0;
                            }
                            .service-item {
                              display: flex;
                              justify-content: space-between;
                              padding: 1mm 0;
                              border-bottom: 1px dotted #000;
                            }
                            .service-name {
                              font-size: 10px;
                            }
                            .service-price {
                              font-size: 10px;
                              font-weight: bold;
                            }
                            .payment-row {
                              display: flex;
                              justify-content: space-between;
                              padding: 0.5mm 0;
                              font-size: 10px;
                            }
                            .payment-row.total {
                              font-weight: bold;
                              border-top: 1px solid #000;
                              border-bottom: 1px solid #000;
                              padding: 1mm 0;
                              margin: 1mm 0;
                            }
                            .payment-row.balance {
                              font-weight: bold;
                              background: #f0f0f0;
                              padding: 1mm;
                              margin-top: 1mm;
                            }
                            .payment-row.change {
                              font-weight: bold;
                              background: #d1fae5;
                              padding: 1mm;
                              margin-top: 1mm;
                              color: #059669;
                            }
                            .payment-row.paid {
                              font-weight: bold;
                              background: #d1fae5;
                              padding: 1mm;
                              margin-top: 1mm;
                              color: #059669;
                            }
                            .status-section p {
                              font-size: 9px;
                              margin: 0.5mm 0;
                            }
                            .receipt-footer {
                              text-align: center;
                              padding-top: 3mm;
                              border-top: 1px dashed #000;
                            }
                            .receipt-footer p {
                              font-size: 9px;
                              margin: 0.5mm 0;
                            }
                          </style>
                        </head>
                        <body>
                          \${receiptContent}
                        </body>
                        </html>
                      \`);
                      printWindow.document.close();
                      printWindow.focus();
                      printWindow.print();
                      printWindow.close();
                    }
                  }
                </script>
              </body>
              </html>
            `);
            printWindow.document.close();
          }
        }
      }, 300);
    } else {
      // Fallback for non-web environments
      let receipt = "ORDER RECEIPT\n";
      receipt += "==================\n\n";
      receipt += `Customer: ${customerName}\n`;
      receipt += `Phone: ${customerPhone || 'N/A'}\n`;
      receipt += `Date: ${new Date().toLocaleDateString()}\n\n`;
      receipt += "Services:\n";
      orderServices.forEach(item => {
        const service = services.find(s => s._id === item.serviceId);
        const unit = item.unit || service?.unit || 'item';
        const unitLabel = unit === 'kg' ? 'kg' : unit === 'flat' ? 'flat' : 'item';
        receipt += `  - ${item.serviceName} (${item.quantity} ${unitLabel}): ₱${item.amount.toFixed(2)}\n`;
      });
      receipt += `\nSubtotal: ₱${subtotal.toFixed(2)}\n`;
      if (discountAmount > 0) {
        receipt += `Discount: -₱${discountAmount.toFixed(2)}\n`;
      }
      receipt += `Total: ₱${totalAmount.toFixed(2)}\n`;
      receipt += `Paid: ₱${paid.toFixed(2)}\n`;
      if (changeDue > 0) {
        receipt += `Change Due: ₱${changeDue.toFixed(2)}\n`;
      } else if (balanceDue > 0) {
        receipt += `Balance Due: ₱${balanceDue.toFixed(2)}\n`;
      } else {
        receipt += `Status: Fully Paid ✓\n`;
      }
      receipt += `Payment Status: ${paymentStatus}\n`;
      if (notes) {
        receipt += `\nNotes: ${notes}\n`;
      }
      
      Alert.alert("Order Summary", receipt, [{ text: "OK" }]);
    }
  };

  return (
    <View style={styles.container}>
      {/* Success Banner (used for drafts or other info) */}
      {showSuccessMessage && (
        <View style={styles.successBanner}>
          <Ionicons name="checkmark-circle" size={24} color="#059669" />
          <Text style={styles.successBannerText}>{successMessage}</Text>
          <TouchableOpacity onPress={() => setShowSuccessMessage(false)} style={styles.successBannerClose}>
            <Ionicons name="close" size={20} color="#059669" />
          </TouchableOpacity>
        </View>
      )}

      {/* Success Modal for Create Order */}
      {showSuccessModal && (
        <Modal 
          visible={showSuccessModal} 
          transparent 
          animationType="fade" 
          onRequestClose={() => {
            setShowSuccessModal(false);
            setSuccessMessage("");
          }}
        >
          <View style={styles.feedbackOverlay}>
            <View style={styles.feedbackCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="checkmark-circle" size={24} color="#059669" />
                <Text style={styles.feedbackTitle}>Success</Text>
              </View>
              <Text style={styles.feedbackText}>{successMessage || 'Order created successfully!'}</Text>
              <View style={{ marginTop: 16, alignItems: 'flex-end' }}>
                <TouchableOpacity 
                  style={[styles.createButton, dynamicButtonStyles.primary]} 
                  onPress={() => {
                    setShowSuccessModal(false);
                    setSuccessMessage("");
                  }}
                >
                  <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                  <Text style={[styles.createButtonText, dynamicButtonStyles.primaryText]}>OK</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Two Column Layout */}
        <View style={styles.twoColumnLayout}>
          {/* Left Column - Form */}
          <View style={styles.leftColumn}>
            {/* Customer Information */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="person-outline" size={20} color={dynamicColors.primary[500]} />
                <Text style={styles.cardTitle}>Customer Information</Text>
              </View>
              <View style={styles.inputRow}>
                <View style={[styles.inputContainer, { flex: 1, marginRight: 8, position: 'relative', zIndex: 100000 }]}> 
                  <Text style={styles.label}>Name</Text>
          <TextInput
                    style={styles.textInput}
                    placeholder="Start typing customer name..."
            value={customerName}
                    onChangeText={(text) => {
                      setCustomerName(text);
                      setShowCustomerSuggestions(text.trim().length > 0);
                      setSelectedSuggestionIndex(0);
                    }}
                    onFocus={() => {
                      if (filteredCustomerSuggestions.length > 0) {
                        setShowCustomerSuggestions(true);
                      }
                    }}
                  />
                  {showCustomerSuggestions && filteredCustomerSuggestions.length > 0 && (
                    <View style={styles.customerSuggestions}>
                      {filteredCustomerSuggestions.map((customer, index) => (
                        <TouchableOpacity
                          key={customer._id}
                          style={[
                            styles.suggestionItem,
                            index === selectedSuggestionIndex && styles.suggestionItemSelected
                          ]}
                          onPress={() => handleCustomerSelect(customer)}
                        >
                          <View style={styles.suggestionItemMain}>
                            <Text style={styles.suggestionText}>{customer.customerName}</Text>
                            <Text style={styles.suggestionPhone}>{customer.phoneNumber}</Text>
                          </View>
                          {customer.email && (
                            <Text style={styles.suggestionEmail}>{customer.email}</Text>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
                <View style={[styles.inputContainer, { flex: 1 }]}>
                  <Text style={styles.label}>Phone</Text>
          <TextInput
                    style={styles.textInput}
                    placeholder="Enter phone number"
                    value={customerPhone}
                    onChangeText={setCustomerPhone}
                    keyboardType="phone-pad"
                  />
                </View>
        </View>

              {/* Customer Status Indicator */}
              {customerName.trim() && (
                <View style={styles.customerStatus}>
                  {isExistingCustomer(customerName, customerPhone) ? (
                    <View style={[styles.statusIndicator, styles.statusIndicatorExisting]}>
                      <Ionicons name="person" size={16} color="#059669" />
                      <Text style={styles.statusIndicatorText}>Existing customer</Text>
                    </View>
                  ) : (
                    <View style={[styles.statusIndicator, styles.statusIndicatorNew, { backgroundColor: dynamicColors.primary[50] }]}>
                      <Ionicons name="person-add" size={16} color={dynamicColors.primary[500]} />
                      <Text style={styles.statusIndicatorText}>New customer - will be added to system</Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Service Details */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="basket-outline" size={20} color={dynamicColors.primary[500]} />
                <Text style={styles.cardTitle}>Service Details</Text>
              </View>
              <View style={styles.inputRow}>
                <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.label}>Service</Text>
              <Dropdown
                    style={styles.dropdown}
                    containerStyle={styles.dropdownContainer}
                    data={services
                      .filter(s => !orderServices.find(os => os.serviceId === s._id))
                      .sort((a, b) => {
                        // Sort by popularity first (isPopular = true comes first)
                        const aPopular = a.isPopular ? 1 : 0;
                        const bPopular = b.isPopular ? 1 : 0;
                        if (aPopular !== bPopular) {
                          return bPopular - aPopular; // Popular services first
                        }
                        // Then sort by name
                        return a.name.localeCompare(b.name);
                      })
                      .map((s) => {
                      const unitLabel = s.unit === 'kg' ? 'kg' : s.unit === 'flat' ? 'flat' : 'item';
                      const price = s.price || s.base_price;
                      const isPopular = s.isPopular || false;
                      return {
                        label: `${s.name} - ₱${price}/${unitLabel}${s.category ? ` (${s.category})` : ''}${isPopular ? ' 🔥 Popular' : ''}`,
                        value: s._id
                      };
                    })}
                labelField="label"
                valueField="value"
                    placeholder={loadingServices ? "Loading..." : "Select a service..."}
                    value={selectedServiceId}
                    onChange={(item) => setSelectedServiceId(item.value)}
              />
            </View>
                <View style={[styles.inputContainer, { flex: 0.5, marginRight: 8 }]}>
                  <Text style={styles.label}>Quantity</Text>
              <TextInput
                    style={styles.textInput}
                keyboardType="numeric"
                value={quantity}
                onChangeText={(text) => /^\d*$/.test(text) && setQuantity(text)}
                placeholder="1"
              />
                </View>
                <TouchableOpacity style={[styles.addServiceButton, dynamicButtonStyles.primary]} onPress={handleAddService}>
                  <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
                  <Text style={[styles.addServiceButtonText, dynamicButtonStyles.primaryText]}>Add Service</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Services in Order */}
            {orderServices.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.servicesListTitle}>
                  Services in Order ({orderServices.length})
                </Text>
                {orderServices.map((item) => {
                  const service = services.find(s => s._id === item.serviceId);
                  const unit = item.unit || service?.unit || 'item';
                  const unitLabel = unit === 'kg' ? 'kg' : unit === 'flat' ? 'flat' : 'item';
                  
                  return (
                    <View key={item.id} style={styles.serviceItem}>
                      <View style={styles.serviceItemInfo}>
                        <Text style={styles.serviceItemName}>{item.serviceName}</Text>
                        <View style={styles.serviceItemDetails}>
                          {unit !== 'flat' && (
              <TextInput
                              style={styles.serviceQuantityInput}
                keyboardType="numeric"
                              value={item.quantity.toString()}
                              onChangeText={(text) => {
                                const newQty = parseInt(text) || 0;
                                handleUpdateQuantity(item.id, newQty);
                              }}
                            />
                          )}
                          <Text style={styles.serviceItemUnit}>
                            {unit !== 'flat' ? unitLabel : 'flat rate'}
                          </Text>
                          <Text style={[styles.serviceItemPrice, { color: dynamicColors.accent[500] }]}>₱{item.amount.toFixed(2)}</Text>
            </View>
                      </View>
                      <TouchableOpacity 
                        style={styles.removeButton}
                        onPress={() => handleRemoveService(item.id)}
                      >
                        <Ionicons name="close-circle" size={24} color="#DC2626" />
                      </TouchableOpacity>
                    </View>
                  );
                })}
                  </View>
                )}

            {/* Payment & Schedule */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="cash-outline" size={20} color={dynamicColors.primary[500]} />
                <Text style={styles.cardTitle}>Payment & Schedule</Text>
              </View>
              <View style={[styles.divider, { backgroundColor: dynamicColors.accent[500] }]} />
              <View style={styles.inputRow}>
                <View style={[styles.inputContainer, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.label}>Pickup Date</Text>
                  <View style={styles.dateInputWrapper}>
                    <MaskInput
                      style={[styles.textInput, styles.dateInput]}
                      value={pickupDate}
                      onChangeText={(masked) => setPickupDate(masked)}
                      mask={[/\d/, /\d/, "/", /\d/, /\d/, "/", /\d/, /\d/, /\d/, /\d/]}
                      keyboardType="numeric"
                      placeholder="mm/dd/yyyy"
                    />
                    <TouchableOpacity
                      style={[styles.todayButton, { backgroundColor: dynamicColors.primary[500] }]}
                      onPress={() => {
                        const today = new Date();
                        const month = String(today.getMonth() + 1).padStart(2, '0');
                        const day = String(today.getDate()).padStart(2, '0');
                        const year = today.getFullYear();
                        setPickupDate(`${month}/${day}/${year}`);
                      }}
                    >
                      <Text style={styles.todayButtonText}>Today</Text>
                    </TouchableOpacity>
                  </View>
            </View>
                <View style={[styles.inputContainer, { flex: 1 }]}>
                  <Text style={styles.label}>Discount</Text>
            <Dropdown
                    style={styles.dropdown}
                    containerStyle={styles.dropdownContainer}
                    data={(() => {
                      const currentSubtotal = orderServices.reduce((sum, item) => sum + item.amount, 0);
                      const applicableDiscounts = discountOptions
                        .filter(d => d.active !== false && !d.isArchived)
                        .filter(d => {
                          // Hide discounts that don't meet minimum purchase requirement
                          if (d.minPurchase && d.minPurchase > 0) {
                            return currentSubtotal >= d.minPurchase;
                          }
                          return true; // Show discounts with no minimum purchase requirement
                        })
                        .map(d => {
                          const discountText = d.type === 'percentage' 
                            ? `${d.code || d.name} - ${d.name} (${d.value}%)`
                            : `${d.code || d.name} - ${d.name} (₱${d.value})`;
                          const minPurchaseText = d.minPurchase > 0 ? ` (Min: ₱${d.minPurchase})` : '';
                          return {
                            label: discountText + minPurchaseText,
                            value: d._id
                          };
                        });
                      return [{ label: "No Discount", value: "" }, ...applicableDiscounts];
                    })()}
              labelField="label"
              valueField="value"
                    placeholder={loadingDiscounts ? "Loading..." : "No Discount"}
                    value={selectedDiscountId}
                    onChange={(item) => setSelectedDiscountId(item.value)}
            />
          </View>
          </View>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Paid Amount</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    paidAmountError && styles.textInputError
                  ]}
                keyboardType="numeric"
                  value={paidAmount}
                  onChangeText={(text) => {
                    // Only allow numbers and decimal point
                    const cleaned = text.replace(/[^0-9.]/g, '');
                    // Prevent multiple decimal points
                    const parts = cleaned.split('.');
                    const formatted = parts.length > 2 
                      ? parts[0] + '.' + parts.slice(1).join('') 
                      : cleaned;
                    
                    setPaidAmount(formatted);
                    
                    // Validate in real-time (allow overpayment, but warn)
                    const paidValue = parseFloat(formatted) || 0;
                    
                    if (paidValue < 0) {
                      setPaidAmountError("Paid amount cannot be negative");
                    } else if (formatted && totalAmount > 0 && paidValue > totalAmount) {
                      const change = paidValue - totalAmount;
                      setPaidAmountError(`Change due: ₱${change.toFixed(2)}`);
                    } else {
                      setPaidAmountError("");
                    }
                  }}
                  onBlur={() => {
                    // Validate and clean up on blur
                    const paidValue = parseFloat(paidAmount.replace(/[^0-9.]/g, '')) || 0;
                    
                    if (paidValue < 0) {
                      setPaidAmount("0");
                      setPaidAmountError("");
                    } else {
                      setPaidAmountError("");
                    }
                  }}
                  placeholder="0"
                  maxLength={15}
              />
              {paidAmountError ? (
                <View style={styles.warningContainer}>
                  <Ionicons name="information-circle" size={16} color={paidAmountError.includes("Change due") ? "#059669" : "#DC2626"} />
                  <Text style={[styles.warningText, paidAmountError.includes("Change due") && styles.changeText]}>
                    {paidAmountError}
                  </Text>
                </View>
              ) : null}
              {totalAmount > 0 && (
                <View style={styles.paymentSummary}>
                  <Text style={styles.hintText}>
                    Total: ₱{totalAmount.toFixed(2)}
                  </Text>
                  {balanceDue > 0 ? (
                    <Text style={styles.hintText}>
                      Balance Due: ₱{balanceDue.toFixed(2)}
                    </Text>
                  ) : changeDue > 0 ? (
                    <Text style={styles.changeText}>
                      Change Due: ₱{changeDue.toFixed(2)}
                    </Text>
                  ) : (
                    <Text style={styles.paidText}>
                      Fully Paid ✓
                    </Text>
                  )}
                </View>
              )}
              </View>
            </View>
            </View>

          {/* Right Column - Order Summary */}
          <View style={styles.rightColumn}>
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Ionicons name="document-text-outline" size={20} color={dynamicColors.primary[500]} />
                <Text style={[styles.summaryTitle, { color: dynamicColors.primary[500] }]}>Order Summary</Text>
            </View>

              {/* Balance Due / Change Due */}
              {changeDue > 0 ? (
                <View style={[styles.balanceBox, styles.changeBox]}>
                  <Text style={styles.balanceLabelChange}>CHANGE DUE</Text>
                  <Text style={styles.balanceAmountChange}>₱{changeDue.toFixed(2)}</Text>
                </View>
              ) : balanceDue > 0 ? (
                <View style={[styles.balanceBox, { backgroundColor: dynamicColors.accent[500] }]}>
                  <Text style={styles.balanceLabel}>BALANCE DUE</Text>
                  <Text style={styles.balanceAmount}>₱{balanceDue.toFixed(2)}</Text>
                </View>
              ) : totalAmount > 0 ? (
                <View style={[styles.balanceBox, styles.paidBox]}>
                  <Text style={styles.balanceLabelChange}>FULLY PAID</Text>
                  <Text style={styles.balanceAmountChange}>✓</Text>
                </View>
              ) : null}

              {/* Services List */}
              <View style={styles.summarySection}>
                <View style={styles.summaryRowHeader}>
                  <Text style={styles.summaryRowHeaderText}>SERVICES</Text>
                  <Text style={styles.summaryRowHeaderText}>AMOUNT</Text>
        </View>
                {orderServices.map((item) => {
                  const service = services.find(s => s._id === item.serviceId);
                  const unit = item.unit || service?.unit || 'item';
                  const unitLabel = unit === 'kg' ? 'kg' : unit === 'flat' ? 'flat' : 'item';
                  
                  return (
                    <View key={item.id} style={styles.summaryRow}>
                      <View>
                        <Text style={styles.summaryServiceName}>{item.serviceName}</Text>
                        <Text style={styles.summaryServiceQty}>
                          {item.quantity} {unit === 'kg' ? 'kg' : unit === 'flat' ? 'flat' : unitLabel}
                          {item.quantity > 1 && unit !== 'flat' && unit !== 'kg' ? 's' : ''}
              </Text>
            </View>
                      <Text style={[styles.summaryAmount, { color: dynamicColors.accent[500] }]}>₱{item.amount.toFixed(2)}</Text>
            </View>
                  );
                })}
                {orderServices.length === 0 && (
                  <Text style={styles.emptyText}>No services added</Text>
                )}
            </View>

              {/* Totals */}
              <View style={styles.summarySection}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>SUBTOTAL</Text>
                  <Text style={styles.summaryValue}>₱{subtotal.toFixed(2)}</Text>
            </View>
                {discountAmount > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>DISCOUNT</Text>
                    <Text style={styles.summaryValue}>-₱{discountAmount.toFixed(2)}</Text>
            </View>
                )}
                <View style={styles.summaryTotalRow}>
                  <Text style={styles.summaryTotalLabel}>TOTAL AMOUNT</Text>
                  <Text style={styles.summaryTotalValue}>₱{totalAmount.toFixed(2)}</Text>
          </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>PAID</Text>
                  <Text style={[styles.summaryValue, { color: dynamicColors.primary[500] }]}>₱{paid.toFixed(2)}</Text>
        </View>
                {changeDue > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>CHANGE DUE</Text>
                    <Text style={[styles.summaryValue, { color: '#059669' }]}>₱{changeDue.toFixed(2)}</Text>
                  </View>
                )}
                {balanceDue > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>BALANCE DUE</Text>
                    <Text style={[styles.summaryValue, { color: '#DC2626' }]}>₱{balanceDue.toFixed(2)}</Text>
                  </View>
                )}
              </View>

              {/* Payment Status */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Payment Status</Text>
                <Dropdown
                  style={styles.dropdown}
                  containerStyle={styles.dropdownContainer}
                  data={[
                    { label: "Unpaid", value: "Unpaid" },
                    { label: "Partial", value: "Partial" },
                    { label: "Paid", value: "Paid" },
                  ]}
                  labelField="label"
                  valueField="value"
                  placeholder="Unpaid"
                  value={paymentStatus}
                  onChange={(item) => setPaymentStatus(item.value)}
                  disable={paymentStatus === 'Paid'}
                />
              </View>

              {/* Notes */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Notes</Text>
                <TextInput
                  style={styles.notesInput}
                  multiline
                  numberOfLines={4}
                  placeholder="Special instructions..."
                  value={notes}
                  onChangeText={setNotes}
                  textAlignVertical="top"
                />
              </View>

              {/* Action Buttons */}
              <TouchableOpacity style={[styles.createButton, dynamicButtonStyles.primary]} onPress={handleCreateOrder}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                <Text style={[styles.createButtonText, dynamicButtonStyles.primaryText]}>Create Order</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={handleSaveDraft}>
                <Ionicons name="save-outline" size={18} color="#6B7280" />
                <Text style={styles.secondaryButtonText}>Save as Draft</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={handlePrintSummary}>
                <Ionicons name="print-outline" size={18} color="#6B7280" />
                <Text style={styles.secondaryButtonText}>Print Summary</Text>
        </TouchableOpacity>
      </View>
          </View>
        </View>
      </ScrollView>
      
      {/* Customer Confirmation Modal */}
      <Modal
        visible={showCustomerConfirmationModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCustomerConfirmationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmationModalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Ionicons name="person-add-outline" size={24} color={dynamicColors.primary[500]} />
                <Text style={styles.modalTitle}>New Customer Detected</Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowCustomerConfirmationModal(false)}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={styles.confirmationMessage}>
                The customer "{pendingCustomerData?.name}" is not in the system.
              </Text>
              <Text style={styles.confirmationQuestion}>
                Do you want to add this customer to the system?
              </Text>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={handleCustomerConfirmationSkip}
              >
                <Text style={styles.modalButtonTextSecondary}>Maybe Next Time</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary, { backgroundColor: dynamicColors.primary[500] }]}
                onPress={handleCustomerConfirmationYes}
              >
                <Text style={styles.modalButtonTextPrimary}>Yes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Add Customer Modal */}
      <AddCustomerModal
        visible={isAddCustomerModalOpen}
        onClose={handleAddCustomerCancel}
        onCustomerAdded={handleCustomerAdded}
        existingCustomers={customers}
        pendingCustomerData={pendingCustomerData || undefined}
      />

      {/* Overpayment Confirmation Modal */}
      <Modal
        visible={showOverpaymentModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowOverpaymentModal(false);
          setOverpaymentData(null);
          setPendingOrderCreation(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.overpaymentModalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Ionicons name="cash-outline" size={24} color="#059669" />
                <Text style={styles.modalTitle}>Overpayment Detected</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setShowOverpaymentModal(false);
                  setOverpaymentData(null);
                  setPendingOrderCreation(false);
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.overpaymentMessage}>
                Customer paid more than the total amount.
              </Text>
              
              {overpaymentData && (
                <View style={styles.overpaymentDetails}>
                  <View style={styles.overpaymentRow}>
                    <Text style={styles.overpaymentLabel}>Customer paid:</Text>
                    <Text style={styles.overpaymentValue}>
                      ₱{overpaymentData.paidValue.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.overpaymentRow}>
                    <Text style={styles.overpaymentLabel}>Total amount:</Text>
                    <Text style={styles.overpaymentValue}>
                      ₱{overpaymentData.totalAmount.toFixed(2)}
                    </Text>
                  </View>
                  <View style={[styles.overpaymentRow, styles.changeRow]}>
                    <Text style={[styles.overpaymentLabel, { color: '#059669', fontWeight: '700' }]}>
                      Change due:
                    </Text>
                    <Text style={[styles.overpaymentValue, { color: '#059669', fontWeight: '700', fontSize: 18 }]}>
                      ₱{overpaymentData.changeDue.toFixed(2)}
                    </Text>
                  </View>
                </View>
              )}

              <Text style={styles.overpaymentQuestion}>
                Is this correct?
              </Text>
            </View>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowOverpaymentModal(false);
                  setOverpaymentData(null);
                  setPendingOrderCreation(false);
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={async () => {
                  setShowOverpaymentModal(false);
                  if (overpaymentData && pendingOrderCreation) {
                    // Preserve skipCustomerCreation flag when handling overpayment
                    await createOrderConfirmed(overpaymentData.paidValue, skipCustomerCreation);
                  }
                  setOverpaymentData(null);
                  setPendingOrderCreation(false);
                }}
              >
                <Text style={styles.confirmButtonText}>Yes, Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  twoColumnLayout: {
    flexDirection: 'row',
    padding: spacing.lg,
    gap: spacing.lg,
    flexWrap: 'wrap',
  },
  leftColumn: {
    flex: 1,
    minWidth: 400,
    gap: spacing.lg,
  },
  rightColumn: {
    width: 380,
    minWidth: 300,
  },
  card: {
    ...cardStyles.base,
    overflow: 'visible',
    zIndex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  cardTitle: {
    ...typography.h4,
  },
  divider: {
    height: 2,
    // backgroundColor: colors.accent[500], // Now using dynamic color via inline style
    marginBottom: spacing.lg,
    borderRadius: borderRadius.sm,
  },
  inputRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
    alignItems: 'flex-start',
    overflow: 'visible',
    zIndex: 1,
  },
  inputContainer: {
    marginBottom: spacing.md,
  },
  label: {
    ...typography.label,
    marginBottom: spacing.xs + 2,
  },
  textInput: {
    ...inputStyles.base,
  },
  dateInputWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  dateInput: {
    flex: 1,
    paddingRight: 70, // Make room for the "Today" button
  },
  todayButton: {
    position: 'absolute',
    right: spacing.sm,
    // backgroundColor: colors.primary[500], // Now using dynamic color via inline style
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.md,
    zIndex: 10,
    ...buttonStyles.primary,
    minHeight: undefined,
    paddingVertical: spacing.xs + 2,
  },
  todayButtonText: {
    color: colors.text.inverse,
    fontSize: typography.caption.fontSize,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  dropdown: {
    ...inputStyles.base,
    minHeight: inputStyles.base.minHeight,
  },
  dropdownContainer: {
    borderRadius: borderRadius.lg,
    borderWidth: 2,
    borderColor: colors.border.light,
    marginTop: spacing.xs,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  checkboxLabel: {
    fontSize: 14,
    color: '#374151',
  },
  customerSuggestions: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 200,
    zIndex: 99999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 16,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  suggestionItemSelected: {
    backgroundColor: '#EFF6FF',
  },
  suggestionItemMain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  suggestionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    flex: 1,
  },
  suggestionPhone: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 8,
  },
  suggestionEmail: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 4,
  },
  customerStatus: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    position: 'relative',
    zIndex: 0,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 8,
    borderRadius: 6,
  },
  statusIndicatorExisting: {
    backgroundColor: '#D1FAE5',
  },
  statusIndicatorNew: {
    // backgroundColor: '#DBEAFE', // Now using dynamic color via inline style
  },
  statusIndicatorText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  addServiceButton: {
    ...buttonStyles.primary,
    alignSelf: 'auto',
    marginTop: spacing.xl + 2,
  },
  addServiceButtonText: {
    ...buttonStyles.primaryText,
  },
  servicesListTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  serviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  serviceItemInfo: {
    flex: 1,
  },
  serviceItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  serviceItemDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  serviceQuantityInput: {
    width: 60,
    padding: 4,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 4,
    fontSize: 13,
    textAlign: 'center',
    backgroundColor: '#FFFFFF',
  },
  serviceItemUnit: {
    fontSize: 12,
    color: '#6B7280',
  },
  serviceItemPrice: {
    fontSize: 14,
    fontWeight: '600',
    // color: '#F59E0B', // Now using dynamic color via inline style
    marginLeft: 'auto',
  },
  removeButton: {
    padding: 4,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F3F4F6',
    position: 'sticky',
    top: 20,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'Poppins_600SemiBold',
  },
  balanceBox: {
    // backgroundColor: '#F59E0B', // Now using dynamic color via inline style
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  balanceAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  balanceLabelChange: {
    fontSize: 12,
    fontWeight: '600',
    color: '#059669',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  balanceAmountChange: {
    fontSize: 24,
    fontWeight: '700',
    color: '#047857',
  },
  summarySection: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  summaryRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryRowHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    letterSpacing: 0.5,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  summaryServiceName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    fontFamily: 'Poppins_500Medium',
  },
  summaryServiceQty: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    fontFamily: 'Poppins_400Regular',
  },
  summaryAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'Poppins_600SemiBold',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Poppins_400Regular',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    fontFamily: 'Poppins_500Medium',
  },
  summaryTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'Poppins_600SemiBold',
  },
  summaryTotalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Poppins_700Bold',
  },
  emptyText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 20,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    backgroundColor: '#FFFFFF',
    minHeight: 100,
  },
  createButton: {
    ...buttonStyles.primary,
    marginBottom: spacing.sm,
  },
  createButtonText: {
    ...buttonStyles.primaryText,
  },
  secondaryButton: {
    ...buttonStyles.secondary,
    marginBottom: spacing.sm,
  },
  secondaryButtonText: {
    ...buttonStyles.secondaryText,
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
  },
  successBannerClose: {
    padding: 4,
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
  saveButtonText: {
    ...buttonStyles.primaryText,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingVertical: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
  },
  textInputError: {
    ...inputStyles.error,
  },
  hintText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 6,
    fontStyle: 'italic',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    paddingVertical: 4,
  },
  warningText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '500',
  },
  changeText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
  },
  paidText: {
    fontSize: 12,
    color: '#059669',
    fontWeight: '600',
  },
  paymentSummary: {
    marginTop: 6,
    gap: 4,
  },
  changeBox: {
    backgroundColor: '#D1FAE5',
    borderColor: '#059669',
  },
  paidBox: {
    backgroundColor: '#D1FAE5',
    borderColor: '#059669',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  overpaymentModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  confirmationModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  modalBody: {
    padding: 20,
  },
  overpaymentMessage: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
    textAlign: 'center',
  },
  overpaymentDetails: {
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  overpaymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  changeRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  overpaymentLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  overpaymentValue: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
  },
  overpaymentQuestion: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  confirmButton: {
    backgroundColor: '#059669',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 4,
  },
  confirmationMessage: {
    fontSize: 16,
    color: '#374151',
    marginBottom: 12,
    textAlign: 'center',
    lineHeight: 24,
  },
  confirmationQuestion: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    fontWeight: '500',
  },
  modalButtonPrimary: {
    // backgroundColor: '#2563EB', // Now using dynamic color via inline style
  },
  modalButtonSecondary: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  modalButtonTextPrimary: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalButtonTextSecondary: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
});

export default AddOrderForm;

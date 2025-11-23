import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import EmailInput from '@/components/EmailInput';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/constants/api';

interface Customer {
  _id: string;
  customerName: string;
  phoneNumber: string;
  email?: string;
}

interface AddCustomerModalProps {
  visible: boolean;
  onClose: () => void;
  onCustomerAdded: (customer: Customer) => void;
  onSkipCustomer?: () => void;
  existingCustomers: Customer[];
  pendingCustomerData?: { name: string; phone: string };
}

const AddCustomerModal: React.FC<AddCustomerModalProps> = ({
  visible,
  onClose,
  onCustomerAdded,
  onSkipCustomer,
  existingCustomers,
  pendingCustomerData,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    name: pendingCustomerData?.name || '',
    email: '',
    phone: pendingCustomerData?.phone || '',
    lastOrder: '',
  });
  
  // Animation values (matching Admin app style)
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const modalScale = useRef(new Animated.Value(0.9)).current;

  React.useEffect(() => {
    if (visible && pendingCustomerData) {
      setNewCustomer({
        name: pendingCustomerData.name,
        phone: pendingCustomerData.phone,
        email: '',
        lastOrder: '',
      });
    }
  }, [visible, pendingCustomerData]);
  
  // Animate modal (matching Admin app style)
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(modalOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(modalScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(modalOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(modalScale, {
          toValue: 0.9,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (!newCustomer.name.trim() || !newCustomer.phone.trim()) {
      Alert.alert('Error', 'Please fill in name and phone number');
      return;
    }

    // Check if phone already exists
    const phoneExists = existingCustomers.some(c => c.phoneNumber === newCustomer.phone);
    if (phoneExists) {
      Alert.alert('Error', 'A customer with this phone number already exists');
      return;
    }

    setIsLoading(true);
    
    try {
      const token = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('userToken');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await axios.post(
        `${API_BASE_URL}/customers`,
        {
          name: newCustomer.name.trim(),
          phone: newCustomer.phone.trim(),
          email: newCustomer.email.trim() || undefined,
        },
        { headers }
      );

      // Handle response format - could be direct data or wrapped in data property
      const responseData = response.data.data || response.data;

      const customer: Customer = {
        _id: responseData._id || responseData.id,
        customerName: responseData.name || responseData.customerName,
        phoneNumber: responseData.phone || responseData.phoneNumber,
        email: responseData.email,
      };
      
      onCustomerAdded(customer);
      handleClose();
    } catch (error: any) {
      // Handle 409 Conflict - customer already exists
      if (error?.response?.status === 409) {
        console.log('Customer already exists (409), using existing customer from response...');
        
        // First, try to get existing customer from error response
        const existingCustomerFromResponse = error?.response?.data?.data;
        
        if (existingCustomerFromResponse) {
          // Use the existing customer from the backend response
          const customer: Customer = {
            _id: existingCustomerFromResponse._id || existingCustomerFromResponse.id,
            customerName: existingCustomerFromResponse.name || existingCustomerFromResponse.customerName,
            phoneNumber: existingCustomerFromResponse.phone || existingCustomerFromResponse.phoneNumber,
            email: existingCustomerFromResponse.email,
          };
          
          console.log('Using existing customer from 409 response:', customer);
          onCustomerAdded(customer);
          handleClose();
          return;
        }
        
        // If not in response, try to fetch it
        try {
          const token = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('userToken');
          const headers: any = { 'Content-Type': 'application/json' };
          if (token) headers.Authorization = `Bearer ${token}`;

          // Normalize phone number for comparison (remove all non-digits)
          const normalizePhone = (phone: string) => phone.replace(/\D/g, '');
          const phoneToMatch = normalizePhone(newCustomer.phone.trim());
          const nameToMatch = newCustomer.name.trim().toLowerCase();

          // Fetch all customers and find the one with matching phone or name
          const customersResponse = await axios.get(`${API_BASE_URL}/customers`, { headers });
          const customersList = Array.isArray(customersResponse.data)
            ? customersResponse.data
            : customersResponse.data?.data || customersResponse.data?.customers || [];

          // Find the customer with matching phone or name
          const existingCustomer = customersList.find((c: any) => {
            if (!c) return false;
            const customerPhone = normalizePhone((c.phone || c.phoneNumber || '').trim());
            const customerName = (c.name || c.customerName || '').trim().toLowerCase();
            
            // Match by phone (exact or normalized) or by name
            return (customerPhone && customerPhone === phoneToMatch) || 
                   (customerName && customerName === nameToMatch);
          });

          if (existingCustomer) {
            const customer: Customer = {
              _id: existingCustomer._id || existingCustomer.id,
              customerName: existingCustomer.name || existingCustomer.customerName,
              phoneNumber: existingCustomer.phone || existingCustomer.phoneNumber,
              email: existingCustomer.email,
            };
            
            console.log('Found existing customer in list:', customer);
            onCustomerAdded(customer);
            handleClose();
            return;
          } else {
            // If we can't find the customer in the list, create a customer object from the form data
            // The backend will find the existing customer when creating the order
            console.log('Customer exists (409) but not found in list, creating customer object from form data');
            const customer: Customer = {
              _id: '', // Will be set by backend
              customerName: newCustomer.name.trim(),
              phoneNumber: newCustomer.phone.trim(),
              email: newCustomer.email.trim() || undefined,
            };
            
            onCustomerAdded(customer);
            handleClose();
            return;
          }
        } catch (fetchError) {
          console.error('Error fetching existing customer:', fetchError);
          // Even if fetch fails, create customer object from form data
          // Backend will find existing customer when creating order
          const customer: Customer = {
            _id: '',
            customerName: newCustomer.name.trim(),
            phoneNumber: newCustomer.phone.trim(),
            email: newCustomer.email.trim() || undefined,
          };
          
          onCustomerAdded(customer);
          handleClose();
          return;
        }
      }

      // For other errors, show error message
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to add customer';
      Alert.alert('Error', errorMessage);
      console.error('Error adding customer:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setNewCustomer({ name: '', email: '', phone: '', lastOrder: '' });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable
        style={styles.modalOverlay}
        onPress={handleClose}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <Animated.View
            style={[
              styles.modalContent,
              {
                transform: [{ scale: modalScale }],
                opacity: modalOpacity,
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <Ionicons name="person-add-outline" size={24} color="#2563EB" />
                <View>
                  <Text style={styles.modalTitle}>Add New Customer</Text>
                  <Text style={styles.modalSubtitle}>Enter customer information to add them to the system</Text>
                </View>
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {pendingCustomerData && (
              <View style={styles.pendingInfo}>
                <Ionicons name="information-circle-outline" size={16} color="#2563EB" />
                <Text style={styles.pendingInfoText}>
                  Add "{pendingCustomerData.name}" to the customer database to proceed with the order.
                </Text>
              </View>
            )}

            <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
              <View style={styles.formGrid}>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Full Name *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter customer's full name"
                    value={newCustomer.name}
                    onChangeText={(text) => setNewCustomer({ ...newCustomer, name: text })}
                    editable={!pendingCustomerData}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Email Address</Text>
                  <EmailInput
                    style={styles.textInput}
                    placeholder="customer@example.com (optional)"
                    value={newCustomer.email}
                    onChangeText={(text) => setNewCustomer({ ...newCustomer, email: text })}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Phone Number *</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="+63 912 345 6789"
                    value={newCustomer.phone}
                    onChangeText={(text) => setNewCustomer({ ...newCustomer, phone: text })}
                    keyboardType="phone-pad"
                    editable={!pendingCustomerData}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Last Order Date</Text>
                  <View style={styles.dateInputContainer}>
                    <TextInput
                      style={[styles.textInput, styles.dateInput]}
                      placeholder="mm/dd/yyyy"
                      value={newCustomer.lastOrder}
                      onChangeText={(text) => setNewCustomer({ ...newCustomer, lastOrder: text })}
                    />
                    <TouchableOpacity
                      style={styles.todayButton}
                      onPress={() => {
                        const today = new Date();
                        const formattedDate = `${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getDate()).padStart(2, '0')}/${today.getFullYear()}`;
                        setNewCustomer({ ...newCustomer, lastOrder: formattedDate });
                      }}
                    >
                      <Text style={styles.todayButtonText}>Today</Text>
                    </TouchableOpacity>
                    <Ionicons name="calendar-outline" size={20} color="#6B7280" style={styles.calendarIcon} />
                  </View>
                </View>
              </View>

              <View style={styles.formNote}>
                <Text style={styles.formNoteText}>
                  💡 <Text style={styles.formNoteBold}>Note:</Text> Customer will start with 0 orders and ₱0 spent. These values will be updated automatically when they place orders.
                </Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleClose}
                disabled={isLoading}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              {onSkipCustomer && (
                <TouchableOpacity
                  style={[styles.button, styles.skipButton]}
                  onPress={() => {
                    handleClose();
                    onSkipCustomer();
                  }}
                  disabled={isLoading}
                >
                  <Text style={styles.skipButtonText}>Maybe next time</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.button, styles.submitButton, isLoading && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>Adding...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="save-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.submitButtonText}>Add Customer</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
    height: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 25,
    elevation: 8,
    elevation: 8,
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
  closeButton: {
    padding: 4,
  },
  pendingInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    padding: 12,
    margin: 20,
    marginBottom: 0,
    borderRadius: 8,
    gap: 8,
  },
  pendingInfoText: {
    flex: 1,
    fontSize: 14,
    color: '#1E40AF',
    lineHeight: 20,
  },
  form: {
    padding: 20,
  },
  formGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -10,
  },
  inputContainer: {
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
    gap: 8,
  },
  dateInput: {
    flex: 1,
    paddingRight: 100,
  },
  todayButton: {
    position: 'absolute',
    right: 40,
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    zIndex: 1,
  },
  todayButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
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
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelButtonText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 14,
  },
  skipButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  skipButtonText: {
    color: '#6B7280',
    fontWeight: '600',
    fontSize: 14,
  },
  submitButton: {
    backgroundColor: '#2563EB',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default AddCustomerModal;



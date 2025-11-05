import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  ScrollView, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  ActivityIndicator,
  Modal,
  Image,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Dropdown } from 'react-native-element-dropdown';
import GlobalStyles from '../styles/GlobalStyle';
import ModernSidebar from './components/ModernSidebar';
import Header from './components/Header';
import { API_BASE_URL } from '@/constants/api';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ExpenseCategory = 'Supplies' | 'Utilities' | 'Maintenance' | 'Salaries' | 'Other';

interface Expense {
  _id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Appealed';
  images?: string[];
  adminFeedback?: string;
  appealReason?: string;
  appealedAt?: string;
  appealImages?: string[];
  date: string;
  archived?: boolean;
}

const categoryOptions = [
  { label: 'Supplies', value: 'Supplies' },
  { label: 'Utilities', value: 'Utilities' },
  { label: 'Maintenance', value: 'Maintenance' },
  { label: 'Salaries', value: 'Salaries' },
  { label: 'Other', value: 'Other' },
];

export default function Request() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showArchived, setShowArchived] = useState(false); // false = Active, true = Archived view
  
  // Form state
  const [category, setCategory] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);

  // Receipt upload state
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedExpenseForReceipt, setSelectedExpenseForReceipt] = useState<Expense | null>(null);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);
  const [receiptImageUri, setReceiptImageUri] = useState<string | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  // Success feedback state
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Appeal modal state
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [selectedExpenseForAppeal, setSelectedExpenseForAppeal] = useState<Expense | null>(null);
  const [appealReason, setAppealReason] = useState('');
  const [appealImage, setAppealImage] = useState<string | null>(null);
  const [appealImageUri, setAppealImageUri] = useState<string | null>(null);
  const [submittingAppeal, setSubmittingAppeal] = useState(false);

  // Ref for file input (for web)
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const ARCHIVED_KEY = 'archived_expense_ids';

  // Confirm modal state (for archive/unarchive)
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'archive' | 'unarchive'>('archive');
  const [confirmExpense, setConfirmExpense] = useState<Expense | null>(null);

  const getArchivedIdSet = async (): Promise<Set<string>> => {
    try {
      const raw = await AsyncStorage.getItem(ARCHIVED_KEY);
      const arr: string[] = raw ? JSON.parse(raw) : [];
      return new Set(arr);
    } catch {
      return new Set();
    }
  };

  const saveArchivedIdSet = async (ids: Set<string>) => {
    try {
      await AsyncStorage.setItem(ARCHIVED_KEY, JSON.stringify(Array.from(ids)));
    } catch {}
  };

  useEffect(() => {
    fetchExpenses();
    
    // Create hidden file input on mount (web only)
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.document) {
      const input = window.document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.style.display = 'none';
      input.style.position = 'absolute';
      input.style.opacity = '0';
      input.style.pointerEvents = 'none';
      window.document.body.appendChild(input);
      fileInputRef.current = input as any;
      
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (file) {
          // Validate file size (max 10MB)
          if (file.size > 10 * 1024 * 1024) {
            Alert.alert('Error', 'Image size must be less than 10MB');
            input.value = ''; // Reset input
            return;
          }

          // Validate file type
          if (!file.type.startsWith('image/')) {
            Alert.alert('Error', 'Please select an image file');
            input.value = ''; // Reset input
            return;
          }

          const reader = new FileReader();
          reader.onerror = () => {
            Alert.alert('Error', 'Failed to read image file');
            input.value = ''; // Reset input
          };
          reader.onloadend = () => {
            try {
              const base64 = reader.result as string;
              if (base64) {
                setSelectedImage(base64);
                setImageUri(URL.createObjectURL(file));
              }
            } catch (error) {
              console.error('Error processing image:', error);
              Alert.alert('Error', 'Failed to process image');
            } finally {
              input.value = ''; // Reset input for next use
            }
          };
          reader.readAsDataURL(file);
        }
      };
      
      return () => {
        // Cleanup on unmount
        if (fileInputRef.current && window.document.body.contains(fileInputRef.current)) {
          window.document.body.removeChild(fileInputRef.current);
        }
      };
    }
  }, []);

  // Reset form when modal opens
  useEffect(() => {
    if (showAddModal) {
      console.log('Modal opened, resetting form');
      setCategory('');
      setAmount('');
      setDescription('');
      setSelectedImage(null);
      setImageUri(null);
      setSubmitting(false);
    }
  }, [showAddModal]);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('userToken');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await axios.get(`${API_BASE_URL}/expenses`, { headers });
      const data = response.data;
      
      const expensesArray = Array.isArray(data) 
        ? data 
        : Array.isArray(data?.data) 
          ? data.data 
          : [];

      const archivedIds = await getArchivedIdSet();

      setExpenses(expensesArray.map((e: any) => ({
        _id: e._id || e.id,
        category: e.category,
        description: e.description,
        amount: e.amount,
        status: e.status,
        images: e.images || [],
        adminFeedback: e.adminFeedback || '',
        appealReason: e.appealReason || '',
        appealedAt: e.appealedAt || '',
        appealImages: e.appealImages || [],
        date: e.date || e.createdAt,
        archived: e.archived || e.status === 'Archived' || archivedIds.has(e._id || e.id),
      })));
    } catch (error: any) {
      console.error('Error fetching expenses:', error);
      Alert.alert('Error', 'Failed to load expense requests');
    } finally {
      setLoading(false);
    }
  };

  const archiveExpenseConfirmed = async (expense: Expense) => {
      try {
        // Optimistic update + local persistence
        setExpenses(prev => prev.map(e => e._id === expense._id ? { ...e, archived: true } : e));
        const ids = await getArchivedIdSet();
        ids.add(expense._id);
        saveArchivedIdSet(ids);
        setSuccessMessage('Expense archived');
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);

        // Attempt server update in background
        const token = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('userToken');
        const headers: any = { 'Content-Type': 'application/json' };
        if (token) headers.Authorization = `Bearer ${token}`;
        try {
          await axios.put(`${API_BASE_URL}/expenses/${expense._id}/archive`, {}, { headers });
        } catch {
          try { await axios.patch(`${API_BASE_URL}/expenses/${expense._id}`, { status: 'Archived', archived: true }, { headers }); } catch {}
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to archive expense');
      }
  };

  const handleArchive = async (expense: Expense) => {
    setConfirmExpense(expense);
    setConfirmAction('archive');
    setConfirmVisible(true);
  };

  const unarchiveExpenseConfirmed = async (expense: Expense) => {
      try {
        // Optimistic update + local persistence
        setExpenses(prev => prev.map(e => e._id === expense._id ? { ...e, archived: false } : e));
        const ids = await getArchivedIdSet();
        ids.delete(expense._id);
        saveArchivedIdSet(ids);
        setSuccessMessage('Expense unarchived');
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);

        // Attempt server update in background
        const token = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('userToken');
        const headers: any = { 'Content-Type': 'application/json' };
        if (token) headers.Authorization = `Bearer ${token}`;
        try {
          await axios.put(`${API_BASE_URL}/expenses/${expense._id}/unarchive`, {}, { headers });
        } catch {
          try { await axios.patch(`${API_BASE_URL}/expenses/${expense._id}`, { archived: false }, { headers }); } catch {}
        }
      } catch (error) {
        Alert.alert('Error', 'Failed to unarchive expense');
      }
  };

  const handleUnarchive = async (expense: Expense) => {
    setConfirmExpense(expense);
    setConfirmAction('unarchive');
    setConfirmVisible(true);
  };

  const handleImagePicker = (forReceipt: boolean = false) => {
    // For web platform, use file input
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.document) {
      try {
        // Use the ref input if available (for initial proof), or create new one (for receipts)
        let input: HTMLInputElement;
        
        if (forReceipt) {
          // For receipt upload, create a temporary input
          input = window.document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.style.display = 'none';
          window.document.body.appendChild(input);
          
          input.onchange = (e: any) => {
            const file = e.target.files?.[0];
            if (file) {
              // Validate file size (max 10MB)
              if (file.size > 10 * 1024 * 1024) {
                Alert.alert('Error', 'Image size must be less than 10MB');
                window.document.body.removeChild(input);
                return;
              }

              // Validate file type
              if (!file.type.startsWith('image/')) {
                Alert.alert('Error', 'Please select an image file');
                window.document.body.removeChild(input);
                return;
              }

              const reader = new FileReader();
              reader.onerror = () => {
                Alert.alert('Error', 'Failed to read image file');
                window.document.body.removeChild(input);
              };
              reader.onloadend = () => {
                try {
                  const base64 = reader.result as string;
                  if (base64) {
                    setReceiptImage(base64);
                    setReceiptImageUri(URL.createObjectURL(file));
                  }
                } catch (error) {
                  console.error('Error processing image:', error);
                  Alert.alert('Error', 'Failed to process image');
                } finally {
                  // Clean up input element
                  if (window.document.body.contains(input)) {
                    window.document.body.removeChild(input);
                  }
                }
              };
              reader.readAsDataURL(file);
            } else {
              // User cancelled
              if (window.document.body.contains(input)) {
                window.document.body.removeChild(input);
              }
            }
          };
          
          setTimeout(() => {
            try {
              input.click();
            } catch (clickError) {
              console.error('Error clicking file input:', clickError);
              Alert.alert('Error', 'Unable to open file picker. Please try again.');
              if (window.document.body.contains(input)) {
                window.document.body.removeChild(input);
              }
            }
          }, 10);
        } else {
          // For initial proof, use the ref input
          if (fileInputRef.current) {
            input = fileInputRef.current;
            setTimeout(() => {
              try {
                input.click();
              } catch (clickError) {
                console.error('Error clicking file input:', clickError);
                Alert.alert('Error', 'Unable to open file picker. Please try again.');
              }
            }, 10);
          } else {
            Alert.alert('Error', 'File picker not initialized. Please refresh the page.');
          }
        }
      } catch (error) {
        console.error('Error opening file picker:', error);
        Alert.alert('Error', 'Failed to open image picker. Please try again.');
      }
    } else {
      // For mobile, would use expo-image-picker
      Alert.alert('Info', 'Image picker will be available after installing expo-image-picker');
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImageUri(null);
  };

  const openReceiptUpload = (expense: Expense) => {
    setSelectedExpenseForReceipt(expense);
    setReceiptImage(null);
    setReceiptImageUri(null);
    setShowReceiptModal(true);
  };

  const closeReceiptModal = () => {
    setShowReceiptModal(false);
    setSelectedExpenseForReceipt(null);
    setReceiptImage(null);
    setReceiptImageUri(null);
  };

  const handleReceiptUpload = async () => {
    if (!selectedExpenseForReceipt || !receiptImage) {
      Alert.alert('Error', 'Please select a receipt image');
      return;
    }

    setUploadingReceipt(true);
    try {
      const token = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('userToken');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const response = await axios.put(
        `${API_BASE_URL}/expenses/${selectedExpenseForReceipt._id}/receipt`,
        {
          images: [receiptImage],
        },
        { headers }
      );

      // Show success banner
      setSuccessMessage('Receipt uploaded successfully!');
      setShowSuccessMessage(true);
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 5000);

      // Close modal and refresh expenses
      closeReceiptModal();
      fetchExpenses();
    } catch (error: any) {
      console.error('Error uploading receipt:', error);
      Alert.alert('Error', error?.response?.data?.message || 'Failed to upload receipt');
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleSubmit = async () => {
    console.log('=== handleSubmit START ===');
    console.log('Form state:', { 
      category: category, 
      categoryType: typeof category,
      amount: amount, 
      amountType: typeof amount,
      description: description, 
      descriptionTrimmed: description.trim(),
      descriptionLength: description.trim().length,
      submitting: submitting,
      hasImage: !!selectedImage
    });
    
    // Check validation step by step
    if (!category) {
      console.error('❌ Validation failed: Category is empty or falsy');
      Alert.alert('Error', 'Please select a category');
      return;
    }

    if (!amount || amount.trim() === '') {
      console.error('❌ Validation failed: Amount is empty');
      Alert.alert('Error', 'Please enter an amount');
      return;
    }

    if (!description || !description.trim()) {
      console.error('❌ Validation failed: Description is empty');
      Alert.alert('Error', 'Please enter a description');
      return;
    }

    const amountNum = parseFloat(amount);
    console.log('Parsed amount:', amountNum, 'isNaN:', isNaN(amountNum));
    if (isNaN(amountNum) || amountNum <= 0) {
      console.error('❌ Validation failed: Invalid amount value');
      Alert.alert('Error', 'Please enter a valid amount (greater than 0)');
      return;
    }

    if (submitting) {
      console.warn('⚠️ Already submitting, ignoring duplicate request');
      return;
    }

    console.log('✅ All validations passed, starting submission...');
    setSubmitting(true);
    
    try {
      const token = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('userToken');
      console.log('Token retrieved:', token ? 'Yes' : 'No');
      
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      // Compress image if available
      let compressedImage = selectedImage;
      if (selectedImage) {
        try {
          const { compressImage, shouldCompress, getImageSize } = await import('@/utils/imageCompression');
          if (shouldCompress(selectedImage, 500)) { // Compress if > 500KB
            console.log('📦 Compressing image (original size:', getImageSize(selectedImage).toFixed(2), 'KB)');
            compressedImage = await compressImage(selectedImage, {
              maxWidth: 1920,
              maxHeight: 1920,
              quality: 0.8,
            });
            console.log('✅ Image compressed (new size:', getImageSize(compressedImage).toFixed(2), 'KB)');
          }
        } catch (error) {
          console.warn('⚠️ Image compression failed, using original:', error);
          // Continue with original image if compression fails
        }
      }

      const expenseData: any = {
        category: category,
        amount: amountNum,
        description: description.trim(),
        images: compressedImage ? [compressedImage] : [],
      };

      console.log('📤 Sending request to:', `${API_BASE_URL}/expenses`);
      console.log('📦 Request payload:', { 
        ...expenseData, 
        images: `${expenseData.images.length} image(s)` 
      });

      const response = await axios.post(`${API_BASE_URL}/expenses`, expenseData, { headers });
      
      console.log('✅ Expense submitted successfully!');
      console.log('📥 Response:', response.data);
      
      // Success modal
      setSuccessMessage('Expense request submitted successfully!');
      setShowSuccessModal(true);

      // Reset form
      setCategory('');
      setAmount('');
      setDescription('');
      setSelectedImage(null);
      setImageUri(null);
      setShowAddModal(false);

      // Refresh expenses
      fetchExpenses();
      console.log('=== handleSubmit SUCCESS ===');
    } catch (error: any) {
      console.error('❌ Error submitting expense:', error);
      console.error('Error response:', error?.response);
      console.error('Error status:', error?.response?.status);
      console.error('Error data:', error?.response?.data);
      
      const errorMessage = error?.response?.data?.message 
        || error?.response?.data?.error 
        || error?.message 
        || 'Failed to submit expense request. Please check your connection and try again.';
      
      Alert.alert('Error', errorMessage);
    } finally {
      setSubmitting(false);
      console.log('=== handleSubmit END ===');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved':
        return '#10B981';
      case 'Rejected':
        return '#EF4444';
      case 'Appealed':
        return '#3B82F6';
      default:
        return '#F59E0B';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved':
        return 'checkmark-circle';
      case 'Rejected':
        return 'close-circle';
      case 'Appealed':
        return 'alert-circle';
      default:
        return 'time';
    }
  };

  const openAppealModal = (expense: Expense) => {
    setSelectedExpenseForAppeal(expense);
    setAppealReason('');
    setAppealImage(null);
    setAppealImageUri(null);
    setShowAppealModal(true);
  };

  const closeAppealModal = () => {
    setShowAppealModal(false);
    setSelectedExpenseForAppeal(null);
    setAppealReason('');
    setAppealImage(null);
    setAppealImageUri(null);
  };

  const removeAppealImage = () => {
    setAppealImage(null);
    setAppealImageUri(null);
  };

  const handleAppealImagePicker = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.document) {
      try {
        const input = window.document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.style.display = 'none';
        input.style.position = 'absolute';
        input.style.opacity = '0';
        input.style.pointerEvents = 'none';
        window.document.body.appendChild(input);

        input.onchange = (e: any) => {
          const file = e.target.files?.[0];
          if (file) {
            // Validate file size (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
              Alert.alert('Error', 'Image size must be less than 10MB');
              input.value = '';
              setTimeout(() => {
                if (window.document.body.contains(input)) {
                  window.document.body.removeChild(input);
                }
              }, 100);
              return;
            }

            // Validate file type
            if (!file.type.startsWith('image/')) {
              Alert.alert('Error', 'Please select an image file');
              input.value = '';
              setTimeout(() => {
                if (window.document.body.contains(input)) {
                  window.document.body.removeChild(input);
                }
              }, 100);
              return;
            }

            const reader = new FileReader();
            reader.onerror = () => {
              Alert.alert('Error', 'Failed to read image file');
              input.value = '';
              setTimeout(() => {
                if (window.document.body.contains(input)) {
                  window.document.body.removeChild(input);
                }
              }, 100);
            };
            reader.onloadend = () => {
              try {
                const base64 = reader.result as string;
                console.log('Appeal image processed, base64 length:', base64?.length || 0);
                if (base64 && base64.length > 0) {
                  setAppealImage(base64);
                  setAppealImageUri(URL.createObjectURL(file));
                  console.log('✅ Appeal image set successfully, length:', base64.length);
                } else {
                  console.error('❌ No base64 data from reader');
                  Alert.alert('Error', 'Failed to process image');
                }
              } catch (error) {
                console.error('Error processing appeal image:', error);
                Alert.alert('Error', 'Failed to process image');
              } finally {
                input.value = '';
                setTimeout(() => {
                  if (window.document.body.contains(input)) {
                    window.document.body.removeChild(input);
                  }
                }, 100);
              }
            };
            reader.readAsDataURL(file);
          } else {
            input.value = '';
            setTimeout(() => {
              if (window.document.body.contains(input)) {
                window.document.body.removeChild(input);
              }
            }, 100);
          }
        };

        setTimeout(() => {
          try {
            input.click();
          } catch (clickError) {
            console.error('Error clicking appeal file input:', clickError);
            Alert.alert('Error', 'Unable to open file picker. Please try again.');
            setTimeout(() => {
              if (window.document.body.contains(input)) {
                window.document.body.removeChild(input);
              }
            }, 100);
          }
        }, 10);
      } catch (error) {
        console.error('Error opening appeal file picker:', error);
        Alert.alert('Error', 'Failed to open image picker. Please try again.');
      }
    } else {
      Alert.alert('Info', 'Image picker will be available after installing expo-image-picker');
    }
  };

  const handleAppeal = async () => {
    console.log('=== handleAppeal START ===');
    console.log('Appeal state:', {
      selectedExpenseForAppeal: selectedExpenseForAppeal?._id,
      appealReason: appealReason,
      appealReasonLength: appealReason.trim().length,
      hasAppealImage: !!appealImage,
      appealImageLength: appealImage?.length || 0
    });

    if (!selectedExpenseForAppeal || !appealReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for your appeal');
      return;
    }

    setSubmittingAppeal(true);
    try {
      const token = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('userToken');
      const headers: any = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const appealData: any = {
        appealReason: appealReason.trim()
      };

      // Add images if provided
      if (appealImage && typeof appealImage === 'string' && appealImage.length > 100) {
        // Base64 strings start with "data:image/..." and are typically > 100 chars
        console.log('✅ Adding appeal image to request, length:', appealImage.length);
        appealData.appealImages = [appealImage];
      } else {
        console.log('⚠️ No appeal image to add (appealImage:', appealImage ? `exists but length is ${appealImage.length}` : 'null/undefined', ')');
        appealData.appealImages = [];
      }

      console.log('📤 Sending appeal request:', {
        url: `${API_BASE_URL}/expenses/${selectedExpenseForAppeal._id}/appeal`,
        expenseId: selectedExpenseForAppeal._id,
        appealReason: appealReason.trim(),
        appealReasonLength: appealReason.trim().length,
        appealImagesCount: appealData.appealImages.length,
        appealImageDataSize: appealData.appealImages[0]?.length || 0,
        appealImagePreview: appealData.appealImages[0]?.substring(0, 50) || 'none',
        hasAuthToken: !!token,
        payloadSize: JSON.stringify(appealData).length
      });

      let response;
      try {
        response = await axios.put(
          `${API_BASE_URL}/expenses/${selectedExpenseForAppeal._id}/appeal`,
          appealData,
          { headers }
        );
      } catch (axiosError: any) {
        console.error('❌ Axios error details:', {
          message: axiosError?.message,
          response: axiosError?.response,
          status: axiosError?.response?.status,
          statusText: axiosError?.response?.statusText,
          data: axiosError?.response?.data,
          config: axiosError?.config ? {
            url: axiosError.config.url,
            method: axiosError.config.method,
            headers: axiosError.config.headers
          } : null
        });
        throw axiosError; // Re-throw to be caught by outer catch
      }

      console.log('✅ Appeal submitted successfully:', response.data);

      // Update the expense in the list
      setExpenses(expenses.map(e => 
        e._id === selectedExpenseForAppeal._id 
          ? { 
              ...e, 
              status: 'Appealed' as const, 
              appealReason: appealReason.trim(), 
              appealedAt: new Date().toISOString(),
              appealImages: appealImage ? [appealImage] : []
            }
          : e
      ));

      // Success modal
      setSuccessMessage('Appeal submitted successfully!');
      setShowSuccessModal(true);

      closeAppealModal();
      console.log('=== handleAppeal SUCCESS ===');
    } catch (error: any) {
      console.error('❌ Error submitting appeal:', error);
      console.error('Error response:', error?.response);
      console.error('Error status:', error?.response?.status);
      console.error('Error data:', error?.response?.data);
      Alert.alert('Error', error?.response?.data?.message || 'Failed to submit appeal');
      console.log('=== handleAppeal ERROR ===');
    } finally {
      setSubmittingAppeal(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return 'N/A';
    }
  };

  return (
    <View style={GlobalStyles.mainLayout}>
      <ModernSidebar />

      <View style={GlobalStyles.mainContent}>
        <Header title="Expense Requests" />

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
            <Ionicons name="receipt-outline" size={28} color="#111827" style={{ marginRight: 12 }} />
            <View>
              <Text style={styles.pageTitle}>Expense Requests</Text>
              <Text style={styles.pageSubtitle}>Submit and track your expense requests</Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.addButtonText}>New Request</Text>
          </TouchableOpacity>
        </View>

        {/* View Controls */}
        <View style={styles.controlsBar}>
          <View style={styles.segmentedGroup}>
            <TouchableOpacity
              style={[styles.segmentButton, !showArchived && styles.segmentButtonActive]}
              onPress={() => setShowArchived(false)}
            >
              <Ionicons name="checkmark-done-outline" size={16} color={!showArchived ? '#2563EB' : '#6B7280'} />
              <Text style={[styles.segmentText, !showArchived && styles.segmentTextActive]}>Active</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.segmentButton, showArchived && styles.segmentButtonActive]}
              onPress={() => setShowArchived(true)}
            >
              <Ionicons name="archive-outline" size={16} color={showArchived ? '#2563EB' : '#6B7280'} />
              <Text style={[styles.segmentText, showArchived && styles.segmentTextActive]}>Archived</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Success Modal */}
        {showSuccessModal && (
          <Modal visible transparent animationType="fade" onRequestClose={() => setShowSuccessModal(false)}>
            <View style={styles.feedbackOverlay}>
              <View style={styles.feedbackCard}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Ionicons name="checkmark-circle" size={24} color="#059669" />
                  <Text style={styles.feedbackTitle}>Success</Text>
                </View>
                <Text style={styles.feedbackText}>{successMessage}</Text>
                <View style={{ marginTop: 16, alignItems: 'flex-end' }}>
                  <TouchableOpacity style={[styles.addButton]} onPress={() => setShowSuccessModal(false)}>
                    <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.addButtonText}>OK</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}

        {/* Expenses List */}
        <ScrollView style={styles.contentScroll}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={styles.loadingText}>Loading expenses...</Text>
            </View>
          ) : expenses.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyText}>No expense requests yet</Text>
              <Text style={styles.emptySubtext}>Click "New Request" to submit your first expense</Text>
            </View>
          ) : (
            <View style={styles.expensesList}>
              {Object.entries(expenses.filter(e => (e.archived || false) === showArchived).reduce((acc: Record<string, Expense[]>, e) => {
                acc[e.category] = acc[e.category] || [];
                acc[e.category].push(e);
                return acc;
              }, {})).sort(([a],[b]) => a.localeCompare(b)).map(([category, items]) => (
                <View key={category} style={{ width: '100%' }}>
                  <View style={styles.categoryHeader}>
                    <Ionicons name="folder-open-outline" size={18} color="#6B7280" />
                    <Text style={styles.categoryHeaderText}>{category}</Text>
                    <Text style={styles.categoryHeaderCount}>{items.length}</Text>
                  </View>
                  <View style={styles.categoryGrid}>
                  {items.map((expense) => (
                    <View key={expense._id} style={[styles.expenseCard, styles.expenseCardGrid]}>
                  <View style={styles.expenseHeader}>
                    <View style={styles.expenseHeaderLeft}>
                      <View style={[styles.statusBadge, { backgroundColor: getStatusColor(expense.status) + '20' }]}>
                        <Ionicons 
                          name={getStatusIcon(expense.status)} 
                          size={16} 
                          color={getStatusColor(expense.status)} 
                        />
                        <Text style={[styles.statusText, { color: getStatusColor(expense.status) }]}>
                          {expense.status}
                        </Text>
                      </View>
                      <Text style={styles.categoryText}>{expense.category}</Text>
                    </View>
                    <Text style={styles.amountText}>₱{expense.amount.toFixed(2)}</Text>
                  </View>

                  <Text style={styles.descriptionText}>{expense.description}</Text>

                  {expense.images && expense.images.length > 0 && (
                    <View style={styles.imagesContainer}>
                      <Ionicons name="image-outline" size={16} color="#6B7280" />
                      <Text style={styles.imagesText}>{expense.images.length} image(s) attached</Text>
                    </View>
                  )}

                  {expense.adminFeedback && (
                    <View style={styles.feedbackContainer}>
                      <Text style={styles.feedbackLabel}>Admin Feedback:</Text>
                      <Text style={styles.feedbackText}>{expense.adminFeedback}</Text>
                    </View>
                  )}

                  {expense.appealReason && (
                    <View style={[styles.feedbackContainer, { backgroundColor: '#DBEAFE', borderLeftColor: '#3B82F6' }]}>
                      <Text style={[styles.feedbackLabel, { color: '#1E40AF' }]}>
                        Your Appeal: {expense.appealedAt && `(${formatDate(expense.appealedAt)})`}
                      </Text>
                      <Text style={[styles.feedbackText, { color: '#1E3A8A', marginBottom: expense.appealImages && expense.appealImages.length > 0 ? 8 : 0 }]}>
                        {expense.appealReason}
                      </Text>
                      {expense.appealImages && expense.appealImages.length > 0 && (
                        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                          {expense.appealImages.map((img, idx) => (
                            <Image
                              key={idx}
                              source={{ uri: img }}
                              style={{
                                width: 60,
                                height: 60,
                                borderRadius: 6,
                                borderWidth: 1,
                                borderColor: '#3B82F6'
                              }}
                            />
                          ))}
                        </View>
                      )}
                    </View>
                  )}

                  {expense.status === 'Approved' && (
                    <TouchableOpacity 
                      style={styles.uploadReceiptButton}
                      onPress={() => openReceiptUpload(expense)}
                    >
                      <Ionicons name="camera-outline" size={16} color="#2563EB" />
                      <Text style={styles.uploadReceiptText}>Upload Receipt</Text>
                    </TouchableOpacity>
                  )}

                  {expense.status === 'Rejected' && !expense.appealReason && (
                    <TouchableOpacity 
                      style={[styles.uploadReceiptButton, { backgroundColor: '#3B82F6' }]}
                      onPress={() => openAppealModal(expense)}
                    >
                      <Ionicons name="alert-circle-outline" size={16} color="#FFFFFF" />
                      <Text style={[styles.uploadReceiptText, { color: '#FFFFFF' }]}>Appeal This Decision</Text>
                    </TouchableOpacity>
                  )}

                        <View style={styles.expenseFooter}>
                          <Text style={styles.dateText}>{formatDate(expense.date)}</Text>
                          {!showArchived ? (
                            <TouchableOpacity onPress={() => handleArchive(expense)} style={styles.archiveButton}>
                              <Ionicons name="archive-outline" size={16} color="#6B7280" />
                              <Text style={styles.archiveText}>Archive</Text>
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity onPress={() => handleUnarchive(expense)} style={styles.archiveButton}>
                              <Ionicons name="arrow-undo-outline" size={16} color="#6B7280" />
                              <Text style={styles.archiveText}>Unarchive</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                    </View>
                  ))}
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>

        {/* Add Expense Modal */}
        <Modal
          visible={showAddModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => !submitting && setShowAddModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleContainer}>
                  <Ionicons name="add-circle-outline" size={24} color="#2563EB" />
                  <Text style={styles.modalTitle}>New Expense Request</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => !submitting && setShowAddModal(false)}
                  disabled={submitting}
                >
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.formGroup}>
                  <Text style={styles.label}>Category *</Text>
                  <Dropdown
                    style={styles.dropdown}
                    containerStyle={styles.dropdownContainer}
                    data={categoryOptions}
                    labelField="label"
                    valueField="value"
                    placeholder="Select category"
                    value={category}
                    onChange={(item) => {
                      console.log('Category selected:', item);
                      setCategory(item?.value || item || '');
                    }}
                    itemTextStyle={styles.dropdownItemText}
                    selectedTextStyle={styles.dropdownSelectedText}
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Amount *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter amount"
                    placeholderTextColor="#9CA3AF"
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="decimal-pad"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Description *</Text>
                  <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Enter description"
                    placeholderTextColor="#9CA3AF"
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Proof Image (Optional)</Text>
                  {imageUri ? (
                    <View style={styles.imagePreviewContainer}>
                      <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                      <TouchableOpacity 
                        style={styles.removeImageButton}
                        onPress={removeImage}
                      >
                        <Ionicons name="close-circle" size={24} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity 
                      style={styles.imagePickerButton}
                      onPress={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('Image picker button pressed');
                        handleImagePicker(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="camera-outline" size={24} color="#2563EB" />
                      <Text style={styles.imagePickerText}>Select Image</Text>
                    </TouchableOpacity>
                  )}
                  {Platform.OS === 'web' && typeof window === 'undefined' && (
                    <Text style={styles.hintText}>
                      ⚠️ Image upload may not work in this environment
                    </Text>
                  )}
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => !submitting && setShowAddModal(false)}
                  disabled={submitting}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.submitButton, submitting && styles.submitButtonDisabled]}
                  onPress={() => {
                    console.log('Submit button pressed', { submitting, category, amount, description });
                    handleSubmit();
                  }}
                  disabled={submitting}
                  activeOpacity={0.7}
                >
                  {submitting ? (
                    <>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={styles.submitButtonText}>Submitting...</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="send-outline" size={18} color="#FFFFFF" />
                      <Text style={styles.submitButtonText}>Submit Request</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Upload Receipt Modal */}
        <Modal
          visible={showReceiptModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => !uploadingReceipt && closeReceiptModal()}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleContainer}>
                  <Ionicons name="receipt-outline" size={24} color="#2563EB" />
                  <Text style={styles.modalTitle}>Upload Receipt</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => !uploadingReceipt && closeReceiptModal()}
                  disabled={uploadingReceipt}
                >
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {selectedExpenseForReceipt && (
                  <View style={styles.receiptExpenseInfo}>
                    <Text style={styles.receiptExpenseLabel}>Expense Details:</Text>
                    <Text style={styles.receiptExpenseText}>
                      {selectedExpenseForReceipt.category} - ₱{selectedExpenseForReceipt.amount.toFixed(2)}
                    </Text>
                    <Text style={styles.receiptExpenseDescription}>{selectedExpenseForReceipt.description}</Text>
                  </View>
                )}

                <View style={styles.formGroup}>
                  <Text style={styles.label}>Receipt Image *</Text>
                  {receiptImageUri ? (
                    <View style={styles.imagePreviewContainer}>
                      <Image source={{ uri: receiptImageUri }} style={styles.imagePreview} />
                      <TouchableOpacity 
                        style={styles.removeImageButton}
                        onPress={() => {
                          setReceiptImage(null);
                          setReceiptImageUri(null);
                        }}
                      >
                        <Ionicons name="close-circle" size={24} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity 
                      style={styles.imagePickerButton}
                      onPress={() => handleImagePicker(true)}
                    >
                      <Ionicons name="camera-outline" size={24} color="#2563EB" />
                      <Text style={styles.imagePickerText}>Select Receipt Image</Text>
                    </TouchableOpacity>
                  )}
                  <Text style={styles.hintText}>
                    Upload a clear image of your purchase receipt or proof of expense
                  </Text>
                </View>
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => !uploadingReceipt && closeReceiptModal()}
                  disabled={uploadingReceipt}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.submitButton, (!receiptImage || uploadingReceipt) && styles.submitButtonDisabled]}
                  onPress={handleReceiptUpload}
                  disabled={!receiptImage || uploadingReceipt}
                >
                  {uploadingReceipt ? (
                    <>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={styles.submitButtonText}>Uploading...</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="cloud-upload-outline" size={18} color="#FFFFFF" />
                      <Text style={styles.submitButtonText}>Upload Receipt</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Confirm Archive/Unarchive Modal */}
        <Modal
          visible={confirmVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setConfirmVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.confirmCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Ionicons name={confirmAction === 'archive' ? 'archive-outline' : 'arrow-undo-outline'} size={22} color="#111827" />
                <Text style={styles.confirmTitle}>{confirmAction === 'archive' ? 'Archive Expense' : 'Unarchive Expense'}</Text>
              </View>
              <Text style={styles.confirmText}>
                {confirmAction === 'archive' 
                  ? 'Are you sure you want to archive this expense request?' 
                  : 'Restore this expense request to Active?'}
              </Text>
              <View style={styles.confirmActions}>
                <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setConfirmVisible(false)}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.submitButton]}
                  onPress={() => {
                    const exp = confirmExpense;
                    setConfirmVisible(false);
                    if (exp) {
                      if (confirmAction === 'archive') {
                        archiveExpenseConfirmed(exp);
                      } else {
                        unarchiveExpenseConfirmed(exp);
                      }
                    }
                  }}
                >
                  <Ionicons name={confirmAction === 'archive' ? 'archive-outline' : 'arrow-undo-outline'} size={18} color="#FFFFFF" />
                  <Text style={styles.submitButtonText}>{confirmAction === 'archive' ? 'Archive' : 'Unarchive'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Appeal Modal */}
        <Modal
          visible={showAppealModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => !submittingAppeal && closeAppealModal()}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleContainer}>
                  <Ionicons name="alert-circle-outline" size={24} color="#3B82F6" />
                  <Text style={styles.modalTitle}>Appeal Rejected Expense</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => !submittingAppeal && closeAppealModal()}
                  disabled={submittingAppeal}
                >
                  <Ionicons name="close" size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {selectedExpenseForAppeal && (
                  <>
                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Expense Details</Text>
                      <View style={{ padding: 12, backgroundColor: '#FFFFFF', borderRadius: 8, borderWidth: 1, borderColor: '#E5E7EB' }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 4 }}>
                          {selectedExpenseForAppeal.description}
                        </Text>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: '#2563EB', marginBottom: 4 }}>
                          ₱{selectedExpenseForAppeal.amount.toFixed(2)}
                        </Text>
                        <Text style={{ fontSize: 12, color: '#6B7280' }}>
                          Category: {selectedExpenseForAppeal.category}
                        </Text>
                      </View>
                    </View>

                    {selectedExpenseForAppeal.adminFeedback && (
                      <View style={styles.formGroup}>
                        <Text style={styles.label}>Admin Feedback</Text>
                        <View style={{ padding: 12, backgroundColor: '#FEF3C7', borderRadius: 8, borderLeftWidth: 4, borderLeftColor: '#F59E0B' }}>
                          <Text style={{ fontSize: 14, color: '#78350F' }}>
                            {selectedExpenseForAppeal.adminFeedback}
                          </Text>
                        </View>
                      </View>
                    )}

                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Appeal Reason *</Text>
                      <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder="Explain why you believe this expense should be approved..."
                        placeholderTextColor="#9CA3AF"
                        value={appealReason}
                        onChangeText={setAppealReason}
                        multiline
                        numberOfLines={6}
                        textAlignVertical="top"
                      />
                      <Text style={styles.hintText}>
                        Provide a clear explanation for why this expense should be reconsidered
                      </Text>
                    </View>

                    <View style={styles.formGroup}>
                      <Text style={styles.label}>Supporting Image (Optional)</Text>
                      {appealImageUri ? (
                        <View style={styles.imagePreviewContainer}>
                          <Image source={{ uri: appealImageUri }} style={styles.imagePreview} />
                          <TouchableOpacity 
                            style={styles.removeImageButton}
                            onPress={removeAppealImage}
                          >
                            <Ionicons name="close-circle" size={24} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <TouchableOpacity 
                          style={styles.imagePickerButton}
                          onPress={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleAppealImagePicker();
                          }}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="camera-outline" size={24} color="#2563EB" />
                          <Text style={styles.imagePickerText}>Select Image</Text>
                        </TouchableOpacity>
                      )}
                      <Text style={styles.hintText}>
                        Upload additional supporting documents or images for your appeal
                      </Text>
                    </View>
                  </>
                )}
              </ScrollView>

              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.cancelButton]}
                  onPress={() => !submittingAppeal && closeAppealModal()}
                  disabled={submittingAppeal}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.submitButton, (submittingAppeal || !appealReason.trim()) && styles.submitButtonDisabled]}
                  onPress={() => {
                    console.log('Submit Appeal button pressed', {
                      submittingAppeal,
                      appealReason: appealReason.trim(),
                      appealReasonLength: appealReason.trim().length,
                      hasImage: !!appealImage,
                      imageLength: appealImage?.length || 0
                    });
                    if (!submittingAppeal && appealReason.trim()) {
                      handleAppeal();
                    } else {
                      console.warn('⚠️ Cannot submit:', {
                        submittingAppeal,
                        noReason: !appealReason.trim()
                      });
                    }
                  }}
                  disabled={submittingAppeal || !appealReason.trim()}
                  activeOpacity={0.7}
                >
                  {submittingAppeal ? (
                    <>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={styles.submitButtonText}>Submitting...</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="send-outline" size={18} color="#FFFFFF" />
                      <Text style={styles.submitButtonText}>Submit Appeal</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  titleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
    fontFamily: 'Poppins_700Bold',
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Poppins_400Regular',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  contentScroll: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'Poppins_400Regular',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    fontFamily: 'Poppins_600SemiBold',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
    fontFamily: 'Poppins_400Regular',
  },
  expensesList: {
    padding: 20,
    gap: 16,
    flexDirection: 'column',
  },
  expenseCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  expenseCardGrid: {
    width: '48%',
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
    paddingVertical: 8,
    marginTop: 8,
    marginBottom: 4,
  },
  categoryHeaderText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    flex: 1,
    fontFamily: 'Poppins_700Bold',
  },
  categoryHeaderCount: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  controlsBar: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  segmentedGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  segmentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  segmentButtonActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  segmentText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  segmentTextActive: {
    color: '#2563EB',
    fontWeight: '600',
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  expenseHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    fontFamily: 'Poppins_600SemiBold',
  },
  amountText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Poppins_700Bold',
  },
  descriptionText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 20,
    fontFamily: 'Poppins_400Regular',
  },
  imagesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
  },
  imagesText: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Poppins_400Regular',
  },
  feedbackContainer: {
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  feedbackLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 4,
    fontFamily: 'Poppins_600SemiBold',
  },
  feedbackText: {
    fontSize: 14,
    color: '#78350F',
    lineHeight: 20,
    fontFamily: 'Poppins_400Regular',
  },
  expenseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  dateText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontFamily: 'Poppins_400Regular',
  },
  archiveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  archiveText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '90%',
    maxWidth: 600,
    maxHeight: '90%',
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
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Poppins_700Bold',
  },
  modalBody: {
    padding: 20,
    maxHeight: 500,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    fontFamily: 'Poppins_600SemiBold',
  },
  dropdown: {
    height: 50,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 12,
  },
  dropdownContainer: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#374151',
  },
  dropdownSelectedText: {
    fontSize: 14,
    color: '#111827',
  },
  input: {
    height: 50,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingHorizontal: 12,
    fontSize: 14,
    color: '#111827',
  },
  textArea: {
    height: 100,
    paddingTop: 12,
    paddingBottom: 12,
  },
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    borderStyle: 'dashed',
    gap: 8,
  },
  imagePickerText: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '500',
  },
  imagePreviewContainer: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  confirmCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '90%',
    maxWidth: 420,
    padding: 20,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  confirmText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 16,
  },
  confirmActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  cancelButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: '#2563EB',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
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
  uploadReceiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#2563EB',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    gap: 8,
  },
  uploadReceiptText: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: '600',
  },
  receiptExpenseInfo: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  receiptExpenseLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 4,
  },
  receiptExpenseText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  receiptExpenseDescription: {
    fontSize: 12,
    color: '#6B7280',
  },
  hintText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 6,
    fontStyle: 'italic',
  },
});

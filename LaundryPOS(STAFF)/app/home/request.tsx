import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  ScrollView, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Pressable,
  StyleSheet, 
  Alert,
  ActivityIndicator,
  Modal,
  Image,
  Platform,
  Animated
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Dropdown } from 'react-native-element-dropdown';
import * as ImagePicker from 'expo-image-picker';
import GlobalStyles from '../styles/GlobalStyle';
import ModernSidebar from './components/ModernSidebar';
import Header from './components/Header';
import { API_BASE_URL } from '@/constants/api';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { uploadImageToCloudinary, uploadImagesToCloudinary } from '@/utils/cloudinaryUpload';
import { colors, typography, spacing, borderRadius, cardStyles, buttonStyles, badgeStyles } from '@/app/theme/designSystem';
import { useColors } from '@/app/theme/useColors';
import { useButtonStyles } from '@/app/theme/useButtonStyles';
import { useToast } from '@/app/context/ToastContext';
import { EmptyExpenses } from '@/components/ui/EmptyState';
import StatusBadge from '@/components/ui/StatusBadge';
import { SkeletonCard } from '@/components/ui/SkeletonLoader';

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
}

const categoryOptions = [
  { label: 'Supplies', value: 'Supplies' },
  { label: 'Utilities', value: 'Utilities' },
  { label: 'Maintenance', value: 'Maintenance' },
  { label: 'Salaries', value: 'Salaries' },
  { label: 'Other', value: 'Other' },
];

export default function Request() {
  const { showSuccess, showError, showWarning } = useToast();
  const dynamicColors = useColors();
  const dynamicButtonStyles = useButtonStyles();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected' | 'Appealed'>('All');
  const [showStats, setShowStats] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const spinValue = useRef(new Animated.Value(0)).current;
  
  // Animation values for modals (matching Admin app style)
  const addModalOpacity = useRef(new Animated.Value(0)).current;
  const addModalScale = useRef(new Animated.Value(0.9)).current;
  const receiptModalOpacity = useRef(new Animated.Value(0)).current;
  const receiptModalScale = useRef(new Animated.Value(0.9)).current;
  const appealModalOpacity = useRef(new Animated.Value(0)).current;
  const appealModalScale = useRef(new Animated.Value(0.9)).current;
  
  // Form state
  const [category, setCategory] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [imageUris, setImageUris] = useState<string[]>([]);

  // Receipt upload state
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedExpenseForReceipt, setSelectedExpenseForReceipt] = useState<Expense | null>(null);
  const [receiptImage, setReceiptImage] = useState<string | null>(null); // Store Cloudinary URL
  const [receiptImageUri, setReceiptImageUri] = useState<string | null>(null); // Store local URI for preview
  const [uploadingReceipt, setUploadingReceipt] = useState(false);


  // Appeal modal state
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [selectedExpenseForAppeal, setSelectedExpenseForAppeal] = useState<Expense | null>(null);
  const [appealReason, setAppealReason] = useState('');
  const [appealImage, setAppealImage] = useState<string | null>(null); // Store Cloudinary URL
  const [appealImageUri, setAppealImageUri] = useState<string | null>(null); // Store local URI for preview
  const [submittingAppeal, setSubmittingAppeal] = useState(false);

  // Ref for file input (for web)
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load stats visibility preference from AsyncStorage
  useEffect(() => {
    const loadStatsPreference = async () => {
    try {
        const saved = await AsyncStorage.getItem('request-management-show-stats');
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
        await AsyncStorage.setItem('request-management-show-stats', JSON.stringify(showStats));
      } catch (error) {
        console.error('Error saving stats preference:', error);
      }
  };
    saveStatsPreference();
  }, [showStats]);

  useEffect(() => {
    fetchExpenses();
    
    // Create hidden file input on mount (web only)
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.document) {
      const input = window.document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.multiple = true; // Allow multiple file selection
      input.style.display = 'none';
      input.style.position = 'absolute';
      input.style.opacity = '0';
      input.style.pointerEvents = 'none';
      window.document.body.appendChild(input);
      fileInputRef.current = input as any;
      
      input.onchange = (e: any) => {
        const files = Array.from(e.target.files || []) as File[];
        if (files.length > 0) {
          // Check total image count limit (max 10)
          const currentCount = selectedImages.length;
          if (currentCount + files.length > 10) {
            Alert.alert('Error', `You can only upload up to 10 images. You currently have ${currentCount} image(s).`);
            input.value = ''; // Reset input
            return;
          }

          // Validate all files
          const validFiles: File[] = [];
          const invalidFiles: string[] = [];
          
          files.forEach((file, index) => {
            // Validate file size (max 10MB)
            if (file.size > 10 * 1024 * 1024) {
              invalidFiles.push(`${file.name || `File ${index + 1}`}: Image size must be less than 10MB`);
              return;
            }

            // Validate file type
            if (!file.type.startsWith('image/')) {
              invalidFiles.push(`${file.name || `File ${index + 1}`}: Please select an image file`);
              return;
            }

            validFiles.push(file);
          });

          if (invalidFiles.length > 0) {
            Alert.alert('Error', invalidFiles.join('\n'));
            input.value = ''; // Reset input
            if (validFiles.length === 0) return;
          }

          // Process all valid files
          let processedCount = 0;
          const newImages: string[] = [];
          const newUris: string[] = [];

          validFiles.forEach((file) => {
            const reader = new FileReader();
            reader.onerror = () => {
              processedCount++;
              if (processedCount === validFiles.length) {
                if (newImages.length > 0) {
                  setSelectedImages(prev => [...prev, ...newImages]);
                  setImageUris(prev => [...prev, ...newUris]);
                }
                input.value = ''; // Reset input
              }
            };
            reader.onloadend = () => {
              try {
                const base64 = reader.result as string;
                if (base64) {
                  newImages.push(base64);
                  newUris.push(URL.createObjectURL(file));
                }
              } catch (error) {
                console.error('Error processing image:', error);
              } finally {
                processedCount++;
                if (processedCount === validFiles.length) {
                  if (newImages.length > 0) {
                    setSelectedImages(prev => [...prev, ...newImages]);
                    setImageUris(prev => [...prev, ...newUris]);
                  }
                  input.value = ''; // Reset input
                }
              }
            };
            reader.readAsDataURL(file);
          });
        } else {
          // User cancelled
          input.value = ''; // Reset input
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
      // Clear images - revoke URLs in state update callback
      setImageUris(prev => {
        prev.forEach(uri => URL.revokeObjectURL(uri));
        return [];
      });
      setSelectedImages([]);
      setSubmitting(false);
      
      // Animate modal in (matching Admin app style)
      Animated.parallel([
        Animated.timing(addModalOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(addModalScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate modal out
      Animated.parallel([
        Animated.timing(addModalOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(addModalScale, {
          toValue: 0.9,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showAddModal]);
  
  // Animate receipt modal
  useEffect(() => {
    if (showReceiptModal) {
      Animated.parallel([
        Animated.timing(receiptModalOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(receiptModalScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(receiptModalOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(receiptModalScale, {
          toValue: 0.9,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showReceiptModal]);
  
  // Animate appeal modal
  useEffect(() => {
    if (showAppealModal) {
      Animated.parallel([
        Animated.timing(appealModalOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(appealModalScale, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(appealModalOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(appealModalScale, {
          toValue: 0.9,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showAppealModal]);

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

      const mappedExpenses = expensesArray.map((e: any) => ({
        _id: e._id || e.id,
        category: e.category,
        description: e.description,
        amount: e.amount,
        status: e.status,
        images: Array.isArray(e.images) ? e.images : (e.images ? [e.images] : []), // Ensure it's always an array
        adminFeedback: e.adminFeedback || '',
        appealReason: e.appealReason || '',
        appealedAt: e.appealedAt || '',
        appealImages: Array.isArray(e.appealImages) ? e.appealImages : (e.appealImages ? [e.appealImages] : []), // Ensure it's always an array
        date: e.date || e.createdAt,
      }));
      
      setExpenses(mappedExpenses);
      
      // Debug log to check if images are being fetched
      console.log('📥 Fetched expenses:', mappedExpenses.length);
      mappedExpenses.forEach((e: Expense, idx: number) => {
        if (e.images && e.images.length > 0) {
          console.log(`📸 Expense ${idx + 1} (${e._id}): ${e.images.length} image(s)`, e.images);
        }
      });
    } catch (error: any) {
      console.error('Error fetching expenses:', error);
      showError('Failed to load expense requests');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    if (refreshing) return;
    
    setRefreshing(true);
    spinValue.setValue(0);
    Animated.loop(
      Animated.timing(spinValue, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    ).start();

    try {
      await fetchExpenses();
      showSuccess('Expenses refreshed');
      } catch (error) {
      console.error('Error refreshing expenses:', error);
    } finally {
      setTimeout(() => {
        setRefreshing(false);
        spinValue.stopAnimation();
        spinValue.setValue(0);
      }, 1000);
    }
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
      // For mobile, use expo-image-picker and upload to Cloudinary
      (async () => {
        try {
          // Request permission
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          
          if (status !== 'granted') {
            Alert.alert('Permission needed', 'We need access to your photos to upload images.');
            return;
          }

          // Launch image picker
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false,
            allowsMultipleSelection: !forReceipt, // Multiple for initial proof, single for receipt
            quality: 0.8,
            base64: true,
          });

          if (!result.canceled && result.assets) {
            if (forReceipt) {
              // Single image for receipt
              const asset = result.assets[0];
              if (!asset.base64) {
                Alert.alert('Error', 'Failed to load image data. Please try selecting the image again.');
                return;
              }

              // Show local preview immediately
              setReceiptImageUri(asset.uri);
              setUploadingReceipt(true);
              
              try {
                // Get file extension from URI or default to jpg
                const uriParts = asset.uri.split('.');
                const ext = uriParts.length > 1 ? uriParts[uriParts.length - 1] : 'jpg';
                const mimeType = ext === 'png' ? 'png' : ext === 'gif' ? 'gif' : 'jpeg';
                const base64 = `data:image/${mimeType};base64,${asset.base64}`;
                
                // Upload to Cloudinary
                const fileName = `receipt_${Date.now()}`;
                const cloudinaryUrl = await uploadImageToCloudinary(base64, fileName);
                setReceiptImage(cloudinaryUrl); // Store Cloudinary URL
                showSuccess('Receipt image uploaded successfully');
              } catch (uploadError: any) {
                console.error('Error uploading receipt to Cloudinary:', uploadError);
                const errorMsg = uploadError.response?.data?.message || uploadError.message || 'Failed to upload image. Please check your connection and try again.';
                Alert.alert('Upload Error', errorMsg);
                setReceiptImageUri(null);
              } finally {
                setUploadingReceipt(false);
              }
            } else {
              // Multiple images for initial proof (up to 10 total)
              const currentCount = selectedImages.length;
              const newAssets = result.assets.slice(0, 10 - currentCount);
              
              if (newAssets.length === 0) {
                Alert.alert('Error', 'You can only upload up to 10 images. You currently have 10 image(s).');
                return;
              }

              // Check if all assets have base64
              const assetsWithoutBase64 = newAssets.filter(asset => !asset.base64);
              if (assetsWithoutBase64.length > 0) {
                Alert.alert('Error', `${assetsWithoutBase64.length} image(s) failed to load. Please try selecting them again.`);
                return;
              }

              // Show local previews immediately
              const newUris = newAssets.map(asset => asset.uri);
              setImageUris(prev => [...prev, ...newUris]);

              try {
                // Prepare base64 images for upload
                const base64Images: string[] = [];
                for (const asset of newAssets) {
                  if (asset.base64) {
                    // Get file extension from URI or default to jpg
                    const uriParts = asset.uri.split('.');
                    const ext = uriParts.length > 1 ? uriParts[uriParts.length - 1] : 'jpg';
                    const mimeType = ext === 'png' ? 'png' : ext === 'gif' ? 'gif' : 'jpeg';
                    const base64 = `data:image/${mimeType};base64,${asset.base64}`;
                    base64Images.push(base64);
                  }
                }

                if (base64Images.length > 0) {
                  // Upload to Cloudinary
                  const baseFileName = `expense_${Date.now()}`;
                  console.log('📤 Starting Cloudinary upload for', base64Images.length, 'image(s)...');
                  const cloudinaryUrls = await uploadImagesToCloudinary(base64Images, baseFileName);
                  console.log('✅ Cloudinary upload complete. Received URLs:', cloudinaryUrls);
                  console.log('📝 Current selectedImages before update:', selectedImages);
                  setSelectedImages(prev => {
                    const updated = [...prev, ...cloudinaryUrls];
                    console.log('📝 Updated selectedImages:', updated);
                    return updated;
                  }); // Store Cloudinary URLs
                  showSuccess(`${cloudinaryUrls.length} image(s) uploaded successfully`);
                } else {
                  throw new Error('No images to upload');
                }
              } catch (uploadError: any) {
                console.error('Error uploading images to Cloudinary:', uploadError);
                const errorMsg = uploadError.response?.data?.message || uploadError.message || 'Failed to upload images. Please check your connection and try again.';
                Alert.alert('Upload Error', errorMsg);
                // Remove the previews if upload failed
                setImageUris(prev => prev.slice(0, prev.length - newUris.length));
              }
            }
          }
        } catch (error: any) {
          console.error('Error picking image:', error);
          Alert.alert('Error', error.message || 'Failed to pick image. Please try again.');
        }
      })();
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImageUris(prev => {
      // Revoke the object URL to free memory
      if (prev[index]) {
        URL.revokeObjectURL(prev[index]);
      }
      return prev.filter((_, i) => i !== index);
    });
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

      // Show success toast
      showSuccess('Receipt uploaded successfully!');

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
      hasImage: !!selectedImages && selectedImages.length > 0
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

      // Images are already uploaded to Cloudinary, so we send URLs
      // selectedImages now contains Cloudinary URLs, not base64
      console.log('📋 Preparing expense data. selectedImages:', selectedImages);
      console.log('📋 selectedImages length:', selectedImages.length);
      console.log('📋 selectedImages content:', selectedImages);
      
      const expenseData: any = {
        category: category,
        amount: amountNum,
        description: description.trim(),
        images: selectedImages, // These are Cloudinary URLs now
      };

      console.log('📤 Sending request to:', `${API_BASE_URL}/expenses`);
      console.log('📦 Request payload:', { 
        ...expenseData, 
        images: expenseData.images, // Log actual URLs for debugging
        imagesCount: expenseData.images.length
      });

      const response = await axios.post(`${API_BASE_URL}/expenses`, expenseData, { headers });
      
      console.log('✅ Expense submitted successfully!');
      console.log('📥 Response:', response.data);
      
      // Success toast
      showSuccess('Expense request submitted successfully!');

      // Reset form
      setCategory('');
      setAmount('');
      setDescription('');
      // Revoke all object URLs to free memory
      imageUris.forEach(uri => URL.revokeObjectURL(uri));
      setSelectedImages([]);
      setImageUris([]);
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
        return dynamicColors.primary[400];
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
        // For mobile, use expo-image-picker and upload to Cloudinary
        (async () => {
          try {
            // Request permission
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            
            if (status !== 'granted') {
              Alert.alert('Permission needed', 'We need access to your photos to upload images.');
              return;
            }

            // Launch image picker
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ImagePicker.MediaTypeOptions.Images,
              allowsEditing: false,
              allowsMultipleSelection: false,
              quality: 0.8,
              base64: true,
            });

            if (!result.canceled && result.assets[0]) {
              const asset = result.assets[0];
              if (!asset.base64) {
                Alert.alert('Error', 'Failed to load image data. Please try selecting the image again.');
                return;
              }

              // Show local preview immediately
              setAppealImageUri(asset.uri);
              setSubmittingAppeal(true);
              
              try {
                // Get file extension from URI or default to jpg
                const uriParts = asset.uri.split('.');
                const ext = uriParts.length > 1 ? uriParts[uriParts.length - 1] : 'jpg';
                const mimeType = ext === 'png' ? 'png' : ext === 'gif' ? 'gif' : 'jpeg';
                const base64 = `data:image/${mimeType};base64,${asset.base64}`;
                
                // Upload to Cloudinary
                const fileName = `appeal_${Date.now()}`;
                const cloudinaryUrl = await uploadImageToCloudinary(base64, fileName);
                setAppealImage(cloudinaryUrl); // Store Cloudinary URL
                showSuccess('Appeal image uploaded successfully');
              } catch (uploadError: any) {
                console.error('Error uploading appeal image to Cloudinary:', uploadError);
                const errorMsg = uploadError.response?.data?.message || uploadError.message || 'Failed to upload image. Please check your connection and try again.';
                Alert.alert('Upload Error', errorMsg);
                setAppealImageUri(null);
              } finally {
                setSubmittingAppeal(false);
              }
            }
          } catch (error: any) {
            console.error('Error picking appeal image:', error);
            Alert.alert('Error', error.message || 'Failed to pick image. Please try again.');
          }
        })();
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
        // appealImage is now a Cloudinary URL, not base64
        if (appealImage && typeof appealImage === 'string') {
          console.log('✅ Adding appeal image (Cloudinary URL) to request');
          appealData.appealImages = [appealImage];
        } else {
          console.log('⚠️ No appeal image to add');
          appealData.appealImages = [];
        }

      console.log('📤 Sending appeal request:', {
        url: `${API_BASE_URL}/expenses/${selectedExpenseForAppeal._id}/appeal`,
        expenseId: selectedExpenseForAppeal._id,
        appealReason: appealReason.trim(),
        appealReasonLength: appealReason.trim().length,
        appealImagesCount: appealData.appealImages.length,
        appealImageUrl: appealData.appealImages[0] || 'none',
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

      // Success toast
      showSuccess('Appeal submitted successfully!');

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
        <Header title="Money Request" />


        {/* Page Header */}
        <View style={styles.pageHeader}>
          <View style={styles.titleSection}>
            <Ionicons name="receipt-outline" size={28} color="#111827" style={{ marginRight: 12 }} />
            <View>
              <Text style={styles.pageTitle}>Money Request</Text>
              <Text style={styles.pageSubtitle}>Submit and track your money requests</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <TouchableOpacity 
              style={styles.actionButton} 
              onPress={handleRefresh}
              disabled={refreshing}
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
                  color={refreshing ? "#9CA3AF" : "#6B7280"}
                />
              </Animated.View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleButton, !showStats && [styles.toggleButtonActive, { backgroundColor: dynamicColors.primary[50], borderColor: dynamicColors.primary[500] }]]}
              onPress={() => setShowStats(!showStats)}
              accessibilityLabel={showStats ? "Hide stats" : "Show stats"}
              accessibilityRole="button"
            >
              <Ionicons 
                name={showStats ? "eye-outline" : "eye-off-outline"} 
                size={18} 
                color={showStats ? "#374151" : dynamicColors.primary[500]} 
              />
              <Text style={[styles.toggleButtonText, !showStats && { color: dynamicColors.primary[500] }]}>
                Stats
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewToggleButton, viewMode === 'grid' && [styles.viewToggleButtonActive, { backgroundColor: dynamicColors.primary[50], borderColor: dynamicColors.primary[500] }]]}
              onPress={() => setViewMode('grid')}
              accessibilityLabel="Switch to grid view"
              accessibilityRole="button"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="grid-outline" size={20} color={viewMode === 'grid' ? dynamicColors.primary[500] : '#6B7280'} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.viewToggleButton, viewMode === 'list' && [styles.viewToggleButtonActive, { backgroundColor: dynamicColors.primary[50], borderColor: dynamicColors.primary[500] }]]}
              onPress={() => setViewMode('list')}
              accessibilityLabel="Switch to list view"
              accessibilityRole="button"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="list-outline" size={20} color={viewMode === 'list' ? dynamicColors.primary[500] : '#6B7280'} />
            </TouchableOpacity>
            <TouchableOpacity 
            style={[styles.addButton, dynamicButtonStyles.primary]}
            onPress={() => setShowAddModal(true)}
            accessibilityLabel="Create new expense request"
            accessibilityRole="button"
            accessibilityHint="Opens a form to submit a new money request"
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={[styles.addButtonText, dynamicButtonStyles.primaryText]}>New Request</Text>
          </TouchableOpacity>
          </View>
        </View>

        {/* Summary Cards */}
        {!loading && expenses.length > 0 && showStats && (
          <View style={styles.summaryContainer}>
            <View style={[styles.summaryCard, { borderLeftColor: '#F59E0B' }]}>
              <View style={[styles.summaryIconContainer, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="time-outline" size={20} color="#F59E0B" />
              </View>
              <View style={styles.summaryContent}>
                <Text style={styles.summaryValue}>
                  {expenses.filter(e => e.status === 'Pending').length}
                </Text>
                <Text style={styles.summaryLabel}>Pending</Text>
              </View>
            </View>
            <View style={[styles.summaryCard, { borderLeftColor: '#10B981' }]}>
              <View style={[styles.summaryIconContainer, { backgroundColor: '#D1FAE5' }]}>
                <Ionicons name="checkmark-circle-outline" size={20} color="#10B981" />
              </View>
              <View style={styles.summaryContent}>
                <Text style={styles.summaryValue}>
                  {expenses.filter(e => e.status === 'Approved').length}
                </Text>
                <Text style={styles.summaryLabel}>Approved</Text>
              </View>
            </View>
            <View style={[styles.summaryCard, { borderLeftColor: '#EF4444' }]}>
              <View style={[styles.summaryIconContainer, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="close-circle-outline" size={20} color="#EF4444" />
              </View>
              <View style={styles.summaryContent}>
                <Text style={styles.summaryValue}>
                  {expenses.filter(e => e.status === 'Rejected').length}
                </Text>
                <Text style={styles.summaryLabel}>Rejected</Text>
              </View>
            </View>
            <View style={[styles.summaryCard, { borderLeftColor: dynamicColors.primary[400] }]}>
              <View style={[styles.summaryIconContainer, { backgroundColor: dynamicColors.primary[50] }]}>
                <Ionicons name="cash-outline" size={20} color={dynamicColors.primary[400]} />
              </View>
              <View style={styles.summaryContent}>
                <Text style={styles.summaryValue}>
                  ₱{expenses.reduce((sum, e) => sum + (e.status === 'Approved' ? e.amount : 0), 0).toFixed(2)}
                </Text>
                <Text style={styles.summaryLabel}>Total Approved</Text>
              </View>
            </View>
          </View>
        )}

        {/* Search and Filters */}
        {!loading && expenses.length > 0 && (
          <View style={styles.filtersContainer}>
            <View style={styles.searchContainer}>
              <Ionicons name="search-outline" size={20} color="#6B7280" style={{ marginRight: 12 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search by description, category, or amount..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
                accessibilityLabel="Search expenses"
                accessibilityHint="Type to search expenses by description, category, or amount"
              />
              {searchQuery.length > 0 && (
            <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  accessibilityLabel="Clear search"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                  <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
              )}
            </View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.statusFilterContainer}
              contentContainerStyle={styles.statusFilterContent}
            >
              {(['All', 'Pending', 'Approved', 'Rejected', 'Appealed'] as const).map((status) => (
            <TouchableOpacity
                  key={status}
                  style={[
                    styles.statusFilterButton,
                    statusFilter === status && styles.statusFilterButtonActive,
                    status === 'Pending' && statusFilter === status && { backgroundColor: '#FEF3C7', borderColor: '#F59E0B' },
                    status === 'Approved' && statusFilter === status && { backgroundColor: '#D1FAE5', borderColor: '#10B981' },
                    status === 'Rejected' && statusFilter === status && { backgroundColor: '#FEE2E2', borderColor: '#EF4444' },
                    status === 'Appealed' && statusFilter === status && { backgroundColor: dynamicColors.primary[50], borderColor: dynamicColors.primary[400] },
                  ]}
                  onPress={() => setStatusFilter(status)}
                  accessibilityLabel={`Filter by ${status}`}
              accessibilityRole="button"
                  accessibilityState={{ selected: statusFilter === status }}
            >
                  <Text
                    style={[
                      styles.statusFilterText,
                      statusFilter === status && styles.statusFilterTextActive,
                    ]}
                  >
                    {status}
                  </Text>
                  {statusFilter === status && (
                    <View style={styles.statusFilterBadge}>
                      <Text style={styles.statusFilterBadgeText}>
                        {expenses.filter(e => status === 'All' ? true : e.status === status).length}
                      </Text>
                    </View>
                  )}
            </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Expenses List */}
        <ScrollView style={styles.contentScroll}>
          {loading ? (
            <View style={{ padding: 20, gap: 16 }}>
              {Array.from({ length: 3 }).map((_, index) => (
                <SkeletonCard key={index} />
              ))}
            </View>
          ) : (() => {
            // Filter expenses based on search and status
            const filteredExpenses = expenses.filter((expense) => {
              const matchesSearch = 
                !searchQuery ||
                expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                expense.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
                expense.amount.toString().includes(searchQuery);
              
              const matchesStatus = 
                statusFilter === 'All' ||
                expense.status === statusFilter ||
                (statusFilter === 'Appealed' && expense.appealReason);
              
              return matchesSearch && matchesStatus;
            });

            return filteredExpenses.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={64} color="#D1D5DB" />
                <Text style={styles.emptyText}>
                  {expenses.length === 0 ? 'No expenses yet' : 'No expenses match your filters'}
                </Text>
                <Text style={styles.emptySubtext}>
                  {expenses.length === 0 
                    ? 'Create your first money request to get started'
                    : 'Try adjusting your search or filter criteria'
                  }
                </Text>
                {expenses.length === 0 && (
                  <TouchableOpacity
                    style={[styles.addButton, { marginTop: 16 }, dynamicButtonStyles.primary]}
                    onPress={() => setShowAddModal(true)}
                  >
                    <Ionicons name="add" size={20} color="#FFFFFF" />
                    <Text style={[styles.addButtonText, dynamicButtonStyles.primaryText]}>Create Request</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : viewMode === 'list' ? (
              <View style={styles.expensesListContainer}>
                {filteredExpenses.map((expense) => (
                  <View key={expense._id} style={styles.expenseListItem}>
                    <View style={styles.listItemHeader}>
                      <View style={styles.listItemLeft}>
                        <StatusBadge
                          status={expense.status.toLowerCase() as any}
                          showIcon={true}
                          animated={expense.status === 'Pending'}
                          size="small"
                        />
                        <View style={styles.listItemInfo}>
                          <Text style={styles.listItemCategory}>{expense.category}</Text>
                          <Text style={styles.listItemDescription} numberOfLines={1}>
                            {expense.description}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.listItemAmount}>₱{expense.amount.toFixed(2)}</Text>
                    </View>
                    
                    {expense.images && expense.images.length > 0 && (
                      <View style={styles.listItemImages}>
                        <Ionicons name="image-outline" size={14} color="#6B7280" />
                        <Text style={styles.listItemImagesText}>{expense.images.length} image(s)</Text>
                      </View>
                    )}

                    <View style={styles.listItemFooter}>
                      <Text style={styles.listItemDate}>{formatDate(expense.date)}</Text>
                      {expense.status === 'Approved' && (
                        <TouchableOpacity 
                          style={[styles.listItemActionButton, { borderColor: dynamicColors.primary[500] }]}
                          onPress={() => openReceiptUpload(expense)}
                        >
                          <Ionicons name="camera-outline" size={14} color={dynamicColors.primary[500]} />
                          <Text style={[styles.listItemActionText, { color: dynamicColors.primary[500] }]}>Upload Receipt</Text>
                        </TouchableOpacity>
                      )}
                      {expense.status === 'Rejected' && !expense.appealReason && (
                        <TouchableOpacity 
                          style={[styles.listItemActionButton, { backgroundColor: dynamicColors.primary[400] }]}
                          onPress={() => openAppealModal(expense)}
                        >
                          <Ionicons name="alert-circle-outline" size={14} color="#FFFFFF" />
                          <Text style={[styles.listItemActionText, { color: '#FFFFFF' }]}>Appeal</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {expense.adminFeedback && (
                      <View style={[styles.listItemFeedback, { backgroundColor: dynamicColors.accent[50], borderLeftColor: dynamicColors.accent[500] }]}>
                        <Text style={[styles.listItemFeedbackLabel, { color: dynamicColors.accent[700] }]}>Admin Feedback:</Text>
                        <Text style={[styles.listItemFeedbackText, { color: dynamicColors.accent[800] }]} numberOfLines={2}>
                          {expense.adminFeedback}
                        </Text>
                      </View>
                    )}

                    {expense.appealReason && (
                      <View style={[styles.listItemFeedback, { backgroundColor: dynamicColors.primary[50], borderLeftColor: dynamicColors.primary[400] }]}>
                        <Text style={[styles.listItemFeedbackLabel, { color: '#1E40AF' }]}>
                          Your Appeal: {expense.appealedAt && `(${formatDate(expense.appealedAt)})`}
                        </Text>
                        <Text style={[styles.listItemFeedbackText, { color: '#1E3A8A' }]} numberOfLines={2}>
                          {expense.appealReason}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
          ) : (
            <View style={styles.expensesList}>
                {Object.entries(filteredExpenses.reduce((acc: Record<string, Expense[]>, e) => {
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
                      <StatusBadge
                        status={expense.status.toLowerCase() as any}
                        showIcon={true}
                        animated={expense.status === 'Pending'}
                        size="small"
                      />
                      <Text style={styles.categoryText}>{expense.category}</Text>
                    </View>
                    <Text style={styles.amountText}>₱{expense.amount.toFixed(2)}</Text>
                  </View>

                  <Text style={styles.descriptionText}>{expense.description}</Text>

                  {expense.images && expense.images.length > 0 && (
                    <View style={{ marginTop: 8 }}>
                      <View style={styles.imagesContainer}>
                        <Ionicons name="image-outline" size={16} color="#6B7280" />
                        <Text style={styles.imagesText}>{expense.images.length} image(s) attached</Text>
                      </View>
                      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                        {expense.images.map((img, idx) => {
                          // Ensure img is a valid URL string
                          const imageUrl = typeof img === 'string' ? img : '';
                          if (!imageUrl) {
                            console.warn(`⚠️ Invalid image URL at index ${idx}:`, img);
                            return null;
                          }
                          return (
                            <Image
                              key={idx}
                              source={{ uri: imageUrl }}
                              style={{
                                width: 60,
                                height: 60,
                                borderRadius: 8,
                                backgroundColor: '#F3F4F6'
                              }}
                              resizeMode="cover"
                              onError={(error) => {
                                console.error(`❌ Failed to load image ${idx}:`, imageUrl, error);
                              }}
                              onLoad={() => {
                                console.log(`✅ Loaded image ${idx}:`, imageUrl);
                              }}
                            />
                          );
                        })}
                      </View>
                    </View>
                  )}

                  {expense.adminFeedback && (
                    <View style={[styles.feedbackContainer, { backgroundColor: dynamicColors.accent[50], borderLeftColor: dynamicColors.accent[500] }]}>
                      <Text style={[styles.feedbackLabel, { color: dynamicColors.accent[700] }]}>Admin Feedback:</Text>
                      <Text style={[styles.feedbackText, { color: dynamicColors.accent[800] }]}>{expense.adminFeedback}</Text>
                    </View>
                  )}

                  {expense.appealReason && (
                    <View style={[styles.feedbackContainer, { backgroundColor: dynamicColors.primary[50], borderLeftColor: dynamicColors.primary[400] }]}>
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
                                borderColor: dynamicColors.primary[400]
                              }}
                            />
                          ))}
                        </View>
                      )}
                    </View>
                  )}

                  {expense.status === 'Approved' && (
                    <TouchableOpacity 
                      style={[styles.uploadReceiptButton, { borderColor: dynamicColors.primary[500] }]}
                      onPress={() => openReceiptUpload(expense)}
                    >
                      <Ionicons name="camera-outline" size={16} color={dynamicColors.primary[500]} />
                      <Text style={[styles.uploadReceiptText, { color: dynamicColors.primary[500] }]}>Upload Receipt</Text>
                    </TouchableOpacity>
                  )}

                  {expense.status === 'Rejected' && !expense.appealReason && (
                    <TouchableOpacity 
                      style={[styles.uploadReceiptButton, { backgroundColor: dynamicColors.primary[400] }]}
                      onPress={() => openAppealModal(expense)}
                    >
                      <Ionicons name="alert-circle-outline" size={16} color="#FFFFFF" />
                      <Text style={[styles.uploadReceiptText, { color: '#FFFFFF' }]}>Appeal This Decision</Text>
                    </TouchableOpacity>
                  )}

                  <View style={styles.expenseFooter}>
                    <Text style={styles.dateText}>{formatDate(expense.date)}</Text>
                        </View>
                    </View>
                  ))}
                  </View>
                </View>
              ))}
            </View>
            );
          })()}
        </ScrollView>

        {/* Add Expense Modal */}
        <Modal
          visible={showAddModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => !submitting && setShowAddModal(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => !submitting && setShowAddModal(false)}
          >
            <Animated.View
              style={[
                styles.modalContent,
                {
                  transform: [{ scale: addModalScale }],
                  opacity: addModalOpacity,
                },
              ]}
            >
              <Pressable
                onPress={(e) => e.stopPropagation()}
                style={{ flex: 1 }}
              >
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleContainer}>
                  <Ionicons name="add-circle-outline" size={24} color={dynamicColors.primary[500]} />
                  <Text style={styles.modalTitle}>New Money Request</Text>
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
                  <Text style={styles.label}>Proof Images (Optional)</Text>
                  {imageUris.length > 0 ? (
                    <View style={{ gap: 12 }}>
                      {imageUris.map((uri, index) => (
                        <View key={index} style={styles.imagePreviewContainer}>
                          <Image source={{ uri: uri }} style={styles.imagePreview} />
                          <TouchableOpacity 
                            style={styles.removeImageButton}
                            onPress={() => removeImage(index)}
                          >
                            <Ionicons name="close-circle" size={24} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      ))}
                      {imageUris.length < 10 && (
                        <TouchableOpacity 
                          style={[styles.imagePickerButton, { height: 80 }]}
                          onPress={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('Image picker button pressed');
                            handleImagePicker(false);
                          }}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="add-circle-outline" size={20} color={dynamicColors.primary[500]} />
                          <Text style={[styles.imagePickerText, { color: dynamicColors.primary[500] }]}>Add More Images ({imageUris.length}/10)</Text>
                        </TouchableOpacity>
                      )}
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
                      <Ionicons name="camera-outline" size={24} color={dynamicColors.primary[500]} />
                      <Text style={[styles.imagePickerText, { color: dynamicColors.primary[500] }]}>Select Images (Up to 10)</Text>
                    </TouchableOpacity>
                  )}
                  {Platform.OS === 'web' && typeof window === 'undefined' && (
                    <Text style={styles.hintText}>
                      ⚠️ Image upload may not work in this environment
                    </Text>
                  )}
                  {imageUris.length > 0 && (
                    <Text style={styles.hintText}>
                      {imageUris.length} image(s) selected. You can add up to 10 images total.
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
                  style={[styles.modalButton, styles.submitButton, { backgroundColor: dynamicColors.primary[500] }, submitting && styles.submitButtonDisabled]}
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
              </Pressable>
            </Animated.View>
        </Pressable>
      </Modal>

        {/* Upload Receipt Modal */}
        <Modal
          visible={showReceiptModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => !uploadingReceipt && closeReceiptModal()}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => !uploadingReceipt && closeReceiptModal()}
          >
            <Animated.View
              style={[
                styles.modalContent,
                {
                  transform: [{ scale: receiptModalScale }],
                  opacity: receiptModalOpacity,
                },
              ]}
            >
              <Pressable
                onPress={(e) => e.stopPropagation()}
                style={{ flex: 1 }}
              >
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleContainer}>
                  <Ionicons name="receipt-outline" size={24} color={dynamicColors.primary[500]} />
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
                      <Ionicons name="camera-outline" size={24} color={dynamicColors.primary[500]} />
                      <Text style={[styles.imagePickerText, { color: dynamicColors.primary[500] }]}>Select Receipt Image</Text>
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
                  style={[styles.modalButton, styles.submitButton, { backgroundColor: dynamicColors.primary[500] }, (!receiptImage || uploadingReceipt) && styles.submitButtonDisabled]}
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
              </Pressable>
            </Animated.View>
          </Pressable>
        </Modal>

        {/* Appeal Modal */}
        <Modal
          visible={showAppealModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => !submittingAppeal && closeAppealModal()}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => !submittingAppeal && closeAppealModal()}
          >
            <Animated.View
              style={[
                styles.modalContent,
                {
                  transform: [{ scale: appealModalScale }],
                  opacity: appealModalOpacity,
                },
              ]}
            >
              <Pressable
                onPress={(e) => e.stopPropagation()}
                style={{ flex: 1 }}
              >
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleContainer}>
                  <Ionicons name="alert-circle-outline" size={24} color={dynamicColors.primary[400]} />
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
                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#111827', marginBottom: 4 }}>
                          {selectedExpenseForAppeal.description}
                        </Text>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: dynamicColors.primary[500], marginBottom: 4 }}>
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
                        <View style={{ padding: 12, backgroundColor: dynamicColors.accent[50], borderRadius: 8, borderLeftWidth: 4, borderLeftColor: dynamicColors.accent[500] }}>
                          <Text style={{ fontSize: 14, color: dynamicColors.accent[800] }}>
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
                          <Ionicons name="camera-outline" size={24} color={dynamicColors.primary[500]} />
                          <Text style={[styles.imagePickerText, { color: dynamicColors.primary[500] }]}>Select Image</Text>
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
                  style={[styles.modalButton, styles.submitButton, { backgroundColor: dynamicColors.primary[500] }, (submittingAppeal || !appealReason.trim()) && styles.submitButtonDisabled]}
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
              </Pressable>
            </Animated.View>
          </Pressable>
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
    ...typography.h2,
    marginBottom: spacing.xs,
  },
  pageSubtitle: {
    ...typography.body,
    color: colors.text.secondary,
  },
  addButton: {
    // ...buttonStyles.primary, // Now using dynamic button styles
  },
  addButtonText: {
    // ...buttonStyles.primaryText, // Now using dynamic button styles
  },
  viewToggleButton: {
    minWidth: 44,
    minHeight: 44,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewToggleButtonActive: {
    backgroundColor: '#EFF6FF',
    // borderColor: '#2563EB', // Now using dynamic color via inline style
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
    minHeight: 44,
    minWidth: 44,
    justifyContent: 'center',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
  },
  toggleButtonActive: {
    backgroundColor: '#EFF6FF',
    // borderColor: '#2563EB', // Now using dynamic color via inline style
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
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  summaryCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderLeftWidth: 4,
    gap: 12,
  },
  summaryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryContent: {
    flex: 1,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Poppins_700Bold',
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontFamily: 'Poppins_400Regular',
  },
  filtersContainer: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    paddingBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
    fontFamily: 'Poppins_400Regular',
    padding: 0,
  },
  statusFilterContainer: {
    maxHeight: 50,
  },
  statusFilterContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  statusFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    gap: 8,
    minHeight: 44,
  },
  statusFilterButtonActive: {
    borderWidth: 2,
  },
  statusFilterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    fontFamily: 'Poppins_500Medium',
  },
  statusFilterTextActive: {
    fontWeight: '600',
    color: '#111827',
    fontFamily: 'Poppins_600SemiBold',
  },
  statusFilterBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  statusFilterBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Poppins_700Bold',
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
  expensesListContainer: {
    padding: 16,
    gap: 12,
  },
  expenseListItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 4,
  },
  listItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  listItemInfo: {
    flex: 1,
  },
  listItemCategory: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
    fontFamily: 'Poppins_600SemiBold',
  },
  listItemDescription: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    fontFamily: 'Poppins_400Regular',
  },
  listItemAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'Poppins_700Bold',
  },
  listItemImages: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  listItemImagesText: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: 'Poppins_400Regular',
  },
  listItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  listItemDate: {
    fontSize: 12,
    color: '#9CA3AF',
    fontFamily: 'Poppins_400Regular',
  },
  listItemActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
    borderWidth: 1,
    // borderColor: '#2563EB', // Now using dynamic color via inline style
    minHeight: 36,
    minWidth: 44,
  },
  listItemActionText: {
    fontSize: 12,
    // color: '#2563EB', // Now using dynamic color via inline style
    fontWeight: '600',
    fontFamily: 'Poppins_600SemiBold',
  },
  listItemFeedback: {
    marginTop: 12,
    padding: 10,
    // backgroundColor: '#FEF3C7', // Now using dynamic color via inline style
    borderRadius: 6,
    borderLeftWidth: 3,
    // borderLeftColor: '#F59E0B', // Now using dynamic color via inline style
  },
  listItemFeedbackLabel: {
    fontSize: 11,
    fontWeight: '600',
    // color: '#92400E', // Now using dynamic color via inline style
    marginBottom: 4,
    fontFamily: 'Poppins_600SemiBold',
  },
  listItemFeedbackText: {
    fontSize: 12,
    // color: '#78350F', // Now using dynamic color via inline style
    lineHeight: 16,
    fontFamily: 'Poppins_400Regular',
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
    // backgroundColor: '#FEF3C7', // Now using dynamic color via inline style
    borderRadius: 8,
    borderLeftWidth: 4,
    // borderLeftColor: '#F59E0B', // Now using dynamic color via inline style
  },
  feedbackLabel: {
    fontSize: 12,
    fontWeight: '600',
    // color: '#92400E', // Now using dynamic color via inline style
    marginBottom: 4,
    fontFamily: 'Poppins_600SemiBold',
  },
  feedbackText: {
    fontSize: 14,
    // color: '#78350F', // Now using dynamic color via inline style
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: '100%',
    maxWidth: 600,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 25,
    elevation: 8,
    maxHeight: '90%',
    alignSelf: 'center',
    marginTop: 'auto',
    marginBottom: 'auto',
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
    // color: '#2563EB', // Now using dynamic color via inline style
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
    // backgroundColor: '#2563EB', // Now using dynamic color via inline style
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
  uploadReceiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    // borderColor: '#2563EB', // Now using dynamic color via inline style
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 12,
    gap: 8,
  },
  uploadReceiptText: {
    // color: '#2563EB', // Now using dynamic color via inline style
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

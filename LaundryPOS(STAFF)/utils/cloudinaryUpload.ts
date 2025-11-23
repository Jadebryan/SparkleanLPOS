/**
 * Cloudinary Upload Utility for Mobile
 * Uploads images to Cloudinary via backend API
 */

import { API_BASE_URL } from '@/constants/api';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Upload a single image to Cloudinary via backend
 * @param base64Image - Base64 encoded image string (data:image/...;base64,...)
 * @param fileName - Name for the file (without extension)
 * @returns Promise<string> - Cloudinary URL
 */
export const uploadImageToCloudinary = async (
  base64Image: string,
  fileName: string
): Promise<string> => {
  try {
    const token = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('userToken');
    
    if (!token) {
      throw new Error('Authentication required. Please log in again.');
    }

    console.log('📤 Uploading image to Cloudinary via backend...');

    const response = await axios.post(
      `${API_BASE_URL}/upload/image`,
      {
        image: base64Image,
        fileName: fileName
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (response.data.success && response.data.url) {
      console.log('✅ Image uploaded to Cloudinary:', response.data.url);
      return response.data.url;
    } else {
      throw new Error(response.data.message || 'Failed to upload image');
    }
  } catch (error: any) {
    console.error('❌ Error uploading image to Cloudinary:', error);
    
    if (error.response?.status === 401) {
      throw new Error('Authentication failed. Please log in again.');
    }
    
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    
    throw new Error(error.message || 'Failed to upload image. Please check your connection and try again.');
  }
};

/**
 * Upload multiple images to Cloudinary via backend
 * @param base64Images - Array of base64 encoded image strings
 * @param baseFileName - Base name for files (will be appended with index)
 * @returns Promise<string[]> - Array of Cloudinary URLs
 */
export const uploadImagesToCloudinary = async (
  base64Images: string[],
  baseFileName: string
): Promise<string[]> => {
  try {
    const token = await AsyncStorage.getItem('token') || await AsyncStorage.getItem('userToken');
    
    if (!token) {
      throw new Error('Authentication required. Please log in again.');
    }

    console.log(`📤 Uploading ${base64Images.length} image(s) to Cloudinary via backend...`);

    const response = await axios.post(
      `${API_BASE_URL}/upload/images`,
      {
        images: base64Images,
        baseFileName: baseFileName
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );

    if (response.data.success && response.data.urls) {
      console.log(`✅ ${response.data.urls.length} image(s) uploaded to Cloudinary`);
      return response.data.urls;
    } else {
      throw new Error(response.data.message || 'Failed to upload images');
    }
  } catch (error: any) {
    console.error('❌ Error uploading images to Cloudinary:', error);
    
    if (error.response?.status === 401) {
      throw new Error('Authentication failed. Please log in again.');
    }
    
    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }
    
    throw new Error(error.message || 'Failed to upload images. Please check your connection and try again.');
  }
};


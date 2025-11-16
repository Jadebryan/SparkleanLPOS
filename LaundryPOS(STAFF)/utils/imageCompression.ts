// Image compression utility for Staff app
// Compresses images before upload to reduce file size and improve upload speed

interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0.0 to 1.0
  format?: 'jpeg' | 'png';
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.8,
  format: 'jpeg',
};

/**
 * Compress an image file (base64 or File object)
 * For web: Uses canvas API
 * For mobile: Would use expo-image-manipulator (requires installation)
 */
export const compressImage = async (
  imageSource: string | File,
  options: CompressionOptions = {}
): Promise<string> => {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Handle File object (web)
  if (typeof File !== 'undefined' && imageSource instanceof File) {
    return compressImageFile(imageSource, opts);
  }

  // Handle base64 string
  if (typeof imageSource === 'string') {
    return compressBase64Image(imageSource, opts);
  }

  throw new Error('Unsupported image source type');
};

/**
 * Compress image from File object (web)
 */
const compressImageFile = async (
  file: File,
  options: CompressionOptions
): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.FileReader) {
      reject(new Error('FileReader not available'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      compressBase64Image(result, options)
        .then(resolve)
        .catch(reject);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Compress base64 image using canvas (web)
 */
const compressBase64Image = async (
  base64: string,
  options: CompressionOptions
): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.Image) {
      // If canvas is not available, return original
      resolve(base64);
      return;
    }

    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions while maintaining aspect ratio
        if (width > options.maxWidth! || height > options.maxHeight!) {
          const ratio = Math.min(
            options.maxWidth! / width,
            options.maxHeight! / height
          );
          width = width * ratio;
          height = height * ratio;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        const compressedBase64 = canvas.toDataURL(
          `image/${options.format}`,
          options.quality
        );

        resolve(compressedBase64);
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = base64;
  });
};

/**
 * Get image file size in KB
 */
export const getImageSize = (base64: string): number => {
  // Remove data URL prefix if present
  const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
  const sizeInBytes = (base64Data.length * 3) / 4;
  return sizeInBytes / 1024; // Return size in KB
};

/**
 * Check if image needs compression (if size > threshold)
 */
export const shouldCompress = (base64: string, thresholdKB: number = 500): boolean => {
  return getImageSize(base64) > thresholdKB;
};

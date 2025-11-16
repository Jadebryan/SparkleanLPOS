const cloudinary = require('cloudinary').v2;

/**
 * Cloudinary Service for uploading images
 * 
 * Setup Instructions:
 * 1. Sign up for free account at https://cloudinary.com/
 * 2. Get your credentials from the Dashboard
 * 3. Add to .env file:
 *    - CLOUDINARY_CLOUD_NAME=your_cloud_name
 *    - CLOUDINARY_API_KEY=your_api_key
 *    - CLOUDINARY_API_SECRET=your_api_secret
 */

class CloudinaryService {
  constructor() {
    this.initialized = false;
  }

  /**
   * Initialize Cloudinary client
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
      const apiKey = process.env.CLOUDINARY_API_KEY;
      const apiSecret = process.env.CLOUDINARY_API_SECRET;

      if (!cloudName || !apiKey || !apiSecret) {
        console.warn('⚠️  Cloudinary credentials not found. Image uploads will be disabled.');
        console.warn('⚠️  To enable Cloudinary, set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your .env file');
        this.initialized = false;
        return;
      }

      // Trim and validate cloud name (no spaces allowed)
      const cleanCloudName = cloudName.trim();
      if (cleanCloudName.includes(' ')) {
        throw new Error(
          `Invalid cloud_name: "${cleanCloudName}". Cloud names cannot contain spaces. ` +
          `Please use your actual Cloudinary cloud name from the dashboard (usually lowercase, e.g., "dxy123abc").`
        );
      }

      cloudinary.config({
        cloud_name: cleanCloudName,
        api_key: apiKey.trim(),
        api_secret: apiSecret.trim(),
      });

      this.initialized = true;
      console.log('✅ Cloudinary service initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Cloudinary service:', error.message);
      this.initialized = false;
    }
  }

  /**
   * Convert base64 string to buffer
   */
  base64ToBuffer(base64String) {
    // Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
    const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
    return Buffer.from(base64Data, 'base64');
  }

  /**
   * Get file extension from base64 data URL
   */
  getFileExtension(base64String) {
    const mimeMatch = base64String.match(/data:image\/(\w+);base64,/);
    if (mimeMatch) {
      const ext = mimeMatch[1];
      return ext === 'jpeg' ? 'jpg' : ext;
    }
    return 'jpg';
  }

  /**
   * Upload a single image to Cloudinary
   * @param {string} base64Image - Base64 encoded image string
   * @param {string} fileName - Name for the file (without extension)
   * @returns {Promise<string>} - Public URL of the uploaded file
   */
  async uploadImage(base64Image, fileName) {
    await this.initialize();

    if (!this.initialized) {
      const missingVars = [];
      if (!process.env.CLOUDINARY_CLOUD_NAME) missingVars.push('CLOUDINARY_CLOUD_NAME');
      if (!process.env.CLOUDINARY_API_KEY) missingVars.push('CLOUDINARY_API_KEY');
      if (!process.env.CLOUDINARY_API_SECRET) missingVars.push('CLOUDINARY_API_SECRET');
      
      throw new Error(
        `Cloudinary is not configured. Missing environment variables: ${missingVars.join(', ')}. ` +
        `Please sign up at https://cloudinary.com/ and add your credentials to the .env file.`
      );
    }

    if (!base64Image) {
      throw new Error('Image data is required');
    }

    try {
      const fileExtension = this.getFileExtension(base64Image);
      
      // Upload base64 directly to Cloudinary
      // Cloudinary accepts base64 strings directly
      const result = await cloudinary.uploader.upload(base64Image, {
        folder: 'laundry-pos', // Organize images in a folder
        public_id: fileName, // File name without extension
        resource_type: 'image',
        format: fileExtension,
      });

      // Return the secure URL (HTTPS)
      return result.secure_url;
    } catch (error) {
      console.error('❌ Error uploading image to Cloudinary:', error);
      throw new Error(`Failed to upload image to Cloudinary: ${error.message}`);
    }
  }

  /**
   * Upload multiple images to Cloudinary
   * @param {string[]} base64Images - Array of base64 encoded image strings
   * @param {string} baseFileName - Base name for files (will be appended with index)
   * @returns {Promise<string[]>} - Array of public URLs
   */
  async uploadImages(base64Images, baseFileName) {
    if (!Array.isArray(base64Images) || base64Images.length === 0) {
      return [];
    }

    try {
      const uploadPromises = base64Images.map((image, index) => {
        const fileName = `${baseFileName}_${index + 1}`;
        return this.uploadImage(image, fileName);
      });

      const urls = await Promise.all(uploadPromises);
      return urls;
    } catch (error) {
      console.error('Error uploading images to Cloudinary:', error);
      throw error;
    }
  }

  /**
   * Delete an image from Cloudinary by URL
   * @param {string} imageUrl - Cloudinary image URL
   */
  async deleteImage(imageUrl) {
    try {
      await this.initialize();
      
      if (!this.initialized) {
        console.warn('⚠️  Cloudinary not initialized, cannot delete image');
        return;
      }

      // Extract public_id from URL
      // Cloudinary URLs format: https://res.cloudinary.com/{cloud_name}/image/upload/{public_id}.{format}
      const urlMatch = imageUrl.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
      if (urlMatch && urlMatch[1]) {
        const publicId = urlMatch[1].replace(/\.[^.]+$/, ''); // Remove extension
        await cloudinary.uploader.destroy(publicId);
        console.log(`✅ Deleted image from Cloudinary: ${publicId}`);
      }
    } catch (error) {
      console.error('Error deleting image from Cloudinary:', error);
      // Don't throw - deletion failures shouldn't break the app
    }
  }
}

// Export singleton instance
module.exports = new CloudinaryService();


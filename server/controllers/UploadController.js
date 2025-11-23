const cloudinaryService = require('../utils/cloudinaryService');
const { authenticate } = require('../middleware/auth');

class UploadController {
  /**
   * Upload a single image to Cloudinary
   * POST /api/upload/image
   * Body: { image: base64String, fileName: string }
   */
  static async uploadImage(req, res) {
    try {
      const { image, fileName } = req.body;

      if (!image) {
        return res.status(400).json({
          success: false,
          message: 'Image data is required'
        });
      }

      const uploadFileName = fileName || `image_${Date.now()}`;
      const url = await cloudinaryService.uploadImage(image, uploadFileName);

      res.status(200).json({
        success: true,
        url: url,
        message: 'Image uploaded successfully'
      });
    } catch (error) {
      console.error('Upload image error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to upload image'
      });
    }
  }

  /**
   * Upload multiple images to Cloudinary
   * POST /api/upload/images
   * Body: { images: [base64String], baseFileName: string }
   */
  static async uploadImages(req, res) {
    try {
      const { images, baseFileName } = req.body;

      if (!images || !Array.isArray(images) || images.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Images array is required'
        });
      }

      const uploadBaseFileName = baseFileName || `images_${Date.now()}`;
      const urls = await cloudinaryService.uploadImages(images, uploadBaseFileName);

      res.status(200).json({
        success: true,
        urls: urls,
        message: `${urls.length} image(s) uploaded successfully`
      });
    } catch (error) {
      console.error('Upload images error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to upload images'
      });
    }
  }
}

module.exports = UploadController;


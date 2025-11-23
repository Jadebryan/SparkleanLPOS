const express = require('express');
const UploadController = require('../controllers/UploadController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// All upload routes require authentication
router.use(authenticate);

// Upload single image
router.post('/image', UploadController.uploadImage);

// Upload multiple images
router.post('/images', UploadController.uploadImages);

module.exports = router;


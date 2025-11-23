const Expense = require('../models/ExpenseModel');
const User = require('../models/UserModel');
const NotificationController = require('./NotificationController');
const cloudinaryService = require('../utils/cloudinaryService');

class ExpenseController {
  // Get all expenses with role-based filtering
  static async getAllExpenses(req, res) {
    try {
      const { search, category, status, showArchived = false } = req.query;

      const query = {};
      
      if (showArchived === 'true') {
        query.isArchived = true;
      } else {
        query.isArchived = false;
      }

      // Staff can only see their own expenses
      if (req.user.role === 'staff') {
        query.requestedBy = req.user._id;
      }

      if (search) {
        query.$or = [
          { description: { $regex: search, $options: 'i' } }
        ];
      }

      if (category && category !== 'All') {
        query.category = category;
      }

      if (status && status !== 'All') {
        query.status = status;
      }

      const expenses = await Expense.find(query)
        .populate('requestedBy', 'username email stationId')
        .populate('approvedBy', 'username email')
        .sort({ date: -1 });

      res.status(200).json({
        success: true,
        data: expenses,
        count: expenses.length
      });
    } catch (error) {
      console.error('Get all expenses error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get single expense
  static async getExpense(req, res) {
    try {
      const { id } = req.params;
      const expense = await Expense.findById(id)
        .populate('requestedBy', 'username email stationId')
        .populate('approvedBy', 'username email');

      if (!expense) {
        return res.status(404).json({
          success: false,
          message: 'Expense not found'
        });
      }

      // Staff can only view their own expenses
      if (req.user.role === 'staff' && expense.requestedBy._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only view your own expenses.'
        });
      }

      res.status(200).json({
        success: true,
        data: expense
      });
    } catch (error) {
      console.error('Get expense error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Create expense (both admin and staff can create)
  static async createExpense(req, res) {
    try {
      const { date, category, description, amount, receipt, images } = req.body;

      if (!category || !description || !amount) {
        return res.status(400).json({
          success: false,
          message: 'Category, description, and amount are required'
        });
      }

      // Handle images - check if they're already Cloudinary URLs or need to be uploaded
      let imageUrls = [];
      if (images && Array.isArray(images) && images.length > 0) {
        console.log(`📸 Received ${images.length} image(s) for expense creation`);
        
        // Check if images are already Cloudinary URLs (from mobile upload) or base64 (from web)
        const cloudinaryUrls = images.filter(img => 
          typeof img === 'string' && img.startsWith('https://res.cloudinary.com')
        );
        const base64Images = images.filter(img => 
          typeof img === 'string' && (img.startsWith('data:image/') || !img.startsWith('http'))
        );

        console.log(`📸 Found ${cloudinaryUrls.length} Cloudinary URL(s) and ${base64Images.length} base64 image(s)`);

        // Use Cloudinary URLs directly if provided
        if (cloudinaryUrls.length > 0) {
          imageUrls = cloudinaryUrls;
          console.log(`✅ Using ${imageUrls.length} pre-uploaded Cloudinary URL(s) for expense`);
        }

        // Upload base64 images if any
        if (base64Images.length > 0) {
          try {
            const expenseId = `expense_${Date.now()}`;
            const baseFileName = `expense_${expenseId}_${category}_${amount}`;
            const uploadedUrls = await cloudinaryService.uploadImages(base64Images, baseFileName);
            imageUrls = [...imageUrls, ...uploadedUrls];
            console.log(`✅ Uploaded ${uploadedUrls.length} base64 image(s) to Cloudinary for expense`);
          } catch (uploadError) {
            console.error('Error uploading images to Cloudinary:', uploadError);
            return res.status(500).json({
              success: false,
              message: 'Failed to upload images. Please try again.'
            });
          }
        }

        console.log(`📸 Final imageUrls count: ${imageUrls.length}`);
      }

      const expense = new Expense({
        date: date || new Date(),
        category,
        description,
        amount,
        requestedBy: req.user._id,
        receipt: receipt || '',
        images: imageUrls, // Store Cloudinary URLs instead of base64
        status: 'Pending',
        stationId: req.user.stationId || null
      });

      await expense.save();
      await expense.populate('requestedBy', 'username email');

      // Notify admins about new expense request
      try {
        const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
        const notifyPromises = admins.map(a => 
          NotificationController.createNotification(
            a._id,
            'expense',
            'New Expense Request',
            `${req.user.username || 'Staff'} submitted an expense request (${category})`,
            expense._id.toString(),
            { amount }
          )
        );
        await Promise.all(notifyPromises);
      } catch (notifyErr) {
        console.error('Notification (new expense) error:', notifyErr);
      }

      res.status(201).json({
        success: true,
        message: 'Expense request created successfully',
        data: expense
      });
    } catch (error) {
      console.error('Create expense error:', error);
      
      if (error.name === 'ValidationError') {
        const errors = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors
        });
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Update expense (only requester can update, and only if pending)
  static async updateExpense(req, res) {
    try {
      const { id } = req.params;
      const { date, category, description, amount, receipt, images } = req.body;

      const expense = await Expense.findById(id);

      if (!expense) {
        return res.status(404).json({
          success: false,
          message: 'Expense not found'
        });
      }

      // Only requester can update, and only if status is Pending
      if (expense.requestedBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only update your own expense requests'
        });
      }

      if (expense.status !== 'Pending') {
        return res.status(400).json({
          success: false,
          message: 'Only pending expenses can be updated'
        });
      }

      if (date) expense.date = date;
      if (category) expense.category = category;
      if (description) expense.description = description;
      if (amount !== undefined) expense.amount = amount;
      if (receipt !== undefined) expense.receipt = receipt;
      // Upload images to Cloudinary if provided
      if (images !== undefined && Array.isArray(images) && images.length > 0) {
        try {
          const expenseId = expense._id.toString();
          const baseFileName = `expense_${expenseId}_${category || expense.category}_${amount || expense.amount}`;
          const imageUrls = await cloudinaryService.uploadImages(images, baseFileName);
          expense.images = imageUrls;
          console.log(`✅ Uploaded ${imageUrls.length} images to Cloudinary for expense update`);
        } catch (uploadError) {
          console.error('Error uploading images to Cloudinary:', uploadError);
          return res.status(500).json({
            success: false,
            message: 'Failed to upload images. Please try again.'
          });
        }
      } else if (images !== undefined) {
        expense.images = [];
      }

      await expense.save();
      await expense.populate('requestedBy', 'username email');

      res.status(200).json({
        success: true,
        message: 'Expense updated successfully',
        data: expense
      });
    } catch (error) {
      console.error('Update expense error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Approve expense (admin only)
  static async approveExpense(req, res) {
    try {
      const { id } = req.params;
      const { adminFeedback } = req.body;

      const expense = await Expense.findById(id);

      if (!expense) {
        return res.status(404).json({
          success: false,
          message: 'Expense not found'
        });
      }

      if (expense.status !== 'Pending' && expense.status !== 'Appealed') {
        return res.status(400).json({
          success: false,
          message: 'Only pending or appealed expenses can be approved'
        });
      }

      const wasAppealed = expense.status === 'Appealed';

      expense.status = 'Approved';
      expense.approvedBy = req.user._id;
      expense.approvedAt = new Date();
      if (adminFeedback) expense.adminFeedback = adminFeedback;
      
      // Clear appeal fields if approving an appealed expense
      if (wasAppealed) {
        expense.appealReason = '';
        expense.appealedAt = null;
        expense.appealImages = [];
      }

      await expense.save();
      await expense.populate('requestedBy', 'username email stationId');
      await expense.populate('approvedBy', 'username email');

      // Notify requester about approval
      try {
        await NotificationController.createNotification(
          expense.requestedBy._id,
          'expense',
          'Expense Approved',
          `Your expense request (${expense.category}) was approved`,
          expense._id.toString(),
          { amount: expense.amount }
        );
      } catch (notifyErr) {
        console.error('Notification (expense approved) error:', notifyErr);
      }

      res.status(200).json({
        success: true,
        message: 'Expense approved successfully',
        data: expense
      });
    } catch (error) {
      console.error('Approve expense error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Reject expense (admin only)
  static async rejectExpense(req, res) {
    try {
      const { id } = req.params;
      const { rejectionReason, adminFeedback } = req.body;

      // Require adminFeedback when rejecting
      if (!adminFeedback || !adminFeedback.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Feedback is required when rejecting an expense request'
        });
      }

      const expense = await Expense.findById(id);

      if (!expense) {
        return res.status(404).json({
          success: false,
          message: 'Expense not found'
        });
      }

      const wasAppealed = expense.status === 'Appealed';
      
      if (expense.status !== 'Pending' && !wasAppealed) {
        return res.status(400).json({
          success: false,
          message: 'Only pending or appealed expenses can be rejected'
        });
      }

      expense.status = 'Rejected';
      // Clear approvedBy when rejecting (it should only exist for approved expenses)
      expense.approvedBy = null;
      expense.approvedAt = null;
      expense.rejectionReason = rejectionReason || adminFeedback;
      expense.adminFeedback = adminFeedback.trim();
      // Reset appeal fields if rejecting an appealed expense
      if (wasAppealed) {
        expense.appealReason = '';
        expense.appealedAt = null;
        expense.appealImages = [];
      }

      await expense.save();
      await expense.populate('requestedBy', 'username email stationId');
      await expense.populate('approvedBy', 'username email');

      // Notify requester about rejection
      try {
        await NotificationController.createNotification(
          expense.requestedBy._id,
          'expense',
          'Expense Rejected',
          `Your expense request (${expense.category}) was rejected`,
          expense._id.toString(),
          { reason: expense.rejectionReason }
        );
      } catch (notifyErr) {
        console.error('Notification (expense rejected) error:', notifyErr);
      }

      res.status(200).json({
        success: true,
        message: 'Expense rejected successfully',
        data: expense
      });
    } catch (error) {
      console.error('Reject expense error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Add feedback to expense (admin only) - can be used for approved expenses too
  static async addFeedback(req, res) {
    try {
      const { id } = req.params;
      const { adminFeedback } = req.body;

      if (!adminFeedback || !adminFeedback.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Feedback is required'
        });
      }

      const expense = await Expense.findById(id);

      if (!expense) {
        return res.status(404).json({
          success: false,
          message: 'Expense not found'
        });
      }

      expense.adminFeedback = adminFeedback.trim();
      await expense.save();
      await expense.populate('requestedBy', 'username email stationId');
      await expense.populate('approvedBy', 'username email');

      res.status(200).json({
        success: true,
        message: 'Feedback added successfully',
        data: expense
      });
    } catch (error) {
      console.error('Add feedback error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Upload receipt to approved expense (staff can add receipts after approval)
  static async uploadReceipt(req, res) {
    try {
      const { id } = req.params;
      const { images, receipt } = req.body;

      const expense = await Expense.findById(id);

      if (!expense) {
        return res.status(404).json({
          success: false,
          message: 'Expense not found'
        });
      }

      // Only requester can upload receipt
      if (expense.requestedBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only upload receipts for your own expense requests'
        });
      }

      // Only allow receipt upload for approved expenses
      if (expense.status !== 'Approved') {
        return res.status(400).json({
          success: false,
          message: 'Receipts can only be uploaded for approved expenses'
        });
      }

      // Handle receipt images - check if they're already Cloudinary URLs or need to be uploaded
      if (images && Array.isArray(images) && images.length > 0) {
        // Check if images are already Cloudinary URLs (from mobile upload) or base64 (from web)
        const cloudinaryUrls = images.filter(img => 
          typeof img === 'string' && img.startsWith('https://res.cloudinary.com')
        );
        const base64Images = images.filter(img => 
          typeof img === 'string' && (img.startsWith('data:image/') || !img.startsWith('http'))
        );

        let receiptUrls = [];

        // Use Cloudinary URLs directly if provided
        if (cloudinaryUrls.length > 0) {
          receiptUrls = cloudinaryUrls;
          console.log(`✅ Using ${receiptUrls.length} pre-uploaded Cloudinary URL(s) for receipt`);
        }

        // Upload base64 images if any
        if (base64Images.length > 0) {
          try {
            const expenseId = expense._id.toString();
            const baseFileName = `receipt_${expenseId}_${Date.now()}`;
            const uploadedUrls = await cloudinaryService.uploadImages(base64Images, baseFileName);
            receiptUrls = [...receiptUrls, ...uploadedUrls];
            console.log(`✅ Uploaded ${uploadedUrls.length} base64 receipt image(s) to Cloudinary`);
          } catch (uploadError) {
            console.error('Error uploading receipt images to Cloudinary:', uploadError);
            return res.status(500).json({
              success: false,
              message: 'Failed to upload receipt images. Please try again.'
            });
          }
        }

        const newReceipts = receiptUrls.map(url => ({
          image: url, // Store Cloudinary URL
          uploadedAt: new Date()
        }));
        expense.receipts = [...(expense.receipts || []), ...newReceipts];
      }

      // Update receipt if provided (legacy support)
      if (receipt !== undefined) {
        expense.receipt = receipt;
      }

      await expense.save();
      await expense.populate('requestedBy', 'username email stationId');
      await expense.populate('approvedBy', 'username email');

      // Notify admins that a receipt was uploaded
      try {
        const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
        const notifyPromises = admins.map(a => 
          NotificationController.createNotification(
            a._id,
            'expense',
            'Receipt Uploaded',
            `${req.user.username || 'Staff'} uploaded receipt(s) for an approved expense`,
            expense._id.toString()
          )
        );
        await Promise.all(notifyPromises);
      } catch (notifyErr) {
        console.error('Notification (receipt upload) error:', notifyErr);
      }

      res.status(200).json({
        success: true,
        message: 'Receipt uploaded successfully',
        data: expense
      });
    } catch (error) {
      console.error('Upload receipt error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Archive expense (admin only)
  static async archiveExpense(req, res) {
    try {
      const { id } = req.params;

      const expense = await Expense.findByIdAndUpdate(
        id,
        { isArchived: true },
        { new: true }
      ).populate('requestedBy', 'username email');

      if (!expense) {
        return res.status(404).json({
          success: false,
          message: 'Expense not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Expense archived successfully',
        data: expense
      });
    } catch (error) {
      console.error('Archive expense error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Unarchive expense (admin only)
  static async unarchiveExpense(req, res) {
    try {
      const { id } = req.params;

      const expense = await Expense.findByIdAndUpdate(
        id,
        { isArchived: false },
        { new: true }
      ).populate('requestedBy', 'username email');

      if (!expense) {
        return res.status(404).json({
          success: false,
          message: 'Expense not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Expense unarchived successfully',
        data: expense
      });
    } catch (error) {
      console.error('Unarchive expense error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Appeal rejected expense (staff only)
  static async appealExpense(req, res) {
    try {
      const { id } = req.params;
      const { appealReason, appealImages } = req.body;

      if (!appealReason || !appealReason.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Appeal reason is required'
        });
      }

      const expense = await Expense.findById(id);

      if (!expense) {
        return res.status(404).json({
          success: false,
          message: 'Expense not found'
        });
      }

      // Check if the expense belongs to the requester
      if (expense.requestedBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You can only appeal your own expense requests'
        });
      }

      // Only rejected expenses can be appealed
      if (expense.status !== 'Rejected') {
        return res.status(400).json({
          success: false,
          message: 'Only rejected expenses can be appealed'
        });
      }

      expense.status = 'Appealed';
      expense.appealReason = appealReason.trim();
      expense.appealedAt = new Date();
      // Clear approvedBy when appealing (it should only exist for approved expenses)
      expense.approvedBy = null;
      expense.approvedAt = null;
      
      // Handle appeal images - check if they're already Cloudinary URLs or need to be uploaded
      if (appealImages && Array.isArray(appealImages) && appealImages.length > 0) {
        // Check if images are already Cloudinary URLs (from mobile upload) or base64 (from web)
        const cloudinaryUrls = appealImages.filter(img => 
          typeof img === 'string' && img.startsWith('https://res.cloudinary.com')
        );
        const base64Images = appealImages.filter(img => 
          typeof img === 'string' && (img.startsWith('data:image/') || !img.startsWith('http'))
        );

        let appealImageUrls = [];

        // Use Cloudinary URLs directly if provided
        if (cloudinaryUrls.length > 0) {
          appealImageUrls = cloudinaryUrls;
          console.log(`✅ Using ${appealImageUrls.length} pre-uploaded Cloudinary URL(s) for appeal`);
        }

        // Upload base64 images if any
        if (base64Images.length > 0) {
          try {
            const expenseId = expense._id.toString();
            const baseFileName = `appeal_${expenseId}_${Date.now()}`;
            const uploadedUrls = await cloudinaryService.uploadImages(base64Images, baseFileName);
            appealImageUrls = [...appealImageUrls, ...uploadedUrls];
            console.log(`✅ Uploaded ${uploadedUrls.length} base64 appeal image(s) to Cloudinary`);
          } catch (uploadError) {
            console.error('Error uploading appeal images to Cloudinary:', uploadError);
            return res.status(500).json({
              success: false,
              message: 'Failed to upload appeal images. Please try again.'
            });
          }
        }

        expense.appealImages = appealImageUrls; // Store Cloudinary URLs
      } else {
        expense.appealImages = [];
      }

      await expense.save();
      await expense.populate('requestedBy', 'username email stationId');
      await expense.populate('approvedBy', 'username email');

      // Notify admins about the appeal
      try {
        const admins = await User.find({ role: 'admin', isActive: true }).select('_id');
        const notifyPromises = admins.map(a => 
          NotificationController.createNotification(
            a._id,
            'expense',
            'Expense Appeal Submitted',
            `${req.user.username || 'Staff'} appealed a rejected expense`,
            expense._id.toString()
          )
        );
        await Promise.all(notifyPromises);
      } catch (notifyErr) {
        console.error('Notification (expense appeal) error:', notifyErr);
      }

      res.status(200).json({
        success: true,
        message: 'Expense appeal submitted successfully',
        data: expense
      });
    } catch (error) {
      console.error('Appeal expense error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = ExpenseController;


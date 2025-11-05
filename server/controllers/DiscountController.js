const Discount = require('../models/DiscountModel');

class DiscountController {
  // Get all discounts (both admin and staff can view active ones)
  static async getAllDiscounts(req, res) {
    try {
      const { search, status, showArchived = false } = req.query;

      const query = {};
      
      if (showArchived === 'true') {
        query.isArchived = true;
      } else {
        query.isArchived = false;
      }

      if (search) {
        query.$or = [
          { code: { $regex: search, $options: 'i' } },
          { name: { $regex: search, $options: 'i' } }
        ];
      }

      if (status && status !== 'All') {
        if (status === 'Active') {
          query.isActive = true;
        } else if (status === 'Inactive') {
          query.isActive = false;
        }
      }

      const discounts = await Discount.find(query).sort({ code: 1 });

      res.status(200).json({
        success: true,
        data: discounts,
        count: discounts.length
      });
    } catch (error) {
      console.error('Get all discounts error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get single discount
  static async getDiscount(req, res) {
    try {
      const { id } = req.params;
      const discount = await Discount.findById(id);

      if (!discount) {
        return res.status(404).json({
          success: false,
          message: 'Discount not found'
        });
      }

      res.status(200).json({
        success: true,
        data: discount
      });
    } catch (error) {
      console.error('Get discount error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Create discount (admin only)
  static async createDiscount(req, res) {
    try {
      const { code, name, type, value, minPurchase, validFrom, validUntil, maxUsage, description } = req.body;

      if (!code || !name || !type || value === undefined || !validFrom || !validUntil) {
        return res.status(400).json({
          success: false,
          message: 'Code, name, type, value, validFrom, and validUntil are required'
        });
      }

      // Check if discount code already exists
      const existingDiscount = await Discount.findOne({ code: code.toUpperCase() });

      if (existingDiscount) {
        return res.status(409).json({
          success: false,
          message: 'Discount code already exists'
        });
      }

      const discount = new Discount({
        code: code.toUpperCase(),
        name,
        type,
        value,
        minPurchase: minPurchase || 0,
        validFrom: new Date(validFrom),
        validUntil: new Date(validUntil),
        maxUsage: maxUsage || 0,
        description: description || '',
        isActive: true
      });

      await discount.save();

      res.status(201).json({
        success: true,
        message: 'Discount created successfully',
        data: discount
      });
    } catch (error) {
      console.error('Create discount error:', error);
      
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'Discount code already exists'
        });
      }

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

  // Update discount (admin only)
  static async updateDiscount(req, res) {
    try {
      const { id } = req.params;
      const { code, name, type, value, minPurchase, validFrom, validUntil, maxUsage, isActive, description } = req.body;

      const discount = await Discount.findById(id);

      if (!discount) {
        return res.status(404).json({
          success: false,
          message: 'Discount not found'
        });
      }

      if (code && code.toUpperCase() !== discount.code) {
        const existing = await Discount.findOne({ code: code.toUpperCase(), _id: { $ne: id } });
        if (existing) {
          return res.status(409).json({
            success: false,
            message: 'Discount code already taken'
          });
        }
        discount.code = code.toUpperCase();
      }
      if (name) discount.name = name;
      if (type) discount.type = type;
      if (value !== undefined) discount.value = value;
      if (minPurchase !== undefined) discount.minPurchase = minPurchase;
      if (validFrom) discount.validFrom = new Date(validFrom);
      if (validUntil) discount.validUntil = new Date(validUntil);
      if (maxUsage !== undefined) discount.maxUsage = maxUsage;
      if (isActive !== undefined) discount.isActive = isActive;
      if (description !== undefined) discount.description = description;

      await discount.save();

      res.status(200).json({
        success: true,
        message: 'Discount updated successfully',
        data: discount
      });
    } catch (error) {
      console.error('Update discount error:', error);
      
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'Discount code already exists'
        });
      }

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

  // Archive discount (admin only)
  static async archiveDiscount(req, res) {
    try {
      const { id } = req.params;

      const discount = await Discount.findByIdAndUpdate(
        id,
        { isArchived: true },
        { new: true }
      );

      if (!discount) {
        return res.status(404).json({
          success: false,
          message: 'Discount not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Discount archived successfully',
        data: discount
      });
    } catch (error) {
      console.error('Archive discount error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Unarchive discount (admin only)
  static async unarchiveDiscount(req, res) {
    try {
      const { id } = req.params;

      const discount = await Discount.findByIdAndUpdate(
        id,
        { isArchived: false },
        { new: true }
      );

      if (!discount) {
        return res.status(404).json({
          success: false,
          message: 'Discount not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Discount unarchived successfully',
        data: discount
      });
    } catch (error) {
      console.error('Unarchive discount error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = DiscountController;


const SystemSetting = require('../models/SystemSettingModel');

const DEFAULT_INACTIVITY_SETTINGS = {
  admin: {
    enabled: true,
    timeoutMinutes: 15,
    warningSeconds: 60,
  },
  staff: {
    enabled: true,
    timeoutMinutes: 15,
    warningSeconds: 60,
  },
};

// Default configuration for loyalty points
// enabled: whether customers can earn new points
// pesoToPointMultiplier: how many points are earned per ₱1 paid (e.g. 0.01 = 0.01 pts per ₱1)
const DEFAULT_POINTS_SETTINGS = {
  enabled: process.env.ENABLE_POINTS_SYSTEM !== 'false', // Default to true unless explicitly disabled
  pesoToPointMultiplier: parseFloat(process.env.POINTS_MULTIPLIER) || 0.01,
};

// Default configuration for vouchers
const DEFAULT_VOUCHER_SETTINGS = {
  enabled: process.env.ENABLE_VOUCHER_SYSTEM !== 'false', // Default to true unless explicitly disabled
};

class SystemSettingController {
  static mergeWithDefaults(role, value = {}) {
    const defaults = DEFAULT_INACTIVITY_SETTINGS[role] || DEFAULT_INACTIVITY_SETTINGS.admin;
    return {
      enabled: typeof value.enabled === 'boolean' ? value.enabled : defaults.enabled,
      timeoutMinutes: value.timeoutMinutes ?? defaults.timeoutMinutes,
      warningSeconds: value.warningSeconds ?? defaults.warningSeconds,
    };
  }

  static async getInactivitySettings(req, res) {
    try {
      const settings = await SystemSetting.find({
        key: { $in: ['inactivity.admin', 'inactivity.staff'] },
      });

      const response = {
        admin: DEFAULT_INACTIVITY_SETTINGS.admin,
        staff: DEFAULT_INACTIVITY_SETTINGS.staff,
      };

      settings.forEach(setting => {
        const [, role] = setting.key.split('.');
        if (role && response[role]) {
          response[role] = SystemSettingController.mergeWithDefaults(role, setting.value);
        }
      });

      return res.status(200).json({
        success: true,
        data: response,
      });
    } catch (error) {
      console.error('Error fetching inactivity settings:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to load inactivity settings',
      });
    }
  }

  static async updateInactivitySetting(req, res) {
    try {
      const { enabled, timeoutMinutes, warningSeconds, role: requestedRole } = req.body;
      const role = (requestedRole && req.user.role === 'admin')
        ? requestedRole
        : req.user.role;

      if (!['admin', 'staff'].includes(role)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid role specified',
        });
      }

      const minutes = Number(timeoutMinutes);
      if (Number.isNaN(minutes) || minutes < 5 || minutes > 240) {
        return res.status(400).json({
          success: false,
          message: 'Timeout must be between 5 and 240 minutes',
        });
      }

      let warning = Number(warningSeconds);
      if (Number.isNaN(warning) || warning <= 0) {
        warning = DEFAULT_INACTIVITY_SETTINGS[role].warningSeconds;
      }

      const maxWarning = Math.max(minutes * 60 - 5, 5);
      warning = Math.min(warning, maxWarning);

      const finalValue = {
        enabled: typeof enabled === 'boolean' ? enabled : true,
        timeoutMinutes: minutes,
        warningSeconds: warning,
      };

      await SystemSetting.findOneAndUpdate(
        { key: `inactivity.${role}` },
        {
          key: `inactivity.${role}`,
          value: finalValue,
          updatedBy: req.user?._id || null,
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );

      return res.status(200).json({
        success: true,
        data: {
          role,
          ...finalValue,
        },
        message: 'Inactivity settings updated successfully',
      });
    } catch (error) {
      console.error('Error updating inactivity setting:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update inactivity setting',
      });
    }
  }

  /**
   * Get global points (loyalty) settings.
   * Response shape:
   * {
   *   enabled: boolean,
   *   pesoToPointMultiplier: number  // e.g. 0.01 means 0.01 points per ₱1
   * }
   */
  static async getPointsSettings(req, res) {
    try {
      const setting = await SystemSetting.findOne({ key: 'points.global' });

      const value = setting?.value || {};

      // Check environment variable first, then database, then default
      const envEnabled = process.env.ENABLE_POINTS_SYSTEM !== 'false';
      const envMultiplier = process.env.POINTS_MULTIPLIER ? parseFloat(process.env.POINTS_MULTIPLIER) : null;

      const response = {
        enabled: typeof value.enabled === 'boolean' 
          ? value.enabled 
          : (envEnabled !== undefined ? envEnabled : DEFAULT_POINTS_SETTINGS.enabled),
        pesoToPointMultiplier: typeof value.pesoToPointMultiplier === 'number'
          ? value.pesoToPointMultiplier
          : (envMultiplier !== null ? envMultiplier : DEFAULT_POINTS_SETTINGS.pesoToPointMultiplier),
      };

      return res.status(200).json({
        success: true,
        data: response,
      });
    } catch (error) {
      console.error('Error fetching points settings:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to load points settings',
      });
    }
  }

  /**
   * Update global points (loyalty) settings.
   * Accepts:
   * - enabled: boolean (toggle earning on/off)
   * - pesoToPointMultiplier: number (points earned per ₱1, must be >= 0 and <= 1)
   */
  static async updatePointsSettings(req, res) {
    try {
      const { enabled, pesoToPointMultiplier } = req.body;

      let multiplier = Number(pesoToPointMultiplier);
      if (Number.isNaN(multiplier) || multiplier < 0) {
        return res.status(400).json({
          success: false,
          message: 'pesoToPointMultiplier must be a non-negative number',
        });
      }

      // Put a sensible upper bound to avoid accidentally huge multipliers
      if (multiplier > 1) {
        return res.status(400).json({
          success: false,
          message: 'pesoToPointMultiplier cannot be greater than 1 (1 point per ₱1)',
        });
      }

      const finalValue = {
        enabled: typeof enabled === 'boolean' ? enabled : DEFAULT_POINTS_SETTINGS.enabled,
        pesoToPointMultiplier: multiplier,
      };

      await SystemSetting.findOneAndUpdate(
        { key: 'points.global' },
        {
          key: 'points.global',
          value: finalValue,
          updatedBy: req.user?._id || null,
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );

      return res.status(200).json({
        success: true,
        data: finalValue,
        message: 'Points settings updated successfully',
      });
    } catch (error) {
      console.error('Error updating points settings:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update points settings',
      });
    }
  }

  /**
   * Get voucher system settings.
   * Response shape:
   * {
   *   enabled: boolean
   * }
   */
  static async getVoucherSettings(req, res) {
    try {
      const setting = await SystemSetting.findOne({ key: 'vouchers.enabled' });

      const value = setting?.value;

      const response = {
        enabled: typeof value === 'boolean' ? value : DEFAULT_VOUCHER_SETTINGS.enabled,
      };

      return res.status(200).json({
        success: true,
        data: response,
      });
    } catch (error) {
      console.error('Error fetching voucher settings:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to load voucher settings',
      });
    }
  }

  /**
   * Update voucher system settings.
   * Accepts:
   * - enabled: boolean (toggle voucher system on/off)
   */
  static async updateVoucherSettings(req, res) {
    try {
      const { enabled } = req.body;

      const finalValue = {
        enabled: typeof enabled === 'boolean' ? enabled : DEFAULT_VOUCHER_SETTINGS.enabled,
      };

      await SystemSetting.findOneAndUpdate(
        { key: 'vouchers.enabled' },
        {
          key: 'vouchers.enabled',
          value: finalValue.enabled,
          updatedBy: req.user?._id || null,
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );

      return res.status(200).json({
        success: true,
        data: finalValue,
        message: 'Voucher settings updated successfully',
      });
    } catch (error) {
      console.error('Error updating voucher settings:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update voucher settings',
      });
    }
  }

  /**
   * Get branch-specific point rules.
   * Response shape:
   * {
   *   [stationId]: {
   *     enabled: boolean,
   *     pesoToPointMultiplier: number
   *   }
   * }
   */
  static async getBranchPointRules(req, res) {
    try {
      const { stationId } = req.query;

      if (stationId) {
        // Get specific branch rule
        const setting = await SystemSetting.findOne({ key: `points.branch.${stationId}` });
        const value = setting?.value || {};

        const response = {
          stationId,
          enabled: typeof value.enabled === 'boolean' ? value.enabled : null, // null means use global
          pesoToPointMultiplier: typeof value.pesoToPointMultiplier === 'number' 
            ? value.pesoToPointMultiplier 
            : null, // null means use global
        };

        return res.status(200).json({
          success: true,
          data: response,
        });
      } else {
        // Get all branch rules
        const settings = await SystemSetting.find({
          key: { $regex: /^points\.branch\./ }
        });

        const branchRules = {};
        settings.forEach(setting => {
          const stationId = setting.key.replace('points.branch.', '');
          branchRules[stationId] = {
            enabled: typeof setting.value.enabled === 'boolean' ? setting.value.enabled : null,
            pesoToPointMultiplier: typeof setting.value.pesoToPointMultiplier === 'number' 
              ? setting.value.pesoToPointMultiplier 
              : null,
          };
        });

        return res.status(200).json({
          success: true,
          data: branchRules,
        });
      }
    } catch (error) {
      console.error('Error fetching branch point rules:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to load branch point rules',
      });
    }
  }

  /**
   * Update branch-specific point rules.
   * Accepts:
   * - stationId: string (required)
   * - enabled: boolean (optional, null to use global)
   * - pesoToPointMultiplier: number (optional, null to use global)
   */
  static async updateBranchPointRules(req, res) {
    try {
      const { stationId, enabled, pesoToPointMultiplier } = req.body;

      if (!stationId) {
        return res.status(400).json({
          success: false,
          message: 'Station ID is required',
        });
      }

      const updateValue = {};

      if (enabled !== undefined) {
        updateValue.enabled = enabled === null ? null : (typeof enabled === 'boolean' ? enabled : null);
      }

      if (pesoToPointMultiplier !== undefined) {
        if (pesoToPointMultiplier !== null) {
          const multiplier = Number(pesoToPointMultiplier);
          if (Number.isNaN(multiplier) || multiplier < 0) {
            return res.status(400).json({
              success: false,
              message: 'pesoToPointMultiplier must be a non-negative number or null',
            });
          }
          if (multiplier > 1) {
            return res.status(400).json({
              success: false,
              message: 'pesoToPointMultiplier cannot be greater than 1',
            });
          }
          updateValue.pesoToPointMultiplier = multiplier;
        } else {
          updateValue.pesoToPointMultiplier = null;
        }
      }

      await SystemSetting.findOneAndUpdate(
        { key: `points.branch.${stationId}` },
        {
          key: `points.branch.${stationId}`,
          value: updateValue,
          updatedBy: req.user?._id || null,
        },
        {
          upsert: true,
          new: true,
          setDefaultsOnInsert: true,
        }
      );

      return res.status(200).json({
        success: true,
        data: {
          stationId,
          ...updateValue,
        },
        message: 'Branch point rules updated successfully',
      });
    } catch (error) {
      console.error('Error updating branch point rules:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update branch point rules',
      });
    }
  }
}

module.exports = SystemSettingController;


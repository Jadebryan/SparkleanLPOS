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
}

module.exports = SystemSettingController;


const Station = require('../models/StationModel');

class StationController {
  // Get public stations (for landing page - no auth required)
  static async getPublicStations(req, res) {
    try {
      // Only return active, non-archived stations with addresses
      const stations = await Station.find({
        isArchived: false,
        isActive: true,
        address: { $exists: true, $ne: '' }
      })
      .select('stationId name address phone')
      .sort({ stationId: 1 });

      res.status(200).json({
        success: true,
        data: stations,
        count: stations.length
      });
    } catch (error) {
      console.error('Get public stations error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get all stations
  static async getAllStations(req, res) {
    try {
      const { showArchived = false } = req.query;

      const query = {};
      
      if (showArchived === 'true' || showArchived === true) {
        query.isArchived = true;
      } else {
        query.isArchived = false;
      }

      const stations = await Station.find(query).sort({ stationId: 1 });

      res.status(200).json({
        success: true,
        data: stations,
        count: stations.length
      });
    } catch (error) {
      console.error('Get all stations error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Get single station
  static async getStation(req, res) {
    try {
      const { id } = req.params;
      const station = await Station.findById(id);

      if (!station) {
        return res.status(404).json({
          success: false,
          message: 'Station not found'
        });
      }

      res.status(200).json({
        success: true,
        data: station
      });
    } catch (error) {
      console.error('Get station error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Create station (admin only)
  static async createStation(req, res) {
    try {
      const { stationId, name, address, phone, notes } = req.body;

      if (!stationId || !name) {
        return res.status(400).json({
          success: false,
          message: 'Station ID and name are required'
        });
      }

      // Check if station ID already exists
      const existingStation = await Station.findOne({ 
        stationId: stationId.toUpperCase().trim() 
      });

      if (existingStation) {
        return res.status(409).json({
          success: false,
          message: 'Station with this ID already exists'
        });
      }

      const station = new Station({
        stationId: stationId.toUpperCase().trim(),
        name: name.trim(),
        address: address?.trim() || '',
        phone: phone?.trim() || '',
        notes: notes?.trim() || '',
        isActive: true
      });

      await station.save();

      res.status(201).json({
        success: true,
        message: 'Station created successfully',
        data: station
      });
    } catch (error) {
      console.error('Create station error:', error);
      
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'Station ID already exists'
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

  // Update station (admin only)
  static async updateStation(req, res) {
    try {
      const { id } = req.params;
      const { stationId, name, address, phone, isActive, notes } = req.body;

      const station = await Station.findById(id);

      if (!station) {
        return res.status(404).json({
          success: false,
          message: 'Station not found'
        });
      }

      if (stationId && stationId.toUpperCase().trim() !== station.stationId) {
        // Check if new ID is taken
        const existing = await Station.findOne({ 
          stationId: stationId.toUpperCase().trim(),
          _id: { $ne: id }
        });
        if (existing) {
          return res.status(409).json({
            success: false,
            message: 'Station ID already taken'
          });
        }
        station.stationId = stationId.toUpperCase().trim();
      }
      if (name) station.name = name.trim();
      if (address !== undefined) station.address = address.trim();
      if (phone !== undefined) station.phone = phone.trim();
      if (isActive !== undefined) station.isActive = isActive;
      if (notes !== undefined) station.notes = notes.trim();

      await station.save();

      res.status(200).json({
        success: true,
        message: 'Station updated successfully',
        data: station
      });
    } catch (error) {
      console.error('Update station error:', error);
      
      if (error.code === 11000) {
        return res.status(409).json({
          success: false,
          message: 'Station ID already exists'
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

  // Archive station (admin only)
  static async archiveStation(req, res) {
    try {
      const { id } = req.params;

      const station = await Station.findByIdAndUpdate(
        id,
        { isArchived: true, isActive: false },
        { new: true }
      );

      if (!station) {
        return res.status(404).json({
          success: false,
          message: 'Station not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Station archived successfully',
        data: station
      });
    } catch (error) {
      console.error('Archive station error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Unarchive station (admin only)
  static async unarchiveStation(req, res) {
    try {
      const { id } = req.params;

      const station = await Station.findByIdAndUpdate(
        id,
        { isArchived: false, isActive: true },
        { new: true }
      );

      if (!station) {
        return res.status(404).json({
          success: false,
          message: 'Station not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Station unarchived successfully',
        data: station
      });
    } catch (error) {
      console.error('Unarchive station error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }

  // Delete station (admin only - permanent deletion)
  static async deleteStation(req, res) {
    try {
      const { id } = req.params;

      const station = await Station.findByIdAndDelete(id);

      if (!station) {
        return res.status(404).json({
          success: false,
          message: 'Station not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Station deleted permanently'
      });
    } catch (error) {
      console.error('Delete station error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  }
}

module.exports = StationController;


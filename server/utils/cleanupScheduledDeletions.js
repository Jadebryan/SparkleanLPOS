const Order = require('../models/OrderModel');

/**
 * Cleanup scheduled deletions - deletes orders that have passed their scheduled deletion date
 * This should be run periodically (e.g., daily via cron job or scheduled task)
 */
async function cleanupScheduledDeletions() {
  try {
    const now = new Date();
    
    // Find all drafts with scheduled deletion dates that have passed
    const ordersToDelete = await Order.find({
      isDraft: true,
      scheduledDeleteAt: { $lte: now }
    });

    if (ordersToDelete.length === 0) {
      console.log('No scheduled deletions to process');
      return { deleted: 0 };
    }

    // Delete the orders
    const deleteResult = await Order.deleteMany({
      isDraft: true,
      scheduledDeleteAt: { $lte: now }
    });

    console.log(`Cleanup completed: ${deleteResult.deletedCount} draft order(s) deleted`);
    
    return { deleted: deleteResult.deletedCount };
  } catch (error) {
    console.error('Error cleaning up scheduled deletions:', error);
    throw error;
  }
}

module.exports = { cleanupScheduledDeletions };


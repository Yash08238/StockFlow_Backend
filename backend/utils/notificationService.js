/**
 * Notification Service
 * Handles creating and managing notifications
 */

const Notification = require("../models/Notification");
const Product = require("../models/Product");
const User = require("../models/User");

const notificationService = {
  /**
   * Create a notification
   * @param {Object} data - Notification data
   * @returns {Promise<Object>}
   */
  create: async (data) => {
    try {
      const notification = new Notification({
        userId: data.userId,
        productId: data.productId || null,
        type: data.type,
        message: data.message,
        isRead: false,
        createdAt: new Date(),
      });
      return await notification.save();
    } catch (error) {
      console.error("Error creating notification:", error);
      return null;
    }
  },

  /**
   * Check and create LOW_STOCK notification if needed
   * @param {Object} product - Product document
   * @param {string} userId - Owner user ID
   */
  checkLowStock: async (product, userId) => {
    try {
      // Check user preferences
      const user = await User.findById(userId);
      if (
        user &&
        user.notificationPrefs &&
        !user.notificationPrefs.lowStockAlerts
      ) {
        return; // User disabled low stock alerts
      }

      const threshold = product.minThreshold || 10;
      if (product.inventory <= threshold) {
        // Check if there is already an active (unread) notification for this
        const existingNotif = await Notification.findOne({
          userId,
          productId: product._id,
          type: "LOW_STOCK",
          isRead: false,
        });

        if (!existingNotif) {
          await notificationService.create({
            userId,
            productId: product._id,
            type: "LOW_STOCK",
            message: `Low Stock Alert: "${product.name}" has only ${product.inventory} units remaining (threshold: ${threshold})`,
          });
        }
      }
    } catch (error) {
      console.error("Error checking low stock:", error);
    }
  },

  /**
   * Check and create FORECAST_WARNING notification if needed
   * @param {Object} product - Product document
   * @param {string} userId - Owner user ID
   */
  checkForecast: async (product, userId) => {
    try {
      // Check user preferences
      const user = await User.findById(userId);
      if (
        user &&
        user.notificationPrefs &&
        !user.notificationPrefs.forecastAlerts
      ) {
        return; // User disabled forecast alerts
      }

      // Skip if no sales data or divide be zero safety
      if (!product.dailySalesAvg || product.dailySalesAvg <= 0) {
        return;
      }

      const daysLeft = product.inventory / product.dailySalesAvg;

      if (daysLeft <= 6) {
        // Check if there is already an active (unread) notification
        const existingNotif = await Notification.findOne({
          userId,
          productId: product._id,
          type: "FORECAST_WARNING",
          isRead: false,
        });

        if (!existingNotif) {
          await notificationService.create({
            userId,
            productId: product._id,
            type: "FORECAST_WARNING",
            message: `Forecast Warning: "${
              product.name
            }" may run out in ~${Math.round(
              daysLeft
            )} days at current sales rate`,
          });
        }
      }
    } catch (error) {
      console.error("Error checking forecast:", error);
    }
  },

  /**
   * Create DEAD_STOCK notifications for products with no sales in 30 days
   * @param {string} userId - User ID
   */
  checkDeadStock: async (userId) => {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const deadProducts = await Product.find({
        owner: userId,
        // Exclude newly added products (< 30 days old)
        // Include if created > 30 days OR creation date missing (legacy products)
        $or: [
          { createdAt: { $lt: thirtyDaysAgo } },
          { createdAt: { $exists: false } }, // Maintain backward compatibility
        ],
        $and: [
          {
            $or: [{ lastSoldAt: { $lt: thirtyDaysAgo } }, { lastSoldAt: null }],
          },
        ],
        inventory: { $gt: 0 },
      });

      for (const product of deadProducts) {
        // Check if notification already exists
        const existingNotif = await Notification.findOne({
          userId,
          productId: product._id,
          type: "DEAD_STOCK",
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, // Weekly
        });

        if (!existingNotif) {
          await notificationService.create({
            userId,
            productId: product._id,
            type: "DEAD_STOCK",
            message: `Dead Stock: "${product.name}" has not been sold in over 30 days`,
          });
        }
      }
    } catch (error) {
      console.error("Error checking dead stock:", error);
    }
  },

  /**
   * Create restock reminder notification
   * @param {Object} product - Product document
   * @param {string} userId - Owner user ID
   * @param {number} suggestedQty - Suggested quantity to restock
   */
  createRestockReminder: async (product, userId, suggestedQty) => {
    try {
      await notificationService.create({
        userId,
        productId: product._id,
        type: "RESTOCK_REMINDER",
        message: `Restock Reminder: Consider restocking "${product.name}". Suggested quantity: ${suggestedQty} units`,
      });
    } catch (error) {
      console.error("Error creating restock reminder:", error);
    }
  },

  /**
   * Get all notifications for a user
   * @param {string} userId - User ID
   * @param {boolean} unreadOnly - Only return unread
   * @returns {Promise<Array>}
   */
  getForUser: async (userId, unreadOnly = false) => {
    try {
      const query = { userId };
      if (unreadOnly) {
        query.isRead = false;
      }
      return await Notification.find(query)
        .populate("productId", "name")
        .sort({ createdAt: -1 })
        .limit(100);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      return [];
    }
  },

  /**
   * Mark notification as read
   * @param {string} notificationId - Notification ID
   * @param {string} userId - User ID (for security)
   */
  markAsRead: async (notificationId, userId) => {
    try {
      return await Notification.findOneAndUpdate(
        { _id: notificationId, userId },
        { isRead: true },
        { new: true }
      );
    } catch (error) {
      console.error("Error marking as read:", error);
      return null;
    }
  },

  /**
   * Mark all notifications as read for a user
   * @param {string} userId - User ID
   */
  markAllAsRead: async (userId) => {
    try {
      return await Notification.updateMany(
        { userId, isRead: false },
        { isRead: true }
      );
    } catch (error) {
      console.error("Error marking all as read:", error);
      return null;
    }
  },

  /**
   * Get unread count for a user
   * @param {string} userId - User ID
   * @returns {Promise<number>}
   */
  getUnreadCount: async (userId) => {
    try {
      return await Notification.countDocuments({ userId, isRead: false });
    } catch (error) {
      console.error("Error getting unread count:", error);
      return 0;
    }
  },
};

module.exports = notificationService;

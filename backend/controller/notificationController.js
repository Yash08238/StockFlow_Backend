const notificationService = require("../utils/notificationService");
const successResponse = require("../responses/successResponse");
const errorResponse = require("../responses/errorResponse");

const notificationController = {
  /**
   * Get all notifications for the logged-in user
   */
  getNotifications: async (req, res) => {
    try {
      const userId = req.user.userId;
      const { unreadOnly } = req.query;

      const notifications = await notificationService.getForUser(
        userId,
        unreadOnly === "true"
      );

      const unreadCount = await notificationService.getUnreadCount(userId);

      successResponse(
        res,
        { notifications, unreadCount },
        "Notifications retrieved successfully"
      );
    } catch (error) {
      console.error("Get notifications error:", error);
      errorResponse(res, 500, "Internal Server Error", error);
    }
  },

  /**
   * Mark a notification as read
   */
  markAsRead: async (req, res) => {
    try {
      const userId = req.user.userId;
      const { id } = req.params;

      const notification = await notificationService.markAsRead(id, userId);

      if (!notification) {
        return errorResponse(res, 404, "Notification not found");
      }

      successResponse(res, notification, "Notification marked as read");
    } catch (error) {
      console.error("Mark as read error:", error);
      errorResponse(res, 500, "Internal Server Error", error);
    }
  },

  /**
   * Mark all notifications as read
   */
  markAllAsRead: async (req, res) => {
    try {
      const userId = req.user.userId;

      await notificationService.markAllAsRead(userId);

      successResponse(res, null, "All notifications marked as read");
    } catch (error) {
      console.error("Mark all as read error:", error);
      errorResponse(res, 500, "Internal Server Error", error);
    }
  },

  /**
   * Get unread notification count
   */
  getUnreadCount: async (req, res) => {
    try {
      const userId = req.user.userId;
      const count = await notificationService.getUnreadCount(userId);

      successResponse(res, { count }, "Unread count retrieved");
    } catch (error) {
      console.error("Get unread count error:", error);
      errorResponse(res, 500, "Internal Server Error", error);
    }
  },
};

module.exports = notificationController;

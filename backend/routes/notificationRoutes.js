const express = require("express");
const router = express.Router();
const notificationController = require("../controller/notificationController");
const verifyToken = require("../middlewares/authMiddleware");

// Get all notifications
router.get("/", verifyToken, notificationController.getNotifications);

// Get unread count
router.get("/unread-count", verifyToken, notificationController.getUnreadCount);

// Mark single notification as read
router.put("/read/:id", verifyToken, notificationController.markAsRead);

// Mark all as read
router.put("/read-all", verifyToken, notificationController.markAllAsRead);

module.exports = router;

const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    default: null,
  },
  type: {
    type: String,
    required: true,
    enum: [
      "LOW_STOCK",
      "FORECAST_WARNING",
      "DEAD_STOCK",
      "SYSTEM",
      "RESTOCK_REMINDER",
    ],
  },
  message: {
    type: String,
    required: true,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for efficient querying
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1 });

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;

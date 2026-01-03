const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  action: {
    type: String,
    required: true,
    enum: [
      "CREATE_PRODUCT",
      "UPDATE_PRODUCT",
      "DELETE_PRODUCT",
      "CREATE_SALE",
      "SUPPLY_STOCK",
      "UPDATE_PROFILE",
      "RESTOCK",
    ],
  },
  entityType: {
    type: String,
    required: true,
    enum: ["product", "sale", "profile", "inventory"],
  },
  entityId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  before: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  after: {
    type: mongoose.Schema.Types.Mixed,
    default: null,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Index for efficient querying
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });

const AuditLog = mongoose.model("AuditLog", auditLogSchema);

module.exports = AuditLog;

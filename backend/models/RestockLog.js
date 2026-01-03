const mongoose = require("mongoose");

const restockLogSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  quantityAdded: {
    type: Number,
    required: true,
    min: 1,
  },
  restockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  restockedAt: {
    type: Date,
    default: Date.now,
  },
  supplierName: {
    type: String,
    default: null,
  },
  costPrice: {
    type: Number,
    default: null,
  },
  source: {
    type: String,
    enum: ["RESTOCK", "INITIAL"],
    default: "RESTOCK",
  },
});

// Index for efficient querying
restockLogSchema.index({ productId: 1, restockedAt: -1 });
restockLogSchema.index({ restockedBy: 1 });

const RestockLog = mongoose.model("RestockLog", restockLogSchema);

module.exports = RestockLog;

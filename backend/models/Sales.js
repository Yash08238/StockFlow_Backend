const mongoose = require("mongoose");

const salesSchema = new mongoose.Schema({
  customer: {
    type: String,
    required: true,
  },
  customermail: {
    type: String,
    required: true,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  product: {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productName: {
      type: String,
      required: true,
    },
  },
  quantity: {
    type: Number,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  subtotal: {
    type: Number,
    required: true,
  },
  discount: {
    type: Number,
    default: 0,
  },
  cp: {
    type: Number,
    required: true,
    default: 0,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  pdfUrl: {
    type: String,
  },
  billStatus: {
    type: String,
    enum: ["GENERATED", "PENDING", "FAILED"],
    default: "PENDING",
  },
});

module.exports = mongoose.model("Sales", salesSchema);

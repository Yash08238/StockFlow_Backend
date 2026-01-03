const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["SYSTEM", "CUSTOM"],
      required: true,
      default: "CUSTOM",
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

// Compound index: unique name per owner (null owner = SYSTEM categories)
categorySchema.index({ name: 1, owner: 1 }, { unique: true });

// Use mongoose.models cache to prevent OverwriteModelError
const Category =
  mongoose.models.Category || mongoose.model("Category", categorySchema);

module.exports = Category;

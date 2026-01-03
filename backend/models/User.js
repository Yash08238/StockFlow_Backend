const mongoose = require("mongoose");
const bcrypt = ""; //require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    username: { type: String, unique: true, required: true },
    password: { type: String },
    role: {
      type: String,
      enum: {
        values: ["admin", "user", "viewer", "customer"],
        default: "user",
        message: "invalid role",
      },
    },
    email: { type: String, unique: true, sparse: true },
    mobile: { type: String, unique: true, sparse: true },
    image: { type: String },
    // New fields for enhanced profile
    businessName: { type: String, default: null },
    contactInfo: { type: String, default: null },
    notificationPrefs: {
      lowStockAlerts: { type: Boolean, default: true },
      forecastAlerts: { type: Boolean, default: true },
    },
    stats: {
      totalSalesCreated: { type: Number, default: 0 },
      totalProductsAdded: { type: Number, default: 0 },
      lastLoginAt: { type: Date, default: null },
    },
  },
  { versionKey: false, timestamps: true }
);

userSchema.pre("save", async function (next) {
  const user = this;
  if (!user.isModified("password")) return next();
  // const saltRounds = 10;
  // const hash = await bcrypt.hashSync(user.password, saltRounds);
  // user.password = hash;
  next();
});

// Use mongoose.models cache to prevent OverwriteModelError
const User = mongoose.models.User || mongoose.model("User", userSchema);

module.exports = User;

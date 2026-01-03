const User = require("../models/User");
const Token = require("../models/TokenModel");
const { sendPasswordResetEmail } = require("../utils/emailUtils");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const bcryptSalt = 10;

exports.resetPassword = async (req, res) => {
  const { token, id, newPassword } = req.body;

  // Validate input
  if (!token || !id || !newPassword) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    // Find the user by id
    const user = await User.findById(id);
    if (!user) {
      return res.status(400).json({ message: "Invalid or expired reset link" });
    }

    // Don't allow password reset for Google OAuth users (they don't have passwords)
    if (!user.password) {
      return res.status(400).json({ 
        message: "This account uses Google Sign-In. Please use Google to login." 
      });
    }

    // Find the token associated with the user
    const tokenDoc = await Token.findOne({ userId: id });
    if (!tokenDoc) {
      return res.status(400).json({ message: "Invalid or expired reset link" });
    }

    // Compare the reset token with the one stored in the database
    const isValidToken = await bcrypt.compare(token, tokenDoc.token);
    if (!isValidToken) {
      return res.status(400).json({ message: "Invalid or expired reset link" });
    }

    // Hash the new password and update
    const hashedPassword = await bcrypt.hash(newPassword, Number(bcryptSalt));
    user.password = hashedPassword;
    
    // Save without triggering pre-save hook (since we already hashed it)
    await User.updateOne(
      { _id: user._id },
      { $set: { password: hashedPassword } }
    );

    // Delete the token from the database
    await tokenDoc.deleteOne();

    return res.status(200).json({
      message: "Password reset successful. Redirecting to login page...",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({ message: "An error occurred. Please try again." });
  }
};

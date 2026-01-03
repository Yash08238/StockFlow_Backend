const User = require("../models/User");
const Token = require("../models/TokenModel");
const { sendPasswordResetEmail } = require("../utils/emailUtils");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const bcryptSalt = 10;

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;
  console.log(email);

  try {
    const user = await User.findOne({ email: email });

    if (!user) {
      // Security: Don't reveal if email exists or not
      // Return success message even if user doesn't exist
      return res.status(200).json({
        message:
          "If that email exists, a password recovery link has been sent. Please check your email.",
      });
    }

    // Check if user has a password (not a Google OAuth user)
    if (!user.password) {
      // Google OAuth users don't have passwords
      return res.status(200).json({
        message:
          "If that email exists, a password recovery link has been sent. Please check your email.",
      });
    }

    // Delete any existing tokens associated with the user
    let token = await Token.findOne({ userId: user._id });
    if (token) await token.deleteOne();

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hash = await bcrypt.hash(resetToken, Number(bcryptSalt));
    await new Token({
      userId: user._id,
      token: hash,
      createdAt: Date.now(),
    }).save();

    const resetLink = `${process.env.FRONTEND_URL}/reset?token=${resetToken}&id=${user._id}`;

    await sendPasswordResetEmail(email, resetLink); 

    return res.status(200).json({
      message:
        "If that email exists, a password recovery link has been sent. Please check your email.",
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

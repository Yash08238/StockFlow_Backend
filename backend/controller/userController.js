const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const successResponse = require("../responses/successResponse");
const errorResponse = require("../responses/errorResponse");
const config = require("../config/config");
const fs = require("fs");
const { OAuth2Client } = require("google-auth-library");
const client = new OAuth2Client(config.googleClientId);

const userController = {
  googleLogin: async (req, res) => {
    try {
      const { token } = req.body;
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: config.googleClientId,
      });
      const { name, email, picture } = ticket.getPayload();

      let user = await User.findOne({ email });

      if (!user) {
        // Create new user
        // Generate a random password
        const password =
          Math.random().toString(36).slice(-8) +
          Math.random().toString(36).slice(-8);

        // Generate a unique-ish username if needed, or retry on fail.
        // For simplicity: Name + random 4 digits
        const username =
          name.replace(/\s+/g, "").toLowerCase() +
          Math.floor(1000 + Math.random() * 9000);

        user = new User({
          username,
          email,
          password, // Store random password (plain text as per existing pattern, or hash if schema updated to use presave? Schema has bcrypt commented out).
          // If User.js has presave hook for hashing active, it will hash.
          // Current User.js has commented out hash logic. So it stores plain text.
          image: picture, // Cloudinary URL or Google URL. Schema accepts String.
          role: "user", // Default role
          mobile: null, // sparse index allows null? Yes provided sparse:true
        });

        await user.save();
      }

      // Generate JWT
      const jwtToken = jwt.sign(
        { userId: user._id, username: user.username },
        config.jwtSecret,
        { expiresIn: "24h" }
      );

      successResponse(
        res,
        { user, token: jwtToken },
        "Google Login Successful"
      );
    } catch (error) {
      console.error(error);
      errorResponse(res, 400, "Google Login Failed", error.message);
    }
  },

  registerUser: async (req, res) => {
    try {
      const {
        username,
        password,
        role,
        gender,
        email: rawEmail,
        mobile,
      } = req.body;
      const email = rawEmail ? rawEmail.toLowerCase() : rawEmail;

      // Check if the username or email already exists
      const existingUser = await User.findOne({
        $or: [{ username }, { email }, { mobile }],
      });
      if (existingUser) {
        return errorResponse(
          res,
          400,
          "Username or email or mobile number already exists"
        );
      }

      // Hash the password
      var salt = bcrypt.genSaltSync(10);

      var hash = bcrypt.hashSync(password, salt);
      console.log("hash ====", hash);

      // Create a new user
      const newUser = new User({
        username,
        password: hash,
        role,
        mobile,
        email,
        gender,
      });

      // Save the user to the database
      const savedUser = await newUser.save();

      // Generate JWT token
      const token = jwt.sign(
        { userId: savedUser.id, username: savedUser.username },
        config.jwtSecret,
        { expiresIn: "1h" }
      );

      // Return success response with user and token
      successResponse(
        res,
        { user: savedUser.toObject(), token },
        "User registered successfully"
      );
    } catch (error) {
      console.error("Error registering user:", error);
      errorResponse(res, 500, "Internal Server Error");
    }
  },

  loginUser: async (req, res) => {
    try {
      const { username, password } = req.body;

      // Find user by username OR email (flexible login)
      const user = await User.findOne({
        $or: [
          { username: username },
          { email: username }, // Allow login with email too
        ],
      });

      if (!user) {
        return errorResponse(res, 401, "Invalid credentials");
      }

      // Check if user has a password (not Google OAuth only)
      if (!user.password) {
        return errorResponse(
          res,
          401,
          "This account uses Google Sign-In. Please use the Google login button."
        );
      }

      // Compare the provided password with the hashed password
      const hash = user.password;
      console.log(password, "--", user.password, "----", user);
      if (!bcrypt.compareSync(password, user.password))
        return errorResponse(res, 401, "Invalid Credentials");

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, username: user.username },
        config.jwtSecret,
        { expiresIn: "1h" }
      );

      // Return success response with user and token
      successResponse(
        res,
        { user: user.toObject(), token },
        "User logged in successfully"
      );
    } catch (error) {
      console.error("Error logging in user:", error);
      errorResponse(res, 500, "Internal Server Error");
    }
  },

  updateUserProfile: async (req, res) => {
    try {
      console.log("Profile Update Request - Body:", req.body);
      console.log("Profile Update Request - File:", req.file);

      const userId = req.body.userId;

      // Explicitly construct update object to prevent email/role hijacking
      const allowedUpdates = {};

      if (req.body.username) allowedUpdates.username = req.body.username;
      if (req.body.mobile) allowedUpdates.mobile = req.body.mobile;

      if (req.file) {
        allowedUpdates.image = req.file.path; // Cloudinary URL
      }

      console.log("Constructed Update Object:", allowedUpdates);

      // Filter out undefined values if partial updates are desired,
      // but here we want to allow clearing fields (like gender), so we keep null/empty strings if sent.
      // However, we must ensure 'email' and 'role' are NOT in allowedUpdates.

      const updatedUser = await User.findByIdAndUpdate(userId, allowedUpdates, {
        new: true,
        runValidators: true, // Ensure validation rules are respected
      });
      if (!updatedUser) {
        return errorResponse(res, 404, "User not found");
      }

      successResponse(
        res,
        updatedUser.toObject(),
        "User profile updated successfully"
      );
    } catch (error) {
      console.error("Error updating user profile:", error);
      if (error.code === 11000) {
        const field = Object.keys(error.keyValue)[0];
        return errorResponse(
          res,
          400,
          `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`
        );
      }
      errorResponse(res, 500, "Internal Server Error");
    }
  },

  getUserProfile: async (req, res) => {
    try {
      const userId = req.user.userId; // Extracted from token by middleware
      const user = await User.findById(userId);

      if (!user) {
        return errorResponse(res, 404, "User not found");
      }

      successResponse(
        res,
        user.toObject(),
        "User profile fetched successfully"
      );
    } catch (error) {
      console.error("Error fetching user profile:", error);
      errorResponse(res, 500, "Internal Server Error");
    }
  },
};

module.exports = userController;

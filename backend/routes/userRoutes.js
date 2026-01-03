const express = require("express");
const router = express.Router();
const userController = require("../controller/userController");
const { unlink } = require("./productRoutes");
const multer = require("multer");

const { upload } = require("../config/cloudinaryConfig");

router.post("/register", userController.registerUser);
router.post("/login", userController.loginUser);
router.post("/google-login", userController.googleLogin);
const verifyToken = require("../middlewares/authMiddleware");

router.put(
  "/profile",
  verifyToken,
  upload.single("image"),
  userController.updateUserProfile
);

router.get("/profile", verifyToken, userController.getUserProfile);

// Passport Routes
const passport = require("passport");
const jwt = require("jsonwebtoken");
const config = require("../config/config");

router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_auth_failed`,
    session: false,
  }),
  (req, res) => {
    // Generate Token
    const token = jwt.sign(
      { userId: req.user._id, username: req.user.username },
      config.jwtSecret,
      { expiresIn: "24h" }
    );
    // Redirect to Frontend
    res.redirect(`${process.env.FRONTEND_URL}/auth/callback?token=${token}`);
  }
);
module.exports = router;

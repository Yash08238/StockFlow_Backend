require("dotenv").config();

module.exports = {
  jwtSecret: process.env.JWT_SECRET,
  port: process.env.PORT || 3000,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  mongodbUri: process.env.MONGODB_URI,
  emailFrom: process.env.EMAIL_FROM,
  frontendUrl: process.env.FRONTEND_URL,
  backendUrl: process.env.BACKEND_URL,
};

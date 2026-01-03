require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");

const config = require("./config/config");

// Initialize email sender (verifies SMTP on startup)
require("./src/emailSender");

// Initialize Express app
const app = express();

// Middleware
app.use(
  cors({
    origin: config.frontendUrl || "http://localhost:5173", // Use config, fallback for dev
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

// Initialize Passport
const passport = require("passport");
app.use(passport.initialize());
require("./config/passport")(passport);

// Set view engine
app.set("view engine", "ejs");

// Import database connection (connects asynchronously)
const mongooseConnection = require("./db/connection");

// Log MongoDB connection status
mongooseConnection.on("error", (err) => {
  console.error("MongoDB connection error:", err.message);
});

mongooseConnection.once("open", () => {
  console.log("Connected to MongoDB successfully");

  // Initialize cron jobs after DB connection
  const { initCronJobs } = require("./jobs/cronJobs");
  initCronJobs();

  // Seed default categories
  const { seedCategories } = require("./seeds/categorySeeder");
  seedCategories();
});

// API routes
const api = require("./api/allApi");
app.use("/api", api);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    database:
      mongooseConnection.readyState === 1 ? "connected" : "disconnected",
  });
});

// Root endpoint
app.get("/", (req, res) => {
  res.send("Backend is running");
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ error: "Not Found", path: req.path });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Error:", err.message);
  res
    .status(500)
    .json({ error: "Internal Server Error", message: err.message });
});

// Start server
const port = config.port || 5000;
app.listen(port, () => {
  console.log("Server running on port " + port);
});

module.exports = app;

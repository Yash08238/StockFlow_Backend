require("dotenv").config();
const mongoose = require("mongoose");

mongoose.set("debug", process.env.NODE_ENV !== "production");

// CRITICAL: Fail loudly if MONGODB_URI is not defined
if (!process.env.MONGODB_URI) {
  throw new Error("MONGODB_URI environment variable is not defined");
}

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    process.exit(1); // Exit process on connection failure
  });

module.exports = mongoose.connection;

const mongoose = require("mongoose");
require("dotenv").config();

const cleanDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to DB");

    await mongoose.connection.collection("products").deleteMany({});
    await mongoose.connection.collection("sales").deleteMany({});
    await mongoose.connection.collection("productimages").deleteMany({});

    console.log("Database cleared successfully");
    process.exit(0);
  } catch (error) {
    console.error("Error clearing DB", error);
    process.exit(1);
  }
};

cleanDB();

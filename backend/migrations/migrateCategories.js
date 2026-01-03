/**
 * Category Migration Script
 * Migrates existing products from string category to categoryId
 *
 * Run once: node migrations/migrateCategories.js
 */

require("dotenv").config({ path: "../.env" });
const mongoose = require("mongoose");
const path = require("path");

// Load models
const Product = require("../models/Product");
const Category = require("../models/Category");

// MongoDB connection
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/h5erp";

const migrate = async () => {
  try {
    console.log("[MIGRATION] Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("[MIGRATION] Connected!");

    // Get all products without categoryId
    const products = await Product.find({
      categoryId: null,
      category: { $ne: null, $exists: true },
    });

    console.log(`[MIGRATION] Found ${products.length} products to migrate`);

    let migrated = 0;
    let created = 0;

    for (const product of products) {
      const categoryName = product.category;
      if (!categoryName) continue;

      // Try to find matching SYSTEM category (case-insensitive)
      let category = await Category.findOne({
        name: { $regex: new RegExp(`^${categoryName}$`, "i") },
        type: "SYSTEM",
      });

      if (!category) {
        // Try to find user's CUSTOM category
        category = await Category.findOne({
          name: { $regex: new RegExp(`^${categoryName}$`, "i") },
          type: "CUSTOM",
          owner: product.owner,
        });
      }

      if (!category) {
        // Create as CUSTOM category for this user
        category = await Category.create({
          name: categoryName,
          type: "CUSTOM",
          owner: product.owner,
        });
        console.log(
          `[MIGRATION] Created CUSTOM category: "${categoryName}" for user ${product.owner}`
        );
        created++;
      }

      // Update product with categoryId
      await Product.findByIdAndUpdate(product._id, {
        categoryId: category._id,
      });

      migrated++;
    }

    console.log(`[MIGRATION] Complete!`);
    console.log(`  - Migrated: ${migrated} products`);
    console.log(`  - Created: ${created} new CUSTOM categories`);

    await mongoose.disconnect();
    console.log("[MIGRATION] Disconnected from MongoDB");
  } catch (error) {
    console.error("[MIGRATION] Error:", error);
    process.exit(1);
  }
};

// Run migration
migrate();

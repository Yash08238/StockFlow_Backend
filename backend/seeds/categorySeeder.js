/**
 * Category Seeder
 * Seeds default SYSTEM categories on startup (idempotent)
 */

const Category = require("../models/Category");

const DEFAULT_CATEGORIES = [
  "Groceries",
  "Electronics",
  "Clothing",
  "Pharmacy",
  "Stationery",
  "Books",
  "Sports",
  "Home & Kitchen",
  "Beauty & Personal Care",
  "Automotive",
];

/**
 * Seed default SYSTEM categories
 * Only creates categories that don't already exist
 */
const seedCategories = async () => {
  try {
    console.log("[SEEDER] Checking for SYSTEM categories...");

    for (const categoryName of DEFAULT_CATEGORIES) {
      // Check if already exists
      const existing = await Category.findOne({
        name: categoryName,
        type: "SYSTEM",
        owner: null,
      });

      if (!existing) {
        await Category.create({
          name: categoryName,
          type: "SYSTEM",
          owner: null,
        });
        console.log(`[SEEDER] Created SYSTEM category: ${categoryName}`);
      }
    }

    const count = await Category.countDocuments({ type: "SYSTEM" });
    console.log(`[SEEDER] SYSTEM categories ready: ${count} total`);
  } catch (error) {
    console.error("[SEEDER] Error seeding categories:", error);
  }
};

module.exports = { seedCategories, DEFAULT_CATEGORIES };

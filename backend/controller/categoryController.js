const Category = require("../models/Category");
const Product = require("../models/Product");
const successResponse = require("../responses/successResponse");
const errorResponse = require("../responses/errorResponse");

const categoryController = {
  /**
   * Get all categories (SYSTEM + user's CUSTOM)
   * GET /api/categories
   */
  getCategories: async (req, res) => {
    try {
      const userId = req.user.userId;

      // Get SYSTEM categories + user's CUSTOM categories
      const categories = await Category.find({
        $or: [{ type: "SYSTEM" }, { type: "CUSTOM", owner: userId }],
      }).sort({ type: 1, name: 1 });

      // Group by type for frontend convenience
      const grouped = {
        system: categories.filter((c) => c.type === "SYSTEM"),
        custom: categories.filter((c) => c.type === "CUSTOM"),
      };

      successResponse(
        res,
        { categories, grouped },
        "Categories retrieved successfully"
      );
    } catch (error) {
      console.error("Get categories error:", error);
      errorResponse(res, 500, "Internal Server Error", error);
    }
  },

  /**
   * Create a new CUSTOM category
   * POST /api/categories
   */
  createCategory: async (req, res) => {
    try {
      const { name } = req.body;
      const userId = req.user.userId;

      if (!name || !name.trim()) {
        return errorResponse(res, 400, "Category name is required");
      }

      const trimmedName = name.trim();

      // Check if name already exists for this user (CUSTOM) or as SYSTEM
      const existing = await Category.findOne({
        name: { $regex: new RegExp(`^${trimmedName}$`, "i") },
        $or: [{ owner: userId }, { type: "SYSTEM" }],
      });

      if (existing) {
        return errorResponse(
          res,
          409,
          "Category with this name already exists"
        );
      }

      const category = new Category({
        name: trimmedName,
        type: "CUSTOM",
        owner: userId,
      });

      await category.save();

      successResponse(res, category, "Category created successfully");
    } catch (error) {
      console.error("Create category error:", error);
      if (error.code === 11000) {
        return errorResponse(
          res,
          409,
          "Category with this name already exists"
        );
      }
      errorResponse(res, 500, "Internal Server Error", error);
    }
  },

  /**
   * Update a CUSTOM category
   * PUT /api/categories/:id
   */
  updateCategory: async (req, res) => {
    try {
      const { id } = req.params;
      const { name } = req.body;
      const userId = req.user.userId;

      if (!name || !name.trim()) {
        return errorResponse(res, 400, "Category name is required");
      }

      const category = await Category.findById(id);

      if (!category) {
        return errorResponse(res, 404, "Category not found");
      }

      // Cannot edit SYSTEM categories
      if (category.type === "SYSTEM") {
        return errorResponse(res, 403, "Cannot modify SYSTEM categories");
      }

      // Must be owner
      if (category.owner.toString() !== userId) {
        return errorResponse(
          res,
          403,
          "Not authorized to modify this category"
        );
      }

      const trimmedName = name.trim();

      // Check if new name conflicts
      const existing = await Category.findOne({
        _id: { $ne: id },
        name: { $regex: new RegExp(`^${trimmedName}$`, "i") },
        $or: [{ owner: userId }, { type: "SYSTEM" }],
      });

      if (existing) {
        return errorResponse(
          res,
          409,
          "Category with this name already exists"
        );
      }

      category.name = trimmedName;
      await category.save();

      successResponse(res, category, "Category updated successfully");
    } catch (error) {
      console.error("Update category error:", error);
      errorResponse(res, 500, "Internal Server Error", error);
    }
  },

  /**
   * Delete a CUSTOM category
   * DELETE /api/categories/:id
   */
  deleteCategory: async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.userId;

      const category = await Category.findById(id);

      if (!category) {
        return errorResponse(res, 404, "Category not found");
      }

      // Cannot delete SYSTEM categories
      if (category.type === "SYSTEM") {
        return errorResponse(res, 403, "Cannot delete SYSTEM categories");
      }

      // Must be owner
      if (category.owner.toString() !== userId) {
        return errorResponse(
          res,
          403,
          "Not authorized to delete this category"
        );
      }

      // Check if products are using this category
      const productCount = await Product.countDocuments({
        categoryId: id,
        owner: userId,
      });

      if (productCount > 0) {
        return errorResponse(
          res,
          400,
          `Cannot delete: Category is used by ${productCount} product(s). Please reassign products first.`
        );
      }

      await Category.findByIdAndDelete(id);

      successResponse(res, null, "Category deleted successfully");
    } catch (error) {
      console.error("Delete category error:", error);
      errorResponse(res, 500, "Internal Server Error", error);
    }
  },
};

module.exports = categoryController;

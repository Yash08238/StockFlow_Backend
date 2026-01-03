const express = require("express");
const router = express.Router();
const categoryController = require("../controller/categoryController");
const verifyToken = require("../middlewares/authMiddleware");

// Get all categories (SYSTEM + user's CUSTOM)
router.get("/", verifyToken, categoryController.getCategories);

// Create new CUSTOM category
router.post("/", verifyToken, categoryController.createCategory);

// Update CUSTOM category
router.put("/:id", verifyToken, categoryController.updateCategory);

// Delete CUSTOM category
router.delete("/:id", verifyToken, categoryController.deleteCategory);

module.exports = router;

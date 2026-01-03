const express = require("express");
const router = express.Router();
const verifyToken = require("../middlewares/authMiddleware");
const RestockLog = require("../models/RestockLog");
const Product = require("../models/Product");
const auditLogger = require("../utils/auditLogger");
const notificationService = require("../utils/notificationService");
const successResponse = require("../responses/successResponse");
const errorResponse = require("../responses/errorResponse");

/**
 * Add stock to a product (with history logging)
 * POST /api/restock
 */
router.post("/", verifyToken, async (req, res) => {
  try {
    const { productId, quantity, supplierName, costPrice } = req.body;
    const userId = req.user.userId;

    if (!productId || !quantity || quantity <= 0) {
      return errorResponse(
        res,
        400,
        "Product ID and positive quantity required"
      );
    }

    const product = await Product.findOne({ _id: productId, owner: userId });
    if (!product) {
      return errorResponse(res, 404, "Product not found or unauthorized");
    }

    const beforeState = product.toObject();

    // Update inventory
    product.inventory += parseInt(quantity);
    if (costPrice) {
      product.lastPurchaseCost = costPrice;
    }
    if (supplierName) {
      product.preferredSupplierName = supplierName;
    }
    await product.save();

    // Create restock log
    const restockLog = new RestockLog({
      productId: product._id,
      quantityAdded: parseInt(quantity),
      restockedBy: userId,
      supplierName: supplierName || null,
      costPrice: costPrice || null,
      source: "RESTOCK",
    });
    await restockLog.save();

    // Audit log
    await auditLogger.log(
      userId,
      "RESTOCK",
      "inventory",
      product._id,
      beforeState,
      product.toObject()
    );

    successResponse(res, { product, restockLog }, "Stock added successfully");
  } catch (error) {
    console.error("Restock error:", error);
    errorResponse(res, 500, "Internal Server Error", error);
  }
});

/**
 * Get restock history for a product
 * GET /api/restock/history/:productId
 */
router.get("/history/:productId", verifyToken, async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.userId;

    // Verify product ownership
    const product = await Product.findOne({ _id: productId, owner: userId });
    if (!product) {
      return errorResponse(res, 404, "Product not found or unauthorized");
    }

    const history = await RestockLog.find({ productId })
      .sort({ restockedAt: -1 })
      .limit(50);

    successResponse(res, history, "Restock history retrieved successfully");
  } catch (error) {
    console.error("Restock history error:", error);
    errorResponse(res, 500, "Internal Server Error", error);
  }
});

/**
 * Get suggested restock quantity
 * GET /api/restock/suggested/:productId?leadTime=7
 */
router.get("/suggested/:productId", verifyToken, async (req, res) => {
  try {
    const { productId } = req.params;
    const { leadTime = 7 } = req.query;
    const userId = req.user.userId;

    const product = await Product.findOne({ _id: productId, owner: userId });
    if (!product) {
      return errorResponse(res, 404, "Product not found or unauthorized");
    }

    const dailySalesAvg = product.dailySalesAvg || 0;
    const suggestedQty = Math.ceil(dailySalesAvg * parseInt(leadTime));
    const currentInventory = product.inventory;
    const daysLeft =
      dailySalesAvg > 0 ? Math.round(currentInventory / dailySalesAvg) : null;

    successResponse(
      res,
      {
        productId: product._id,
        productName: product.name,
        currentInventory,
        dailySalesAvg,
        leadTime: parseInt(leadTime),
        suggestedQty,
        daysLeft,
        minThreshold: product.minThreshold,
      },
      "Suggested restock quantity calculated"
    );
  } catch (error) {
    console.error("Suggested restock error:", error);
    errorResponse(res, 500, "Internal Server Error", error);
  }
});

module.exports = router;

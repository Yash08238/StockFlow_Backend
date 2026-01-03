const express = require("express");
const router = express.Router();
const reportController = require("../controller/reportController");
const verifyToken = require("../middlewares/authMiddleware");

// Existing route
router.get(
  "/monthlysales/:month/:year",
  verifyToken,
  reportController.getMonthlySales
);

// New advanced report routes
router.get(
  "/revenue-by-product",
  verifyToken,
  reportController.getRevenueByProduct
);
router.get(
  "/revenue-by-date",
  verifyToken,
  reportController.getRevenueByDateRange
);
router.get("/top-products", verifyToken, reportController.getTopProducts);
router.get("/dead-stock", verifyToken, reportController.getDeadStock);
router.get("/profit-summary", verifyToken, reportController.getProfitSummary);

module.exports = router;

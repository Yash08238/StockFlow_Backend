const Sales = require("../models/Sales");
const Product = require("../models/Product");
const successResponse = require("../responses/successResponse");
const errorResponse = require("../responses/errorResponse");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

const reportController = {
  /**
   * Get monthly sales (existing functionality preserved)
   */
  getMonthlySales: async (req, res) => {
    try {
      const { month, year } = req.params;

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59, 999);

      const owner = req.user.userId;

      const sales = await Sales.find({
        owner: owner,
        date: {
          $gte: startDate,
          $lte: endDate,
        },
      }).sort({ date: 1 });

      const salesByProduct = {};
      const profitByProduct = {};
      let totalSales = 0;
      let totalAmount = 0;
      let totalProfit = 0;

      sales.forEach((sale) => {
        const productName = sale.product.productName;
        if (!salesByProduct[productName]) {
          salesByProduct[productName] = 0;
          profitByProduct[productName] = 0;
        }
        salesByProduct[productName] += sale.amount;

        const cp = sale.cp || 0;
        const profit = sale.amount - cp * sale.quantity;

        profitByProduct[productName] += profit;
        totalProfit += profit;

        totalSales++;
        totalAmount += sale.amount;
      });

      const labels = Object.keys(salesByProduct);
      const data = Object.values(salesByProduct);
      const profitData = Object.values(profitByProduct);

      const responseData = {
        totalSales: totalSales,
        totalAmount: `₹ ${totalAmount}`,
        profit: `₹ ${totalProfit}`,
        chartData: {
          labels: labels,
          data: data,
          profitData: profitData,
        },
      };

      successResponse(
        res,
        responseData,
        "Monthly sales data retrieved successfully"
      );
    } catch (error) {
      console.error(error);
      errorResponse(res, 500, "Internal Server Error", error);
    }
  },

  /**
   * Revenue by Product (Aggregation)
   */
  getRevenueByProduct: async (req, res) => {
    try {
      const owner = new ObjectId(req.user.userId);

      const result = await Sales.aggregate([
        { $match: { owner } },
        {
          $group: {
            _id: "$product.productId",
            productName: { $first: "$product.productName" },
            totalRevenue: { $sum: "$amount" },
            totalQuantity: { $sum: "$quantity" },
            salesCount: { $sum: 1 },
          },
        },
        { $sort: { totalRevenue: -1 } },
      ]);

      successResponse(res, result, "Revenue by product retrieved successfully");
    } catch (error) {
      console.error(error);
      errorResponse(res, 500, "Internal Server Error", error);
    }
  },

  /**
   * Revenue by Date Range (for charts)
   */
  getRevenueByDateRange: async (req, res) => {
    try {
      const owner = new ObjectId(req.user.userId);
      const { startDate, endDate, groupBy = "day" } = req.query;

      const matchStage = { owner };

      if (startDate && endDate) {
        matchStage.date = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }

      let groupFormat;
      switch (groupBy) {
        case "week":
          groupFormat = { $week: "$date" };
          break;
        case "month":
          groupFormat = { $month: "$date" };
          break;
        default:
          groupFormat = {
            $dateToString: { format: "%Y-%m-%d", date: "$date" },
          };
      }

      const result = await Sales.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: groupFormat,
            revenue: { $sum: "$amount" },
            salesCount: { $sum: 1 },
            quantitySold: { $sum: "$quantity" },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      successResponse(
        res,
        result,
        "Revenue by date range retrieved successfully"
      );
    } catch (error) {
      console.error(error);
      errorResponse(res, 500, "Internal Server Error", error);
    }
  },

  /**
   * Top 5 Selling Products
   */
  getTopProducts: async (req, res) => {
    try {
      const owner = new ObjectId(req.user.userId);

      const result = await Sales.aggregate([
        { $match: { owner } },
        {
          $group: {
            _id: "$product.productId",
            productName: { $first: "$product.productName" },
            totalQuantity: { $sum: "$quantity" },
            totalRevenue: { $sum: "$amount" },
          },
        },
        { $sort: { totalQuantity: -1 } },
        { $limit: 5 },
      ]);

      successResponse(res, result, "Top products retrieved successfully");
    } catch (error) {
      console.error(error);
      errorResponse(res, 500, "Internal Server Error", error);
    }
  },

  /**
   * Dead Stock Report (no sales in 30 days or never)
   */
  getDeadStock: async (req, res) => {
    try {
      const owner = new ObjectId(req.user.userId);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const deadProducts = await Product.find({
        owner,
        $or: [{ lastSoldAt: { $lt: thirtyDaysAgo } }, { lastSoldAt: null }],
        inventory: { $gt: 0 },
      }).select("name inventory category lastSoldAt minThreshold");

      const result = deadProducts.map((p) => ({
        _id: p._id,
        name: p.name,
        inventory: p.inventory,
        category: p.category,
        lastSoldAt: p.lastSoldAt,
        daysSinceLastSale: p.lastSoldAt
          ? Math.floor((Date.now() - p.lastSoldAt) / (1000 * 60 * 60 * 24))
          : null,
      }));

      successResponse(res, result, "Dead stock retrieved successfully");
    } catch (error) {
      console.error(error);
      errorResponse(res, 500, "Internal Server Error", error);
    }
  },

  /**
   * Profit/Loss Summary
   */
  getProfitSummary: async (req, res) => {
    try {
      const owner = new ObjectId(req.user.userId);
      const { startDate, endDate } = req.query;

      const matchStage = { owner };
      if (startDate && endDate) {
        matchStage.date = {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        };
      }

      const result = await Sales.aggregate([
        { $match: matchStage },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: "$amount" },
            totalCost: { $sum: { $multiply: ["$cp", "$quantity"] } },
            totalQuantity: { $sum: "$quantity" },
            salesCount: { $sum: 1 },
          },
        },
        {
          $project: {
            _id: 0,
            totalRevenue: 1,
            totalCost: 1,
            totalProfit: { $subtract: ["$totalRevenue", "$totalCost"] },
            totalQuantity: 1,
            salesCount: 1,
          },
        },
      ]);

      successResponse(
        res,
        result[0] || {
          totalRevenue: 0,
          totalCost: 0,
          totalProfit: 0,
          totalQuantity: 0,
          salesCount: 0,
        },
        "Profit summary retrieved successfully"
      );
    } catch (error) {
      console.error(error);
      errorResponse(res, 500, "Internal Server Error", error);
    }
  },
};

module.exports = reportController;

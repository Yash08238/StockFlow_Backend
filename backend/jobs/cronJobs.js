/**
 * Cron Jobs for H5 ERP
 * Runs scheduled tasks for notifications and forecasting
 */

const cron = require("node-cron");
const Product = require("../models/Product");
const User = require("../models/User");
const Sales = require("../models/Sales");
const notificationService = require("../utils/notificationService");

/**
 * Recalculate daily sales average for all products
 */
const recalculateDailySalesAvg = async () => {
  console.log("[CRON] Starting dailySalesAvg recalculation...");

  try {
    const products = await Product.find({});

    for (const product of products) {
      // Get all sales for this product
      const totalQuantitySold = await Sales.aggregate([
        { $match: { "product.productId": product._id } },
        { $group: { _id: null, total: { $sum: "$quantity" } } },
      ]);

      const firstSale = await Sales.findOne({
        "product.productId": product._id,
      }).sort({ date: 1 });

      if (firstSale && totalQuantitySold[0]) {
        const daysSinceFirstSale = Math.max(
          1,
          Math.ceil((Date.now() - firstSale.date) / (1000 * 60 * 60 * 24))
        );

        product.dailySalesAvg = totalQuantitySold[0].total / daysSinceFirstSale;
      } else {
        product.dailySalesAvg = 0;
      }
      await product.save();
    }

    console.log(`[CRON] Updated dailySalesAvg for ${products.length} products`);
  } catch (error) {
    console.error("[CRON] Error recalculating dailySalesAvg:", error);
  }
};

/**
 * Check for dead stock and generate notifications
 */
const checkDeadStockForAllUsers = async () => {
  console.log("[CRON] Checking for dead stock...");

  try {
    const users = await User.find({});

    for (const user of users) {
      await notificationService.checkDeadStock(user._id);
    }

    console.log(`[CRON] Dead stock check completed for ${users.length} users`);
  } catch (error) {
    console.error("[CRON] Error checking dead stock:", error);
  }
};

/**
 * Check for forecast warnings for all products
 */
const checkForecastWarningsForAllUsers = async () => {
  console.log("[CRON] Checking for forecast warnings...");

  try {
    const products = await Product.find({ dailySalesAvg: { $gt: 0 } });

    for (const product of products) {
      await notificationService.checkForecast(product, product.owner);
    }

    console.log(
      `[CRON] Forecast check completed for ${products.length} products`
    );
  } catch (error) {
    console.error("[CRON] Error checking forecasts:", error);
  }
};

/**
 * Check for low stock and generate restock reminders
 */
const checkLowStockForAllProducts = async () => {
  console.log("[CRON] Checking for low stock...");

  try {
    const products = await Product.find({});

    for (const product of products) {
      const threshold = product.minThreshold || 10;

      if (product.inventory <= threshold) {
        // Calculate suggested restock quantity
        const leadTime = 7; // Default lead time
        const suggestedQty = Math.ceil(product.dailySalesAvg * leadTime);

        if (suggestedQty > 0) {
          await notificationService.createRestockReminder(
            product,
            product.owner,
            suggestedQty
          );
        } else {
          await notificationService.checkLowStock(product, product.owner);
        }
      }
    }

    console.log(
      `[CRON] Low stock check completed for ${products.length} products`
    );
  } catch (error) {
    console.error("[CRON] Error checking low stock:", error);
  }
};

/**
 * Retry generating bills for failed sales
 */
const retryFailedBills = async () => {
  console.log("[CRON] Retrying failed bills...");
  try {
    const Sales = require("../models/Sales");
    const generateBillPDF = require("../src/billGenerator");
    const sendEmail = require("../src/emailSender");
    const cloudinaryUpload = require("../utils/cloudinaryUpload");
    const path = require("path");
    const fs = require("fs");

    // Find sales with FAILED status
    const failedSales = await Sales.find({ billStatus: "FAILED" }).limit(10); // Batch size 10

    for (const sale of failedSales) {
      // Re-attempt bill generation logic
      const billData = {
        customerName: sale.customer,
        customermail: sale.customermail,
        sales: [
          {
            productName: sale.product.productName,
            quantity: sale.quantity,
            price: sale.price,
            amount: sale.amount,
          },
        ],
      };

      const fileName = `retry_bill_${sale._id}.pdf`;
      const pdfFilePath = path.join(__dirname, "../pdfs", fileName);

      try {
        if (!fs.existsSync(path.join(__dirname, "../pdfs"))) {
          fs.mkdirSync(path.join(__dirname, "../pdfs"), { recursive: true });
        }

        generateBillPDF(billData, pdfFilePath);
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const uploadResult = await cloudinaryUpload.uploadPDF(
          pdfFilePath,
          "h5erp_bills"
        );
        sale.pdfUrl = uploadResult.secure_url;
        sale.billStatus = "GENERATED";
        await sale.save();

        const emailSubject = "Your Purchase Receipt - H5 ERP";
        const emailBody = `Dear ${sale.customer},\n\nThank you for your purchase!\n\nPlease find your bill attached to this email.\n\nIf you have any questions, please don't hesitate to contact us.\n\nBest regards,\nH5 ERP`;

        await sendEmail(
          sale.customermail,
          emailSubject,
          emailBody,
          pdfFilePath
        );
        console.log(`[CRON] Retry successful for sale ${sale._id}`);

        fs.unlinkSync(pdfFilePath);
      } catch (retryError) {
        console.error(`[CRON] Retry failed for sale ${sale._id}:`, retryError);
        // Clean up
        if (fs.existsSync(pdfFilePath)) fs.unlinkSync(pdfFilePath);
      }
    }
  } catch (error) {
    console.error("[CRON] Error retrying bills:", error);
  }
};

/**
 * Initialize all cron jobs
 */
const initCronJobs = () => {
  console.log("[CRON] Initializing cron jobs...");

  // Daily at 2:00 AM - Recalculate daily sales averages
  cron.schedule("0 2 * * *", () => {
    recalculateDailySalesAvg();
  });

  // Daily at 2:30 AM - Check for dead stock
  cron.schedule("30 2 * * *", () => {
    checkDeadStockForAllUsers();
  });

  // Daily at 3:00 AM - Check forecast warnings
  cron.schedule("0 3 * * *", () => {
    checkForecastWarningsForAllUsers();
  });

  // Daily at 3:30 AM - Check low stock and generate restock reminders
  cron.schedule("30 3 * * *", () => {
    checkLowStockForAllProducts();
  });

  // Hourly - Retry failed bills
  cron.schedule("0 * * * *", () => {
    retryFailedBills();
  });

  console.log("[CRON] Cron jobs initialized successfully");
  console.log("[CRON] Schedule:");
  console.log("  - Hourly: Retry failed bills");
  console.log("  - 2:00 AM: Recalculate dailySalesAvg");
  console.log("  - 2:30 AM: Check dead stock");
  console.log("  - 3:00 AM: Check forecast warnings");
  console.log("  - 3:30 AM: Check low stock / restock reminders");
};

module.exports = {
  initCronJobs,
  recalculateDailySalesAvg,
  checkDeadStockForAllUsers,
  checkForecastWarningsForAllUsers,
  checkLowStockForAllProducts,
  retryFailedBills,
};

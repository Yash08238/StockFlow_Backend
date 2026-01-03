const Sales = require("../models/Sales");
const Product = require("../models/Product");
const ProductImage = require("../models/ProductImage");
const User = require("../models/User");
const successResponse = require("../responses/successResponse");
const errorResponse = require("../responses/errorResponse");
const generateBillPDF = require("../src/billGenerator");
const sendEmail = require("../src/emailSender");
const path = require("path");
const fs = require("fs");
const cloudinaryUpload = require("../utils/cloudinaryUpload");
const auditLogger = require("../utils/auditLogger");
const notificationService = require("../utils/notificationService");

const salesController = {
  createSale: async (req, res) => {
    try {
      const { customer, customermail, products, discount = 0 } = req.body;
      const owner = req.user.userId;

      // Validate discount
      if (discount < 0 || discount > 100) {
        return errorResponse(res, 400, "Invalid discount percentage");
      }

      // ============ PHASE 1: VALIDATE ALL PRODUCTS FIRST (HARD LOCK) ============
      // Check all products BEFORE making any changes
      const validationErrors = [];
      const productData = [];

      for (const item of products) {
        const { productId, quantity } = item;

        const product = await Product.findOne({ _id: productId, owner: owner });

        if (!product) {
          validationErrors.push(
            `Product ${productId} not found or unauthorized`
          );
          continue;
        }

        // HARD LOCK: Prevent negative inventory
        if (product.inventory < quantity) {
          validationErrors.push(
            `Insufficient inventory for "${product.name}". Available: ${product.inventory}, Requested: ${quantity}`
          );
          continue;
        }

        productData.push({ product, quantity });
      }

      // If any validation errors, abort entire sale
      if (validationErrors.length > 0) {
        return errorResponse(res, 400, validationErrors.join("; "));
      }

      // ============ PHASE 2: PROCESS SALE ============
      const createdSales = [];
      const billProducts = [];
      const bulkProductUpdates = [];
      const bulkSalesInserts = [];

      for (const { product, quantity } of productData) {
        // Deduct inventory
        product.inventory -= quantity;

        // Update lastSoldAt for dead stock tracking
        product.lastSoldAt = new Date();

        // Note: dailySalesAvg will be recalculated by cron job at 2:00 AM
        // Skip expensive real-time calculation to improve performance

        
        // Calculate amount
        const price = product.price;
        const itemSubtotal = price * quantity;
        const discountAmount = (itemSubtotal * discount) / 100;
        const amount = itemSubtotal - discountAmount;
        const cp = product.cp || 0;

        // Prepare sale record (don't save yet)
        const newSale = {
          customer,
          customermail,
          owner,
          product: {
            productId: product._id,
            productName: product.name,
          },
          quantity,
          price,
          cp,
          amount,
          subtotal: itemSubtotal,
          discount: discount,
          date: new Date(),
          billStatus: "PENDING",
        };

        bulkSalesInserts.push(newSale);
        
        // Store product reference for later processing
        bulkProductUpdates.push(product);

        // Prepare bill data (we'll fetch images in bulk later)
        billProducts.push({
          ...newSale,
          productId: product._id,
        });
      }

      // Bulk save all products at once
      await Promise.all(bulkProductUpdates.map(p => p.save()));

      // Bulk insert all sales at once
      const savedSales = await Sales.insertMany(bulkSalesInserts);
      createdSales.push(...savedSales);

      // Fetch all product images in one query
      const productIds = bulkProductUpdates.map(p => p._id);
      const productImages = await ProductImage.find({
        productId: { $in: productIds }
      });

      // Create image lookup map
      const imageMap = {};
      productImages.forEach(img => {
        imageMap[img.productId.toString()] = img.requestfile.imageUrl;
      });

      // Add images to bill products
      billProducts.forEach(bp => {
        bp.image = imageMap[bp.productId.toString()] || null;
      });

      // ============ PHASE 3: TRIGGER NOTIFICATIONS (async, non-blocking) ============
      // Process notifications asynchronously without blocking response
      Promise.all(
        bulkProductUpdates.map(async (product) => {
          await notificationService.checkLowStock(product, owner);
          await notificationService.checkForecast(product, owner);
        })
      ).catch(err => console.error("Notification error:", err));

      // Audit logs (async, non-blocking)
      Promise.all(
        savedSales.map(sale => 
          auditLogger.log(owner, "CREATE_SALE", "sale", sale._id, null, sale.toObject())
        )
      ).catch(err => console.error("Audit log error:", err));

      // ============ PHASE 4: GENERATE BILL PDF & UPLOAD ============
      const billData = {
        customerName: customer,
        customermail: customermail,
        sales: billProducts,
        discountPercentage: discount,
        subtotal: billProducts.reduce((sum, item) => sum + item.subtotal, 0),
        discountAmount: billProducts.reduce(
          (sum, item) => sum + (item.subtotal - item.amount),
          0
        ),
      };

      const pdfBuffer = await generateBillPDF(billData);
      console.log(`📄 Generated PDF Buffer: ${pdfBuffer.length} bytes`);

      let pdfUrl = null;

      // Upload to Cloudinary
      try {
        const uploadResult = await cloudinaryUpload.uploadFromBuffer(
          pdfBuffer,
          "stockflow_bills"
        );
        pdfUrl = uploadResult.secure_url;

        // Update all sales with PDF URL (bulk update)
        await Sales.updateMany(
          { _id: { $in: createdSales.map(s => s._id) } },
          { $set: { pdfUrl: pdfUrl, billStatus: "GENERATED" } }
        );
        console.log("✅ PDF Generated & Uploaded:", pdfUrl);
      } catch (uploadError) {
        console.error("❌ Cloudinary Upload Error:", uploadError.message);
        await Sales.updateMany(
          { _id: { $in: createdSales.map(s => s._id) } },
          { $set: { billStatus: "FAILED" } }
        );
      }

      // ============ PHASE 5: SEND EMAIL (async, non-blocking) ============
      const emailSubject = "Your Purchase Receipt - StockFlow ERP";
      const emailBody = `Dear ${customer},\n\nThank you for your purchase!\n\nPlease find your bill attached to this email.\n\nIf you have any questions, please don't hesitate to contact us.\n\nBest regards,\nStockFlow ERP`;

      // Send email asynchronously without blocking response
      sendEmail(customermail, emailSubject, emailBody, pdfBuffer)
        .then(() => console.log("✅ Email sent successfully to", customermail))
        .catch(err => console.error("❌ Email sending failed:", err.message));

      // Update user stats (async)
      User.findByIdAndUpdate(owner, {
        $inc: { "stats.totalSalesCreated": createdSales.length },
      }).catch(err => console.error("Stats update error:", err));

      successResponse(
        res,
        createdSales,
        "Sales created & Bill uploaded successfully"
      );
    } catch (error) {
      console.error(error);
      errorResponse(res, 500, "Internal Server Error", error);
    }
  },

  getSales: async (req, res) => {
    try {
      const owner = req.user.userId;

      let sales = await Sales.find({ owner: owner }).sort({ date: -1 });

      sales = sales.map((sale) => ({
        _id: sale._id,
        customer: sale.customer,
        customermail: sale.customermail,
        product: sale.product,
        quantity: sale.quantity,
        amount: sale.amount,
        date: sale.date.toISOString().split("T")[0],
        pdfUrl: cloudinaryUpload.getDownloadUrl(sale.pdfUrl),
      }));

      successResponse(res, sales, "Sales retrieved successfully");
    } catch (error) {
      console.error(error);
      errorResponse(res, 500, "Internal Server Error", error);
    }
  },

  downloadBill: async (req, res) => {
    try {
      const { id } = req.params;
      const owner = req.user.userId;

      const sale = await Sales.findOne({ _id: id, owner: owner });

      if (!sale)
        return errorResponse(res, 404, "Sale not found or unauthorized");

      if (sale.pdfUrl) {
        return res.redirect(sale.pdfUrl);
      }

      return errorResponse(res, 404, "Bill not found");
    } catch (error) {
      console.error(error);
      errorResponse(res, 500, "Internal Server Error", error);
    }
  },
};

module.exports = salesController;

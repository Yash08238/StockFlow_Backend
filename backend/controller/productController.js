const ProductImage = require("../models/ProductImage");
const Product = require("../models/Product");
const User = require("../models/User");
const Category = require("../models/Category");
const successResponse = require("../responses/successResponse");
const errorResponse = require("../responses/errorResponse");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const cloudinaryUpload = require("../utils/cloudinaryUpload");
const auditLogger = require("../utils/auditLogger");
const notificationService = require("../utils/notificationService");

const productController = {
  createProduct: async (req, res) => {
    try {
      const {
        name,
        price,
        cp,
        inventory,
        category, // Legacy field (string)
        categoryId, // New field (ObjectId)
        // New fields
        minThreshold,
        preferredSupplierName,
        lastPurchaseCost,
        // Base64 image (from camera capture)
        base64Image,
      } = req.body;
      const owner = req.user.userId;

      // Validate category
      let validCategoryId = null;
      let categoryName = category; // Fallback to legacy string

      if (categoryId) {
        // New categoryId provided - validate it
        const cat = await Category.findById(categoryId);
        if (!cat) {
          return errorResponse(res, 400, "Invalid category ID");
        }
        // Must be SYSTEM or owned by this user
        if (cat.type === "CUSTOM" && cat.owner.toString() !== owner) {
          return errorResponse(res, 403, "Not authorized to use this category");
        }
        validCategoryId = cat._id;
        categoryName = cat.name;
      } else if (category) {
        // Legacy category string - try to find matching SYSTEM category
        const systemCat = await Category.findOne({
          name: { $regex: new RegExp(`^${category}$`, "i") },
          type: "SYSTEM",
        });
        if (systemCat) {
          validCategoryId = systemCat._id;
        }
        // Keep legacy string for backward compatibility
      }

      let imageUrl = null;

      // Handle image upload - either from file or base64
      if (req.file) {
        imageUrl = req.file.path;
      } else if (base64Image) {
        const uploadResult = await cloudinaryUpload.uploadFromBase64(
          base64Image,
          "h5erp_uploads"
        );
        imageUrl = uploadResult.secure_url;
      } else {
        return errorResponse(
          res,
          400,
          "Image file or base64 image is required"
        );
      }

      // Create a new ProductImage document
      const newProductImage = new ProductImage({
        requestfile: {
          imageUrl: imageUrl,
          contentType: req.file ? req.file.mimetype : "image/jpeg",
        },
        productId: null,
      });

      const savedProductImage = await newProductImage.save();

      // Create product with both categoryId and legacy category
      const newProduct = new Product({
        name,
        price,
        cp,
        inventory,
        categoryId: validCategoryId,
        category: categoryName, // Keep legacy field populated
        owner,
        minThreshold: minThreshold || 10,
        preferredSupplierName: preferredSupplierName || null,
        lastPurchaseCost: lastPurchaseCost || null,
        dailySalesAvg: 0,
        lastSoldAt: null,
      });

      const savedProduct = await newProduct.save();

      savedProductImage.productId = savedProduct._id;
      await savedProductImage.save();

      // Update user stats
      await User.findByIdAndUpdate(owner, {
        $inc: { "stats.totalProductsAdded": 1 },
      });

      // Audit log
      await auditLogger.log(
        owner,
        "CREATE_PRODUCT",
        "product",
        savedProduct._id,
        null,
        savedProduct.toObject()
      );

      successResponse(
        res,
        { product: savedProduct, imageUrl },
        "Product created successfully"
      );
    } catch (error) {
      console.error(error);
      errorResponse(res, 500, "Internal Server Error", error);
    }
  },

  getProducts: async (req, res) => {
    try {
      const owner = req.user.userId;
      const products = await Product.aggregate([
        {
          $match: { owner: new ObjectId(owner) },
        },
        {
          $lookup: {
            from: "productimages",
            localField: "_id",
            foreignField: "productId",
            as: "images",
          },
        },
        {
          $lookup: {
            from: "categories",
            localField: "categoryId",
            foreignField: "_id",
            as: "categoryInfo",
          },
        },
      ]);

      const productsWithImages = products.map((product) => {
        let image = null;
        if (
          product.images.length > 0 &&
          product.images[0].requestfile.imageUrl
        ) {
          image = { imageUrl: product.images[0].requestfile.imageUrl };
        }

        return {
          _id: product._id,
          name: product.name,
          price: product.price,
          cp: product.cp,
          inventory: product.inventory,
          category: product.category, // Legacy string
          categoryId: product.categoryId,
          categoryInfo: product.categoryInfo[0] || null,
          minThreshold: product.minThreshold,
          image: image,
        };
      });

      successResponse(
        res,
        productsWithImages,
        "Products retrieved successfully"
      );
    } catch (error) {
      console.error(error);
      errorResponse(res, 500, "Internal Server Error", error);
    }
  },

  getProductDetails: async (req, res) => {
    try {
      const productId = req.params.id;
      console.log("test", productId);
      const productDetails = await Product.aggregate([
        {
          $match: { _id: new ObjectId(productId) },
        },
        {
          $lookup: {
            from: "productimages",
            localField: "_id",
            foreignField: "productId",
            as: "images",
          },
        },
      ]);

      if (productDetails.length === 0) {
        return errorResponse(res, 404, "Product not found");
      }

      successResponse(
        res,
        productDetails[0],
        "Product details retrieved successfully"
      );
    } catch (error) {
      console.error(error);
      errorResponse(res, 500, "Internal Server Error", error); // Pass the error object to the error response
    }
  },
  getProductsByCategory: async (req, res) => {
    try {
      const { category } = req.params;

      const products = await Product.aggregate([
        {
          $match: { category }, // Filter products by category
        },
        {
          $lookup: {
            from: "productimages",
            localField: "_id",
            foreignField: "productId",
            as: "images",
          },
        },
      ]);

      if (products.length === 0) {
        return errorResponse(
          res,
          404,
          "No products found for the given category"
        );
      }

      successResponse(res, products, "Products retrieved successfully");
    } catch (error) {
      console.error(error);
      errorResponse(res, 500, "Internal Server Error", error);
    }
  },
  addQuantityToProduct: async (req, res) => {
    try {
      const { productId, quantityToAdd } = req.body; // Product ID and Quantity to add

      // Check if productId is provided
      if (!productId) {
        return errorResponse(res, 400, "Product ID is required");
      }

      // Check if quantityToAdd is a valid number
      if (isNaN(quantityToAdd) || quantityToAdd <= 0) {
        return errorResponse(
          res,
          400,
          "Quantity to add must be a positive number"
        );
      }

      // Find the product by its ObjectId
      const product = await Product.findById(productId);

      // If the product doesn't exist, return an error
      if (!product) {
        return errorResponse(res, 404, "Product not found");
      }

      // Increase the inventory of the product by quantityToAdd
      product.inventory += parseInt(quantityToAdd);

      // Save the updated product
      await product.save();

      successResponse(res, { product }, "Inventory updated successfully!");
    } catch (error) {
      console.error(error);
      errorResponse(res, 500, "Internal Server Error", error);
    }
  },

  deleteProduct: async (req, res) => {
    try {
      const productId = req.params.id;
      const { cloudinary } = require("../config/cloudinaryConfig");

      // Find the product image to get the Cloudinary URL
      const productImage = await ProductImage.findOne({ productId });

      if (
        productImage &&
        productImage.requestfile &&
        productImage.requestfile.imageUrl
      ) {
        const imageUrl = productImage.requestfile.imageUrl;
        // Extract public ID from URL
        // Example: https://res.cloudinary.com/demo/image/upload/v1234567890/folder/my_image.jpg
        // Public ID: folder/my_image (without extension)
        try {
          const splitUrl = imageUrl.split("/");
          const filename = splitUrl[splitUrl.length - 1]; // my_image.jpg
          const publicIdWithExtension = imageUrl.substring(
            imageUrl.indexOf("h5erp_uploads")
          ); // Get path from folder
          const publicId = publicIdWithExtension.split(".")[0]; // Remove extension

          // Use the folder name from config if possible, or extract dynamically
          // A safer regex approach:
          const regex = /\/v\d+\/(.+)\.[a-z]+$/;
          const match = imageUrl.match(regex);
          if (match && match[1]) {
            await cloudinary.uploader.destroy(match[1]);
          }
        } catch (err) {
          console.error("Failed to delete image from Cloudinary:", err);
          // Continue to delete product even if image delete fails
        }
        await ProductImage.findByIdAndDelete(productImage._id);
      }

      const deletedProduct = await Product.findByIdAndDelete(productId);

      if (!deletedProduct) {
        return errorResponse(res, 404, "Product not found");
      }

      successResponse(res, null, "Product deleted successfully");
    } catch (error) {
      console.error(error);
      errorResponse(res, 500, "Internal Server Error", error);
    }
  },
};
module.exports = productController;

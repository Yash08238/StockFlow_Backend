const express = require("express");
const router = express.Router();
const productController = require("../controller/productController");
const multer = require("multer");

const { upload } = require("../config/cloudinaryConfig");

const verifyToken = require("../middlewares/authMiddleware");

router.post(
  "/createProduct",
  verifyToken,
  upload.single("image"),
  productController.createProduct
);
router.get("/getproducts", verifyToken, productController.getProducts);
router.get("/product/:id", verifyToken, productController.getProductDetails);
router.post("/supply", verifyToken, productController.addQuantityToProduct);
router.get(
  "/category/:category",
  verifyToken,
  productController.getProductsByCategory
);

router.delete("/delete/:id", verifyToken, productController.deleteProduct);

module.exports = router;

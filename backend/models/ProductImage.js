const mongoose = require("mongoose");

const productImageSchema = new mongoose.Schema({
  requestfile: {
    imageUrl: String,
  },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
});

const ProductImage = mongoose.model("ProductImage", productImageSchema);

module.exports = ProductImage;

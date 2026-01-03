const express = require("express");
const router = express.Router();
const salesController = require("../controller/salesController");
const verifyToken = require("../middlewares/authMiddleware");

router.post("/create", verifyToken, salesController.createSale);
router.get("/show", verifyToken, salesController.getSales);
router.get("/download/:id", verifyToken, salesController.downloadBill);
module.exports = router;

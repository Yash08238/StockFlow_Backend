const express = require("express");
const router = express.Router();
const forgotPassController= require("../controller/forgetPassController");

router.post("/forgot-password", forgotPassController.forgotPassword);

module.exports = router;

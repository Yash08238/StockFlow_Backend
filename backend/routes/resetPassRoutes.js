const express = require('express');
const router = express.Router();
const resetController = require('../controller/resetPassController');

router.post('/reset', resetController.resetPassword);

module.exports = router;

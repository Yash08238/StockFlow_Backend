// const express = require('express');
// const router = express.Router();
// const uploadController = require('../controller/uploadController');
// router.post('/image', uploadController, (req, res) => {
//         res.send('File uploaded successfully!');
// });
// module.exports = router;
// routes/route.js
const express = require('express');
const router = express.Router();
const uploads = require('../controller/uploadController');
router.post('/image',uploads);
module.exports = router;
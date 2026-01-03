// const multer = require('multer');
// const upload = multer({
//     storage: multer.diskStorage({
//         destination: function (req, file, cb) {
//             cb(null, "uploads");
//         },
//         filename: function (req, file, cb) {
//             cb(null, file.fieldname + "-" + Date.now() + ".jpg");
//         },
//     }),
// }).array("image_ex");
// module.exports = upload;
// controllers/uploadController.js
const mongoose = require("mongoose");
const { upload } = require("../config/cloudinaryConfig");
const multer = require("multer");

const File = mongoose.model("File", {
  originalname: String,
  filename: String,
  path: String,
});

// Create the middleware instance using the imported Cloudinary upload config
const uploadMiddleware = upload.array("mobile", 5);

const uploads = (req, res, next) => {
  uploadMiddleware(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      return res
        .status(400)
        .json({ error: "Multer error", details: err.message });
    } else if (err) {
      return res
        .status(500)
        .json({ error: "Internal server error", details: err.message });
    }

    // If no files were uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const files = req.files;
    const fileDocuments = files.map((file) => ({
      originalname: file.originalname,
      filename: file.filename, // Cloudinary Public ID
      path: file.path, // Cloudinary URL
    }));

    try {
      await File.create(fileDocuments);
      res.status(201).json({
        message: "Files uploaded successfully!",
        files: fileDocuments,
      });
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ error: "Failed to save file information to MongoDB" });
    }
  });
};
module.exports = uploads;

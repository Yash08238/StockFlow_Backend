/**
 * Cloudinary Upload Utility
 * Supports multipart/form-data files and base64 images
 */

const { cloudinary } = require("../config/cloudinaryConfig");
const fs = require("fs");
const path = require("path");

const cloudinaryUpload = {
  /**
   * Upload a file buffer or path to Cloudinary
   * @param {Object} file - Multer file object with path or buffer
   * @param {string} folder - Cloudinary folder name
   * @returns {Promise<{secure_url, public_id, resource_type}>}
   */
  uploadFromFile: async (file, folder = "stockflow_uploads") => {
    try {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: folder,
        resource_type: "auto",
      });

      return {
        secure_url: result.secure_url,
        public_id: result.public_id,
        resource_type: result.resource_type,
      };
    } catch (error) {
      console.error("Cloudinary upload error:", error);
      throw new Error("Failed to upload file to Cloudinary");
    }
  },

  /**
   * Upload a base64 encoded image to Cloudinary
   * @param {string} base64String - Base64 encoded image (with or without data URI prefix)
   * @param {string} folder - Cloudinary folder name
   * @returns {Promise<{secure_url, public_id, resource_type}>}
   */
  uploadFromBase64: async (base64String, folder = "stockflow_uploads") => {
    try {
      // Ensure proper data URI format
      let dataUri = base64String;
      if (!base64String.startsWith("data:")) {
        // Assume JPEG if no prefix
        dataUri = `data:image/jpeg;base64,${base64String}`;
      }

      const result = await cloudinary.uploader.upload(dataUri, {
        folder: folder,
        resource_type: "auto",
      });

      return {
        secure_url: result.secure_url,
        public_id: result.public_id,
        resource_type: result.resource_type,
      };
    } catch (error) {
      console.error("Cloudinary base64 upload error:", error);
      throw new Error("Failed to upload base64 image to Cloudinary");
    }
  },

  /**
   * Upload a PDF buffer to Cloudinary
   * @param {string} filePath - Local file path to PDF
   * @param {string} folder - Cloudinary folder name
   * @returns {Promise<{secure_url, public_id, resource_type}>}
   */
  uploadPDF: async (filePath, folder = "stockflow_bills") => {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder: folder,
        resource_type: "image",
        format: "pdf",
      });

      return {
        secure_url: result.secure_url,
        public_id: result.public_id,
        resource_type: result.resource_type,
      };
    } catch (error) {
      console.error("Cloudinary PDF upload error:", error);
      throw new Error("Failed to upload PDF to Cloudinary");
    }
  },

  /**
   * Delete a file from Cloudinary
   * @param {string} publicId - Cloudinary public ID
   * @param {string} resourceType - Type: 'image', 'video', 'raw'
   * @returns {Promise<boolean>}
   */
  deleteFromCloudinary: async (publicId, resourceType = "image") => {
    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
      });
      return result.result === "ok";
    } catch (error) {
      console.error("Cloudinary delete error:", error);
      return false;
    }
  },

  /**
   * Upload a Buffer to Cloudinary
   * @param {Buffer} buffer - File buffer
   * @param {string} folder - Cloudinary folder
   * @returns {Promise<{secure_url, public_id, resource_type}>}
   */
  uploadFromBuffer: (buffer, folder = "stockflow_bills") => {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
          resource_type: "raw",
          public_id: `bill_${Date.now()}.pdf`,
          use_filename: true,
          unique_filename: false,
        },
        (error, result) => {
          if (error) {
            console.error("Cloudinary Stream Upload Error:", error);
            reject(error);
          } else {
            resolve({
              secure_url: result.secure_url,
              public_id: result.public_id,
              resource_type: result.resource_type,
            });
          }
        }
      );
      stream.end(buffer);
    });
  },

  /**
   * Generate a forced download URL
   * @param {string} url - Original secure URL
   * @returns {string} - Download URL
   */
  getDownloadUrl: (url) => {
    if (!url) return null;
    try {
      // Simply inject the attachment flag into the URL path
      // This preserves version, extension, and public_id correctly
      return url.replace("/upload/", "/upload/fl_attachment/");
    } catch (error) {
      console.error("Error generating download URL:", error);
      return url;
    }
  },

  /**
   * Extract public ID from Cloudinary URL
   * @param {string} url - Cloudinary secure URL
   * @returns {string|null} - Public ID or null
   */
  extractPublicId: (url) => {
    if (!url) return null;
    try {
      // Match pattern: /v{version}/{public_id}.{extension}
      const regex = /\/v\d+\/(.+)\.[a-z]+$/i;
      const match = url.match(regex);
      return match ? match[1] : null;
    } catch (error) {
      console.error("Error extracting public ID:", error);
      return null;
    }
  },
};

module.exports = cloudinaryUpload;

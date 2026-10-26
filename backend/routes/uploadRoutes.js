const express = require("express");
const multer = require("multer");
const { uploadFile } = require("../controllers/uploadController");

const router = express.Router();

// Memory storage to stream directly to Google Drive
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 30 * 1024 * 1024, // max 30MB for images, docs & mobile video clips
  },
});

const uploadAny = (req, res, next) => {
  upload.any()(req, res, (err) => {
    if (err) {
      console.warn("Multer error during upload:", err.message);
      return res.status(400).json({ success: false, message: err.message });
    }
    if (req.files && req.files.length > 0 && !req.file) {
      req.file = req.files[0];
    }
    next();
  });
};

router.post("/", uploadAny, uploadFile);

module.exports = router;

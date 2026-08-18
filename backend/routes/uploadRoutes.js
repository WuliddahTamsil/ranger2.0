const express = require("express");
const multer = require("multer");
const { uploadFile } = require("../controllers/uploadController");

const router = express.Router();

// Memory storage to stream directly to Google Drive
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // max 15MB
  },
});

router.post("/", upload.single("file"), uploadFile);

module.exports = router;

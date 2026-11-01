const express = require("express");
const multer = require("multer");
const path = require("path");
const { uploadFile } = require("../controllers/uploadController");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

const FORBIDDEN_EXTENSIONS = new Set([
  ".exe", ".bat", ".cmd", ".sh", ".php", ".js", ".mjs", ".ts",
  ".py", ".vbs", ".msi", ".dll", ".com", ".pif", ".ps1", ".jar",
  ".apk", ".bin", ".scr", ".html", ".htm", ".xhtml", ".svg", ".cgi",
  ".pl", ".asp", ".aspx", ".jsp"
]);

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
]);

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || "").toLowerCase();
  if (FORBIDDEN_EXTENSIONS.has(ext)) {
    return cb(new Error(`Tipe berkas '${ext}' dilarang demi keamanan sistem.`));
  }
  if (!ALLOWED_MIME_TYPES.has(file.mimetype.toLowerCase())) {
    return cb(new Error(`Format konten '${file.mimetype}' tidak didukung. Unggah gambar, dokumen (PDF/DOCX), atau video valid.`));
  }
  cb(null, true);
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB limit
  },
  fileFilter,
});

const uploadAny = (req, res, next) => {
  upload.any()(req, res, (err) => {
    if (err) {
      console.warn("⚠️ Multer validation error during upload:", err.message);
      return res.status(400).json({ success: false, message: err.message });
    }
    if (req.files && req.files.length > 0 && !req.file) {
      req.file = req.files[0];
    }
    next();
  });
};

// Require authentication for all upload endpoints
router.post("/", requireAuth, uploadAny, uploadFile);

router.fileFilter = fileFilter;
module.exports = router;
module.exports.fileFilter = fileFilter;

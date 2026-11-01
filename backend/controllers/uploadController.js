const path = require("path");
const { uploadToCloudinary } = require("../config/cloudinary");

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

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

const uploadFile = async (req, res) => {
  try {
    let fileBuffer = null;
    let originalName = "upload.jpg";
    let mimeType = "image/jpeg";

    if (req.file) {
      fileBuffer = req.file.buffer;
      originalName = req.file.originalname || "upload.jpg";
      mimeType = req.file.mimetype || "image/jpeg";
    } else if (req.body && (req.body.base64 || req.body.dataUrl || req.body.image)) {
      const rawBase64 = String(req.body.base64 || req.body.dataUrl || req.body.image);
      const match = rawBase64.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1].toLowerCase();
        fileBuffer = Buffer.from(match[2], "base64");
      } else {
        mimeType = (req.body.mimeType || "image/jpeg").toLowerCase();
        fileBuffer = Buffer.from(rawBase64, "base64");
      }
      originalName = req.body.name || req.body.fileName || `upload_${Date.now()}.jpg`;
    } else {
      return res.status(400).json({ success: false, message: "Tidak ada file atau data foto yang diunggah." });
    }

    // Extension & MIME check
    const ext = path.extname(originalName).toLowerCase();
    if (FORBIDDEN_EXTENSIONS.has(ext)) {
      return res.status(400).json({ success: false, message: `Ekstensi '${ext}' dilarang demi keamanan.` });
    }

    if (!ALLOWED_MIME_TYPES.has(mimeType.toLowerCase())) {
      return res.status(400).json({ success: false, message: `Tipe file '${mimeType}' tidak didukung.` });
    }

    if (fileBuffer.length > MAX_FILE_SIZE) {
      return res.status(400).json({ success: false, message: "Ukuran berkas melebihi batas maksimum 15MB." });
    }

    console.log(`📤 Processing file '${originalName}' (${mimeType}, ${fileBuffer.length} bytes)...`);
    const hostUrl = req.hostUrl || `http://localhost:${process.env.PORT || 5000}`;
    const result = await uploadToCloudinary(
      fileBuffer,
      originalName,
      mimeType,
      hostUrl
    );

    console.log(`✅ File saved via [${result.storage}]: ${result.viewUrl}`);

    return res.status(200).json({
      success: true,
      message: "File berhasil disimpan",
      data: {
        fileId: result.fileId,
        fileName: result.name,
        url: result.viewUrl,
        webViewLink: result.webViewLink,
        downloadUrl: result.downloadUrl,
        storage: result.storage,
      },
    });
  } catch (error) {
    console.error("❌ Upload controller error:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengunggah file",
      error: error.message,
    });
  }
};

module.exports = {
  uploadFile,
};

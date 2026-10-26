const { uploadToCloudinary } = require("../config/cloudinary");

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
        mimeType = match[1];
        fileBuffer = Buffer.from(match[2], "base64");
      } else {
        mimeType = req.body.mimeType || "image/jpeg";
        fileBuffer = Buffer.from(rawBase64, "base64");
      }
      originalName = req.body.name || req.body.fileName || `product_${Date.now()}.jpg`;
    } else {
      return res.status(400).json({ success: false, message: "Tidak ada file atau data foto yang diunggah" });
    }

    console.log(`📤 Processing file '${originalName}' (${mimeType})...`);
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

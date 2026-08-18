const { uploadToGoogleDrive } = require("../config/googleDrive");

const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Tidak ada file yang diunggah" });
    }

    console.log(`📤 Processing file '${req.file.originalname}' (${req.file.mimetype})...`);
    const hostUrl = req.hostUrl || `http://localhost:${process.env.PORT || 5000}`;
    const result = await uploadToGoogleDrive(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
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

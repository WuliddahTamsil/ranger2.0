const cloudinary = require("cloudinary").v2;
const { Readable } = require("stream");
const fs = require("fs");
const path = require("path");

const isProduction = process.env.NODE_ENV === "production";
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

const isCloudinaryConfigured = Boolean(cloudName && apiKey && apiSecret);

if (isProduction && !isCloudinaryConfigured) {
  console.error("FATAL/WARNING: Cloudinary credentials missing in production environment (CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET).");
}

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

// Local fallback uploads directory
const UPLOADS_DIR = path.join(__dirname, "../uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Uploads a file buffer directly to Cloudinary (images, PDF, documents)
 * @param {Buffer} fileBuffer 
 * @param {string} originalName 
 * @param {string} mimeType 
 * @param {string} hostUrl 
 * @returns {Promise<{fileId: string, name: string, viewUrl: string, webViewLink: string, downloadUrl: string, storage: string}>}
 */
const uploadToCloudinary = async (fileBuffer, originalName, mimeType, hostUrl = "http://localhost:5000") => {
  const cleanBaseName = (originalName || "file").replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileName = `ranger_${Date.now()}_${cleanBaseName}`;

  if (!isCloudinaryConfigured) {
    if (isProduction) {
      throw new Error("Layanan penyimpanan awan (Cloudinary) belum dikonfigurasi di server production.");
    }
    // In local development without Cloudinary credentials, fallback gracefully to disk
    const localFilePath = path.join(UPLOADS_DIR, fileName);
    fs.writeFileSync(localFilePath, fileBuffer);
    const fileUrl = `${hostUrl}/uploads/${fileName}`;
    return {
      fileId: fileName,
      name: fileName,
      viewUrl: fileUrl,
      webViewLink: fileUrl,
      downloadUrl: fileUrl,
      storage: "local",
    };
  }

  try {
    console.log(`📤 Uploading '${fileName}' (${mimeType}) to Cloudinary...`);

    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "ranger_uploads",
          public_id: path.parse(fileName).name,
          resource_type: "auto",
        },
        (error, result) => {
          if (error) {
            return reject(error);
          }
          resolve(result);
        }
      );

      const readableStream = new Readable();
      readableStream.push(fileBuffer);
      readableStream.push(null);
      readableStream.pipe(uploadStream);
    });

    console.log(`✅ File successfully uploaded to Cloudinary: ${uploadResult.secure_url}`);

    const viewUrl = uploadResult.secure_url && (mimeType === "application/pdf" || originalName?.toLowerCase().endsWith(".pdf"))
      ? uploadResult.secure_url.replace(/\.pdf(\?.*)?$/i, ".jpg$1")
      : uploadResult.secure_url;

    return {
      fileId: uploadResult.public_id,
      name: fileName,
      viewUrl: viewUrl,
      webViewLink: viewUrl,
      downloadUrl: uploadResult.secure_url,
      storage: "cloudinary",
    };
  } catch (error) {
    console.error("❌ Cloudinary Upload Error:", error.message);

    if (isProduction) {
      throw new Error(`Gagal mengunggah berkas ke penyimpanan Cloudinary: ${error.message}`);
    }

    // Fallback to local disk storage in development
    const localFilePath = path.join(UPLOADS_DIR, fileName);
    fs.writeFileSync(localFilePath, fileBuffer);
    const fileUrl = `${hostUrl}/uploads/${fileName}`;

    console.log(`⚠️ Saved to local storage fallback: ${fileUrl}`);

    return {
      fileId: fileName,
      name: fileName,
      viewUrl: fileUrl,
      webViewLink: fileUrl,
      downloadUrl: fileUrl,
      storage: "local",
    };
  }
};

module.exports = {
  cloudinary,
  isCloudinaryConfigured,
  uploadToCloudinary,
};

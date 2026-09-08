const cloudinary = require("cloudinary").v2;
const { Readable } = require("stream");
const fs = require("fs");
const path = require("path");

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "b9soz7ka",
  api_key: process.env.CLOUDINARY_API_KEY || "337933457514665",
  api_secret: process.env.CLOUDINARY_API_SECRET || "uxuDUIvwQS6s4J2Nph9vA24nCBU",
  secure: true,
});

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

  try {
    console.log(`📤 Uploading '${fileName}' (${mimeType}) to Cloudinary...`);

    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "ranger_uploads",
          public_id: path.parse(fileName).name,
          resource_type: "auto", // Automatically detects images, pdf, videos, raw documents
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

    return {
      fileId: uploadResult.public_id,
      name: fileName,
      viewUrl: uploadResult.secure_url,
      webViewLink: uploadResult.secure_url,
      downloadUrl: uploadResult.secure_url,
      storage: "cloudinary",
    };
  } catch (error) {
    console.error("❌ Cloudinary Upload Error:", error.message);

    // Fallback to local disk storage
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
  uploadToCloudinary,
};

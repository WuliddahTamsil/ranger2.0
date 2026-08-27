
const { google } = require("googleapis");
const { Readable } = require("stream");
const fs = require("fs");
const path = require("path");

// Setup OAuth2 client with user refresh token
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  "https://developers.google.com/oauthplayground"
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

const drive = google.drive({ version: "v3", auth: oauth2Client });

// Local uploads directory fallback
const UPLOADS_DIR = path.join(__dirname, "../uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Uploads a file buffer directly to Google Drive folder using OAuth2 (owner storage).
 * @param {Buffer} fileBuffer 
 * @param {string} originalName 
 * @param {string} mimeType 
 * @param {string} hostUrl 
 * @returns {Promise<{fileId: string, name: string, viewUrl: string, webViewLink: string, downloadUrl: string, storage: string}>}
 */
const uploadToGoogleDrive = async (fileBuffer, originalName, mimeType, hostUrl = "http://localhost:5000") => {
  const fileName = `ranger_${Date.now()}_${(originalName || "file").replace(/[^a-zA-Z0-9._-]/g, "_")}`;

  try {
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
    const mediaStream = new Readable();
    mediaStream.push(fileBuffer);
    mediaStream.push(null);

    console.log(`📤 Uploading '${fileName}' to Google Drive folder ${folderId}...`);

    const response = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: folderId ? [folderId] : [],
      },
      media: {
        mimeType: mimeType || "application/octet-stream",
        body: mediaStream,
      },
      fields: "id, name, webViewLink, webContentLink, thumbnailLink",
    });

    const fileId = response.data.id;
    console.log(`✅ File created on Google Drive! File ID: ${fileId}`);

    // Set permission to anyone with link (public reader)
    try {
      await drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: "reader",
          type: "anyone",
        },
      });
    } catch (permErr) {
      console.warn("⚠️ Warning setting file permission:", permErr.message);
    }

    // Direct web image URL
    const directImageUrl = `https://drive.google.com/uc?export=view&id=${fileId}`;

    return {
      fileId,
      name: fileName,
      viewUrl: directImageUrl,
      webViewLink: response.data.webViewLink || directImageUrl,
      downloadUrl: response.data.webContentLink || directImageUrl,
      storage: "google_drive",
    };
  } catch (error) {
    console.error("❌ Google Drive OAuth2 Upload Error:", error.message);

    // Fallback locally
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
};

module.exports = {
  drive,
  uploadToGoogleDrive,
};

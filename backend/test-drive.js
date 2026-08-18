require("dotenv").config();
const { uploadToGoogleDrive } = require("./config/googleDrive");

async function testDrive() {
  try {
    console.log("📤 Testing Google Drive upload with folder ID:", process.env.GOOGLE_DRIVE_FOLDER_ID);
    const testBuffer = Buffer.from("Halo! Ini adalah file uji coba integrasi Google Drive Ranger App.", "utf-8");
    const result = await uploadToGoogleDrive(testBuffer, "test-integration.txt", "text/plain");
    console.log("✅ Google Drive Upload Success!");
    console.log("📁 File ID:", result.fileId);
    console.log("🔗 Direct View URL:", result.viewUrl);
    console.log("🔗 Web View Link:", result.webViewLink);
    process.exit(0);
  } catch (err) {
    console.error("❌ Google Drive Error:", err.message);
    if (err.errors) console.error("Details:", err.errors);
    process.exit(1);
  }
}

testDrive();

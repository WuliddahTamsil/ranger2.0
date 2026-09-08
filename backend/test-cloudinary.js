require("dotenv").config();
const { uploadToCloudinary } = require("./config/cloudinary");

async function testCloudinary() {
  try {
    console.log("🚀 Testing Cloudinary upload...");
    const sampleBuffer = Buffer.from("Halo! Ini adalah dokumen uji coba upload PDF/dokumen Ranger App.", "utf-8");
    const result = await uploadToCloudinary(sampleBuffer, "test-document.txt", "text/plain");

    console.log("=========================================");
    console.log("🎉 Test Result:");
    console.log("📦 Storage Type:", result.storage);
    console.log("🔗 URL Akses:", result.viewUrl);
    console.log("=========================================");
    process.exit(0);
  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

testCloudinary();

require("dotenv").config();
const mongoose = require("mongoose");
const { uploadToGoogleDrive } = require("./config/googleDrive");

async function testAll() {
  console.log("🔍 1. Testing MongoDB Atlas connection...");
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`✅ MongoDB Atlas Connected successfully: ${conn.connection.host}`);
  } catch (err) {
    console.error("❌ MongoDB Atlas connection failed:", err.message);
  }

  console.log("\n🔍 2. Testing Google Drive upload...");
  try {
    const testBuffer = Buffer.from("Halo! Ini adalah file uji coba integrasi Google Drive Ranger App.", "utf-8");
    const result = await uploadToGoogleDrive(testBuffer, "test-integration.txt", "text/plain");
    console.log("✅ Google Drive Upload Success!");
    console.log("📁 File ID:", result.fileId);
    console.log("🔗 View URL:", result.viewUrl);
  } catch (err) {
    console.error("❌ Google Drive upload failed:", err.message);
  }

  await mongoose.disconnect();
  console.log("\n🏁 Test completed.");
  process.exit(0);
}

testAll();

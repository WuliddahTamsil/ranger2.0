const mongoose = require("mongoose");

const connectDB = async (retries = 5, delayMs = 3000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const conn = await mongoose.connect(process.env.MONGODB_URI, {
        serverSelectionTimeoutMS: 30000,
        connectTimeoutMS: 30000,
      });
      console.log(`✅ MongoDB Atlas Connected: ${conn.connection.host}`);
      return conn;
    } catch (error) {
      console.error(`⚠️ MongoDB Connection Attempt ${attempt}/${retries} failed: ${error.message}`);
      if (attempt === retries) {
        console.error(`❌ All ${retries} MongoDB Connection attempts failed.`);
        process.exit(1);
      }
      console.log(`🔄 Retrying in ${delayMs / 1000}s...`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
};

module.exports = connectDB;

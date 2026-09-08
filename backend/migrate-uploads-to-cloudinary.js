require("dotenv").config();
const fs = require("fs");
const path = require("path");
const connectDB = require("./config/db");
const User = require("./models/User");
const { uploadToCloudinary } = require("./config/cloudinary");

async function migrate() {
  await connectDB();
  const users = await User.find({ "documents.ktp.uri": { $regex: /localhost/ } });
  console.log(`Found ${users.length} user(s) with local upload URIs to migrate to Cloudinary.`);

  for (const user of users) {
    let modified = false;
    for (const key of Object.keys(user.documents || {})) {
      const doc = user.documents[key];
      if (doc && doc.uri && doc.uri.includes("localhost:5000/uploads/")) {
        const fileName = doc.uri.split("/uploads/")[1];
        const filePath = path.join(__dirname, "uploads", fileName);
        if (fs.existsSync(filePath)) {
          const fileBuffer = fs.readFileSync(filePath);
          console.log(`Migrating ${key} (${fileName}) for ${user.email}...`);
          const result = await uploadToCloudinary(fileBuffer, doc.name || fileName, doc.mimeType || "application/pdf");
          doc.uri = result.viewUrl;
          modified = true;
        }
      }
    }
    if (modified) {
      user.markModified("documents");
      await user.save();
      console.log(`✅ Updated user ${user.email} with Cloudinary URLs!`);
    }
  }
  console.log("Migration complete!");
  process.exit(0);
}

migrate();

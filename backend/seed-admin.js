require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

const seedAdmin = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI is not defined in .env");
    }

    console.log("Connecting to MongoDB Atlas...");
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB!");

    const adminEmail = "ranger@gmail.com";
    const adminPassword = "password"; // wait, the user said "ranger@gmail.com / 12345678"
    const targetPassword = "12345678";

    let admin = await User.findOne({ email: adminEmail });
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(targetPassword, salt);

    if (admin) {
      admin.role = "admin";
      admin.status = "verified";
      admin.passwordHash = passwordHash;
      admin.name = "Super Admin Ranger";
      admin.phone = "081122334455";
      await admin.save();
      console.log(`✅ Admin account (${adminEmail}) updated successfully with password: ${targetPassword}`);
    } else {
      admin = await User.create({
        role: "admin",
        name: "Super Admin Ranger",
        email: adminEmail,
        phone: "081122334455",
        address: "HQ Ranger Platform, Garut",
        passwordHash,
        status: "verified",
      });
      console.log(`✅ Admin account (${adminEmail}) created successfully with password: ${targetPassword}`);
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to seed admin:", error);
    process.exit(1);
  }
};

seedAdmin();

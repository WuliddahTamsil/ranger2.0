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

    const adminAccounts = [
      {
        email: "ranger@gmail.com",
        name: "Super Admin Ranger",
        phone: "081511226089",
        address: "HQ Ranger Platform, Garut",
      },
      {
        email: "geoverse.pge@gmail.com",
        name: "Admin PGE GEOVERSE",
        phone: "081511226089",
        address: "PT Pertamina Geothermal Energy Tbk (PGE) Kamojang",
      },
    ];

    const targetPassword = "12345678";
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(targetPassword, salt);

    for (const item of adminAccounts) {
      let admin = await User.findOne({ email: item.email });
      if (admin) {
        admin.role = "admin";
        admin.status = "verified";
        admin.passwordHash = passwordHash;
        admin.name = item.name;
        admin.phone = item.phone;
        admin.address = item.address;
        await admin.save();
        console.log(`✅ Admin account (${item.email}) updated successfully with password: ${targetPassword}`);
      } else {
        admin = await User.create({
          role: "admin",
          name: item.name,
          email: item.email,
          phone: item.phone,
          address: item.address,
          passwordHash,
          status: "verified",
        });
        console.log(`✅ Admin account (${item.email}) created successfully with password: ${targetPassword}`);
      }
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to seed admin:", error);
    process.exit(1);
  }
};

seedAdmin();

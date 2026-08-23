require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

async function seedCatering() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB for seeding catering...");

    const email = "catering@test.com";
    const password = "Password123";

    let user = await User.findOne({ email });
    if (user) {
      console.log("Catering test user already exists:", email);
    } else {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      user = await User.create({
        role: "pemilik_catering",
        name: "Bu Haji Nani",
        email: email,
        phone: "08123456789",
        address: "Jl. Raya Kamojang No. 5",
        passwordHash,
        status: "verified",
        roleData: {
          businessName: "Catering Bu Haji Nani",
          businessAddress: "Jl. Raya Kamojang No. 5",
          menuSpecialty: "Nasi Box, Prasmanan & Acara",
          isDapurOpen: "true",
        },
      });

      console.log("✅ Seeded Pemilik Catering test user successfully!");
      console.log("Email:", email);
      console.log("Password:", password);
    }

    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding catering error:", err);
    process.exit(1);
  }
}

seedCatering();

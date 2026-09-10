require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");

const SEED_USERS = [
  {
    role: "admin",
    name: "Super Admin Ranger",
    email: "ranger@gmail.com",
    phone: "081122334455",
    address: "HQ Ranger Platform, Garut",
    password: "12345678",
    status: "verified",
    roleData: {},
  },
  {
    role: "pemilik_kos",
    name: "Ibu Hj. Siti Nurhaliza",
    email: "pemilikkos@ranger.com",
    phone: "081234567890",
    address: "Jl. Kaliurang KM 5 No. 12, Sleman",
    password: "password123",
    status: "verified",
    roleData: {
      nama_usaha: "Kost Putri Melati Exclusive",
      alamat_usaha: "Jl. Kaliurang KM 5 No. 12, Sleman",
      tipe_kost: "Putri",
      jumlah_kamar: "10",
    },
  },
  {
    role: "pemilik_laundry",
    name: "Ais Laundry",
    email: "aisl@gmail.com",
    phone: "081234567891",
    address: "Bogor",
    password: "12345678",
    status: "verified",
    roleData: {
      businessName: "Ais laundry",
      businessAddress: "BGR",
      serviceType: "express",
      operatingHours: "24 jam",
    },
  },
  {
    role: "pemilik_catering",
    name: "Bu Haji Nani",
    email: "catering@test.com",
    phone: "081234567892",
    address: "Jl. Raya Kamojang No. 5",
    password: "Password123",
    status: "verified",
    roleData: {
      businessName: "Catering Bu Haji Nani",
      businessAddress: "Jl. Raya Kamojang No. 5",
      menuSpecialty: "Nasi Box, Prasmanan & Acara",
      isDapurOpen: "true",
    },
  },
  {
    role: "pemilik_marketplace",
    name: "Dyas Cafe & Shop",
    email: "dyaska@gmail.com",
    phone: "081234567893",
    address: "Bogor",
    password: "12345678",
    status: "verified",
    roleData: {
      businessName: "DYAS",
      businessCategory: "Cafe",
      businessAddress: "Bogor",
      businessDescription: "Cafe & UMKM Kebutuhan Sehari-hari",
    },
  },
  {
    role: "pemilik_marketplace",
    name: "Dyva Fazrullah Badari",
    email: "dyva123@gmail.com",
    phone: "085298979756",
    address: "Kuningan",
    password: "12345678",
    status: "verified",
    roleData: {
      businessName: "Rice Bowl",
      businessCategory: "Makanan",
      businessAddress: "Kuningan",
      businessDescription: "Makanan Enak",
    },
  },
  {
    role: "driver",
    name: "Wuwu Driver",
    email: "wuliddah@gmail.com",
    phone: "081234567894",
    address: "Garut",
    password: "12345678",
    status: "verified",
    roleData: {
      plateNumber: "E 3305 YAM",
      vehicleType: "Motor",
      vehicleBrand: "BEAT",
      vehicleYear: "2024",
    },
  },
  {
    role: "customer",
    name: "Wuwu Customer",
    email: "wuliddahtamsilbarokah19@gmail.com",
    phone: "081234567895",
    address: "Garut",
    password: "12345678",
    status: "verified",
    roleData: {},
  },
];

async function seedAll() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error("MONGODB_URI is not defined in .env");
    }

    console.log("Connecting to MongoDB Atlas...");
    await mongoose.connect(mongoUri);
    console.log(" Connected to MongoDB Atlas!");

    const salt = await bcrypt.genSalt(10);

    console.log("\n--- SEEDING ALL ROLES ---");
    for (const item of SEED_USERS) {
      const passwordHash = await bcrypt.hash(item.password, salt);

      let user = await User.findOne({ email: item.email.toLowerCase() });
      if (user) {
        user.role = item.role;
        user.name = item.name;
        user.phone = item.phone;
        user.address = item.address;
        user.status = item.status;
        user.passwordHash = passwordHash;
        if (item.roleData) {
          user.roleData = item.roleData;
        }
        await user.save();
        console.log(` Updated [${item.role}] -> ${item.email} (pw: ${item.password})`);
      } else {
        user = await User.create({
          role: item.role,
          name: item.name,
          email: item.email.toLowerCase(),
          phone: item.phone,
          address: item.address,
          status: item.status,
          passwordHash,
          roleData: item.roleData || {},
        });
        console.log(` Created [${item.role}] -> ${item.email} (pw: ${item.password})`);
      }
    }

    console.log("\n Seeding completed successfully! All accounts verified and ready.\n");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
}

seedAll();

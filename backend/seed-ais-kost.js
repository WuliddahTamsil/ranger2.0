require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const Kost = require("./models/Kost");

async function seedAisKost() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB Atlas for seeding Ais Kost...");

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash("password123", salt);

    // 1. Find or Create Ais user (Pemilik Kos)
    let aisUser = await User.findOne({ email: "aisk@gmail.com" });
    if (!aisUser) {
      aisUser = await User.findOne({
        $or: [{ email: "aisl@gmail.com" }, { name: "ais kost" }],
      });
    }

    if (!aisUser) {
      aisUser = await User.create({
        role: "pemilik_kos",
        name: "Ais Kost",
        email: "aisk@gmail.com",
        phone: "081234567890",
        address: "Jl. Kaliurang KM 7 No. 15, Sleman, Yogyakarta",
        passwordHash,
        status: "verified",
        roleData: {
          nama_usaha: "Ais Kost Exclusive",
          alamat_usaha: "Jl. Kaliurang KM 7 No. 15, Sleman",
          tipe_kost: "Campur",
          jumlah_kamar: "5",
        },
      });
      console.log("✅ Created Ais user (pemilik_kos):", aisUser.email);
    } else {
      aisUser.email = "aisk@gmail.com";
      aisUser.role = "pemilik_kos";
      aisUser.status = "verified";
      aisUser.passwordHash = passwordHash;
      await aisUser.save();
      console.log("✅ Updated Ais user (pemilik_kos):", aisUser.email);
    }

    // 2. Find or Create Customer Aisyah (aisyahphr@gmail.com)
    let aisyahUser = await User.findOne({ email: "aisyahphr@gmail.com" });
    if (!ahUserFound(aisyahUser)) {
      aisyahUser = await User.create({
        role: "customer",
        name: "Aisyah Putri",
        email: "aisyahphr@gmail.com",
        phone: "081298765432",
        address: "Jl. Gejayan No. 45, Sleman, Yogyakarta",
        passwordHash,
        status: "verified",
      });
      console.log("✅ Created Aisyah user (customer):", aisyahUser.email);
    } else {
      aisyahUser.role = "customer";
      aisyahUser.status = "verified";
      aisyahUser.passwordHash = passwordHash;
      await aisyahUser.save();
      console.log("✅ Updated Aisyah user (customer):", aisyahUser.email);
    }

    // 3. Setup 5 Room Types for Ais Kost Exclusive
    const roomsData = [
      {
        roomNumber: "101",
        roomType: "Tipe AC Exclusive Single",
        floor: 1,
        priceMonthly: 1500000,
        priceYearly: 16500000,
        isAvailable: true,
        facilities: ["AC", "WiFi Cepat", "KM Dalam", "Kasur Springbed Queen", "Water Heater", "Meja Kerja"],
        images: ["https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=600&q=80"],
      },
      {
        roomNumber: "102",
        roomType: "Tipe Deluxe Balcony",
        floor: 1,
        priceMonthly: 1800000,
        priceYearly: 19800000,
        isAvailable: true,
        facilities: ["AC", "WiFi", "Balkon Pribadi", "KM Dalam", "Water Heater", "Smart TV", "Kulkas Mini"],
        images: ["https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=600&q=80"],
      },
      {
        roomNumber: "103",
        roomType: "Tipe AC Standar Plus",
        floor: 2,
        priceMonthly: 1200000,
        priceYearly: 13200000,
        isAvailable: true,
        facilities: ["AC", "WiFi", "KM Dalam", "Kasur Springbed Single", "Meja Belajar", "Lemari 2 Pintu"],
        images: ["https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80"],
      },
      {
        roomNumber: "104",
        roomType: "Tipe VIP King Suite",
        floor: 2,
        priceMonthly: 2200000,
        priceYearly: 24200000,
        isAvailable: false,
        facilities: ["AC Inverter", "WiFi 100Mbps", "KM Dalam Bathtub", "King Size Bed", "Sofa Santai", "Kitchenette"],
        images: ["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=600&q=80"],
        currentTenant: {
          name: "Budi Santoso",
          phone: "081234567804",
          entryDate: new Date("2026-07-20"),
          dueDate: new Date("2026-09-20"),
        },
      },
      {
        roomNumber: "105",
        roomType: "Tipe Cozy Minimalist",
        floor: 2,
        priceMonthly: 950000,
        priceYearly: 10500000,
        isAvailable: true,
        facilities: ["Kipas Angin / Exhaust", "WiFi", "KM Luar Bersih", "Kasur Busa Tebal", "Meja Lipat", "Lemari"],
        images: ["https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=600&q=80"],
      },
    ];

    // 4. Create or update Kost for Ais
    let kost = await Kost.findOne({ ownerId: aisUser._id });
    if (kost) {
      kost.name = "Ais Kost Exclusive";
      kost.rooms = roomsData;
      kost.price = 950000;
      kost.dpAmount = 250000;
      kost.type = "Campur";
      kost.address = "Jl. Kaliurang KM 7 No. 15, Sleman, Yogyakarta";
      kost.city = "Sleman";
      kost.facilities = ["WiFi", "AC", "KM Dalam", "Dapur Bersama", "Parkir Motor & Mobil", "CCTV 24 Jam", "Dispenser Air"];
      kost.bankAccount = {
        bankName: "BCA",
        accountNumber: "7720192841",
        accountHolder: "Ais Kost Management",
        qrisImage: "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=AIS_KOST_EXCLUSIVE_DP_QRIS",
      };
      await kost.save();
      console.log("✅ Updated Ais Kost with 5 room types and bank account!");
    } else {
      kost = await Kost.create({
        ownerId: aisUser._id,
        name: "Ais Kost Exclusive",
        type: "Campur",
        address: "Jl. Kaliurang KM 7 No. 15, Sleman, Yogyakarta",
        city: "Sleman",
        district: "Mlati",
        price: 950000,
        dpAmount: 250000,
        description: "Kost exclusive bersih dan nyaman di kawasan strategis dekat kampus. Fasilitas lengkap dengan akses keamanan 24 jam.",
        facilities: ["WiFi", "AC", "KM Dalam", "Dapur Bersama", "Parkir Motor & Mobil", "CCTV 24 Jam", "Dispenser Air"],
        rules: ["Bebas jam malam", "Jaga kebersihan bersama", "Dilarang membawa hewan peliharaan"],
        images: [
          "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80",
        ],
        rooms: roomsData,
        bankAccount: {
          bankName: "BCA",
          accountNumber: "7720192841",
          accountHolder: "Ais Kost Management",
          qrisImage: "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=AIS_KOST_EXCLUSIVE_DP_QRIS",
        },
      });
      console.log("✅ Created Ais Kost with 5 room types and bank account!");
    }

    console.log("\n🏁 Seeding Ais Kost 5 Rooms for aisk@gmail.com & aisyahphr@gmail.com Successful!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding error:", err);
    process.exit(1);
  }
}

function ahUserFound(u) {
  return !!u;
}

seedAisKost();

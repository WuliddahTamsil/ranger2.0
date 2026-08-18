require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const Kost = require("./models/Kost");

async function seedAisKost() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB Atlas for seeding Ais Kost...");

    // 1. Find or Create Ais user
    let aisUser = await User.findOne({
      $or: [{ email: "aisl@gmail.com" }, { email: "aisk@gmail.com" }, { name: "ais kost" }],
    });

    if (!aisUser) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash("password123", salt);
      aisUser = await User.create({
        role: "pemilik_kos",
        name: "ais kost",
        email: "aisl@gmail.com",
        phone: "081234567890",
        address: "Jl. Kaliurang KM 7, Sleman, Yogyakarta",
        passwordHash,
        status: "verified",
        roleData: {
          nama_usaha: "Ais Kost Exclusive",
          alamat_usaha: "Jl. Kaliurang KM 7 No. 15, Sleman",
          tipe_kost: "Campur",
          jumlah_kamar: "5",
        },
      });
      console.log("✅ Created Ais user:", aisUser.name);
    } else {
      aisUser.status = "verified";
      await aisUser.save();
      console.log("✅ Found Ais user:", aisUser.name, aisUser.email);
    }

    // 2. Setup 5 Rooms with 5 Tenants
    const roomsData = [
      {
        roomNumber: "101",
        roomType: "Tipe AC Exclusive",
        floor: 1,
        priceMonthly: 1500000,
        priceYearly: 16500000,
        isAvailable: false,
        facilities: ["AC", "WiFi", "KM Dalam", "Kasur Springbed", "Water Heater", "Meja Belajar"],
        images: ["https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=600&q=80"],
        currentTenant: {
          name: "Budi Santoso",
          phone: "081234567801",
          entryDate: new Date("2026-08-01"),
          dueDate: new Date("2026-09-01"),
        },
      },
      {
        roomNumber: "102",
        roomType: "Tipe AC Exclusive",
        floor: 1,
        priceMonthly: 1500000,
        priceYearly: 16500000,
        isAvailable: false,
        facilities: ["AC", "WiFi", "KM Dalam", "Kasur Springbed", "Water Heater", "Lemari"],
        images: ["https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=600&q=80"],
        currentTenant: {
          name: "Dimas Pratama",
          phone: "081234567802",
          entryDate: new Date("2026-07-15"),
          dueDate: new Date("2026-08-26"), // Akan keluar / sisa 8 hari
        },
      },
      {
        roomNumber: "103",
        roomType: "Tipe AC Standar",
        floor: 2,
        priceMonthly: 1200000,
        priceYearly: 13500000,
        isAvailable: false,
        facilities: ["AC", "WiFi", "KM Dalam", "Kasur Busa", "Meja Belajar"],
        images: ["https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=600&q=80"],
        currentTenant: {
          name: "Rizky Fauzi",
          phone: "081234567803",
          entryDate: new Date("2026-08-05"),
          dueDate: new Date("2026-09-05"),
        },
      },
      {
        roomNumber: "104",
        roomType: "Tipe AC Standar",
        floor: 2,
        priceMonthly: 1200000,
        priceYearly: 13500000,
        isAvailable: false,
        facilities: ["AC", "WiFi", "KM Dalam", "Kasur Busa", "Lemari Kayu"],
        images: ["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=600&q=80"],
        currentTenant: {
          name: "Ahmad Fauzan",
          phone: "081234567804",
          entryDate: new Date("2026-07-20"),
          dueDate: new Date("2026-08-30"),
        },
      },
      {
        roomNumber: "105",
        roomType: "Tipe Non-AC Ekonomis",
        floor: 2,
        priceMonthly: 850000,
        priceYearly: 9500000,
        isAvailable: false,
        facilities: ["Kipas Angin", "WiFi", "KM Luar", "Kasur Busa", "Lemari"],
        images: ["https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=600&q=80"],
        currentTenant: {
          name: "Fajar Nugroho",
          phone: "081234567805",
          entryDate: new Date("2026-08-10"),
          dueDate: new Date("2026-09-10"),
        },
      },
    ];

    // 3. Create or update Kost for Ais
    let kost = await Kost.findOne({ ownerId: aisUser._id });
    if (kost) {
      kost.name = "Ais Kost Exclusive";
      kost.rooms = roomsData;
      kost.price = 850000;
      await kost.save();
      console.log("✅ Updated Ais Kost with 5 rooms and 5 tenants!");
    } else {
      kost = await Kost.create({
        ownerId: aisUser._id,
        name: "Ais Kost Exclusive",
        type: "Campur",
        address: "Jl. Kaliurang KM 7 No. 15, Sleman, Yogyakarta",
        city: "Sleman",
        district: "Mlati",
        price: 850000,
        dpAmount: 200000,
        description: "Kost exclusive bersih dan nyaman di kawasan strategis dekat kampus. Fasilitas lengkap dengan akses keamanan 24 jam.",
        facilities: ["WiFi", "AC", "KM Dalam", "Dapur Bersama", "Parkir Motor & Mobil", "CCTV 24 Jam"],
        rules: ["Bebas jam malam", "Jaga kebersihan bersama", "Dilarang membawa hewan peliharaan"],
        images: [
          "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80",
        ],
        rooms: roomsData,
        bankAccount: {
          bankName: "BCA",
          accountNumber: "7720192841",
          accountHolder: "Ais",
          qrisImage: "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=AIS_KOST_QRIS",
        },
      });
      console.log("✅ Created Ais Kost with 5 rooms and 5 tenants!");
    }

    console.log("\n🏁 Seeding Ais Kost 5 Rooms & 5 Tenants Successful!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding error:", err);
    process.exit(1);
  }
}

seedAisKost();

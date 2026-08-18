require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const Kost = require("./models/Kost");

async function seed() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB for seeding...");

    // 1. Create or Find Pemilik Kos
    let pemilikKos = await User.findOne({ email: "pemilikkos@ranger.com" });
    if (!pemilikKos) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash("password123", salt);
      pemilikKos = await User.create({
        role: "pemilik_kos",
        name: "Ibu Hj. Siti Nurhaliza",
        email: "pemilikkos@ranger.com",
        phone: "081234567890",
        address: "Jl. Kaliurang KM 5, Sleman, D.I. Yogyakarta",
        passwordHash,
        status: "verified",
        roleData: {
          nama_usaha: "Kost Putri Melati Exclusive",
          alamat_usaha: "Jl. Kaliurang KM 5 No. 12, Sleman",
          tipe_kost: "Putri",
          jumlah_kamar: "10",
        },
      });
      console.log("✅ Seeded Pemilik Kos:", pemilikKos.name);
    }

    // 2. Create Sample Kost Property
    const existingKost = await Kost.findOne({ ownerId: pemilikKos._id });
    if (!existingKost) {
      const newKost = await Kost.create({
        ownerId: pemilikKos._id,
        name: "Kost Putri Melati Exclusive",
        type: "Putri",
        address: "Jl. Kaliurang KM 5 No. 12, Sinduadi, Mlati, Sleman",
        city: "Sleman",
        district: "Mlati",
        price: 850000,
        dpAmount: 200000,
        description: "Kost putri nyaman, aman, lingkungan asri dekat kampus UGM & UNY. Dilengkapi keamanan CCTV 24 jam, akses wifi cepat, dan dapur bersama.",
        facilities: [
          "WiFi Cepat",
          "AC",
          "Kamar Mandi Dalam",
          "Kasur & Lemari",
          "Dapur Bersama",
          "Parkir Motor & Mobil",
          "CCTV 24 Jam",
          "Penjaga Kost",
        ],
        rules: [
          "Khusus Putri",
          "Tamu pria dilarang masuk kamar",
          "Jam malam gerbang 23.00 WIB",
          "Dilarang merokok di dalam kamar",
        ],
        images: [
          "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=800&q=80",
          "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80",
        ],
        bankAccount: {
          bankName: "BCA",
          accountNumber: "8830192837",
          accountHolder: "Siti Nurhaliza",
          qrisImage: "https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=00020101021126580016ID.CO.QRIS.WWW01189360099900000000015204541153033605802ID5914RANGER_KOST_DP6007SLEMAN61055528162070703A01630489AB",
        },
        rooms: [
          {
            roomNumber: "A-01",
            roomType: "Tipe A (AC + KM Dalam)",
            floor: 1,
            priceMonthly: 1200000,
            priceYearly: 13500000,
            isAvailable: true,
            facilities: ["AC", "Kamar Mandi Dalam", "Water Heater", "Kasur Springbed", "Meja Belajar"],
          },
          {
            roomNumber: "A-02",
            roomType: "Tipe A (AC + KM Dalam)",
            floor: 1,
            priceMonthly: 1200000,
            priceYearly: 13500000,
            isAvailable: true,
            facilities: ["AC", "Kamar Mandi Dalam", "Water Heater", "Kasur Springbed", "Meja Belajar"],
          },
          {
            roomNumber: "B-01",
            roomType: "Tipe B (Non-AC + KM Luar)",
            floor: 2,
            priceMonthly: 850000,
            priceYearly: 9500000,
            isAvailable: true,
            facilities: ["Kipas Angin", "Kamar Mandi Luar", "Kasur Busa", "Lemari Kayu"],
          },
        ],
      });
      console.log("✅ Seeded Kost Property:", newKost.name);
    }

    console.log("🌱 Database seeding complete!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding error:", err);
    process.exit(1);
  }
}

seed();

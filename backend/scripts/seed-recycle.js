const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const mongoose = require("mongoose");
const User = require("../models/User");
const WasteBank = require("../models/WasteBank");
const WasteCategoryPrice = require("../models/WasteCategoryPrice");
const Voucher = require("../models/Voucher");

async function seedRecycleData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("Connected to MongoDB for Recycle Seeding...");

    // 1. Get or create bank_sampah manager user
    let bankOwner = await User.findOne({ email: "banksampah@geoverse.com" });
    if (!bankOwner) {
      bankOwner = await User.create({
        role: "bank_sampah",
        name: "Pengelola Bank Sampah Kamojang",
        email: "banksampah@geoverse.com",
        phone: "081234567888",
        address: "Jl. Kamojang No. 8, Ibun, Garut",
        status: "verified",
      });
      console.log("✅ Created Bank Sampah User:", bankOwner.name);
    }

    // 2. Seed Waste Banks
    const banksData = [
      {
        name: "Bank Sampah Induk Kamojang Asri",
        ownerId: bankOwner._id,
        address: "Jl. Kamojang No. 8, Samarang, Garut",
        latitude: -7.1452,
        longitude: 107.7891,
        phone: "081234567888",
        photoUrl: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=600",
        rating: 4.9,
        ratingCount: 142,
        openingHours: "Senin - Sabtu, 08:00 - 16:00",
        acceptsPickup: true,
      },
      {
        name: "Bank Sampah Berkah Mandiri Garut",
        ownerId: bankOwner._id,
        address: "Jl. Cimanuk No. 42, Garut Kota",
        latitude: -7.2185,
        longitude: 107.9022,
        phone: "085223344556",
        photoUrl: "https://images.unsplash.com/photo-1604187351574-c75ca79f5807?w=600",
        rating: 4.8,
        ratingCount: 98,
        openingHours: "Senin - Minggu, 08:30 - 17:00",
        acceptsPickup: true,
      },
      {
        name: "Bank Sampah Hijau Lestari Bandung",
        ownerId: bankOwner._id,
        address: "Jl. Dago No. 120, Coblong, Bandung",
        latitude: -6.8850,
        longitude: 107.6140,
        phone: "082112233445",
        photoUrl: "https://images.unsplash.com/photo-1595278069441-2cf29f8005a4?w=600",
        rating: 4.9,
        ratingCount: 215,
        openingHours: "Senin - Jumat, 08:00 - 15:30",
        acceptsPickup: true,
      },
      {
        name: "Bank Sampah Merdeka Bersih",
        ownerId: bankOwner._id,
        address: "Jl. Merdeka No. 64, Sumur Bandung",
        latitude: -6.9120,
        longitude: 107.6105,
        phone: "081399887766",
        photoUrl: "https://images.unsplash.com/photo-1567095761054-7a02e69e5c43?w=600",
        rating: 4.7,
        ratingCount: 76,
        openingHours: "Setiap Hari, 07:30 - 16:30",
        acceptsPickup: false,
      },
    ];

    for (const b of banksData) {
      let bank = await WasteBank.findOne({ name: b.name });
      if (!bank) {
        bank = await WasteBank.create(b);
        console.log("✅ Seeded Waste Bank:", bank.name);
      }

      // Seed standard category prices for this bank
      const priceCatalog = [
        { category: "Plastik", subCategory: "Botol PET Bening / Bersih", pricePerKg: 4500, minWeightKg: 0.1 },
        { category: "Plastik", subCategory: "Plastik Campur / Kresek", pricePerKg: 2000, minWeightKg: 0.5 },
        { category: "Kertas & Kardus", subCategory: "Kardus Tebal / Box", pricePerKg: 2500, minWeightKg: 0.5 },
        { category: "Kertas & Kardus", subCategory: "Kertas HVS Putih / Buku", pricePerKg: 3000, minWeightKg: 0.2 },
        { category: "Logam & Besi", subCategory: "Kaleng Minuman Aluminium", pricePerKg: 12000, minWeightKg: 0.1 },
        { category: "Logam & Besi", subCategory: "Besi Tua / Pipa Padat", pricePerKg: 6000, minWeightKg: 1.0 },
        { category: "Kaca & Botol", subCategory: "Botol Kaca Sirup / Kecap", pricePerKg: 1200, minWeightKg: 0.5 },
        { category: "Elektronik", subCategory: "Perangkat Elektronik Rusak", pricePerKg: 8000, minWeightKg: 0.5 },
        { category: "Minyak Jelantah", subCategory: "Minyak Goreng Bekas Saring", pricePerKg: 7500, minWeightKg: 1.0 },
        { category: "Organik", subCategory: "Sisa Makanan & Sayur", pricePerKg: 1000, minWeightKg: 1.0 },
      ];

      for (const p of priceCatalog) {
        await WasteCategoryPrice.findOneAndUpdate(
          { bankSampahId: bank._id, category: p.category, subCategory: p.subCategory },
          { ...p, bankSampahId: bank._id, isActive: true, updatedBy: bankOwner._id },
          { upsert: true }
        );
      }
    }

    // 3. Seed Vouchers for Point Redemption
    const vouchersData = [
      {
        voucherCode: "RCY-MKT-5K",
        title: "Diskon Rp 5.000 Marketplace",
        description: "Potongan langsung Rp 5.000 untuk belanja apa saja di Kanyaah Mart.",
        service: "MARKETPLACE",
        discountType: "FIXED",
        discountValue: 5000,
        minTransaction: 20000,
        pointsCost: 5000,
        validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
      },
      {
        voucherCode: "RCY-RIDE-3K",
        title: "Diskon Rp 3.000 Kanyaah Ride",
        description: "Potongan ongkos perjalanan ojek online Kanyaah Ride.",
        service: "RIDE",
        discountType: "FIXED",
        discountValue: 3000,
        minTransaction: 8000,
        pointsCost: 3000,
        validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      },
      {
        voucherCode: "RCY-SEND-5K",
        title: "Diskon Rp 5.000 Kanyaah Send",
        description: "Hemat ongkir pengiriman barang/paket dengan kurir GEOVERSE.",
        service: "SEND",
        discountType: "FIXED",
        discountValue: 5000,
        minTransaction: 10000,
        pointsCost: 5000,
        validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      },
      {
        voucherCode: "RCY-CAT-10K",
        title: "Diskon Rp 10.000 Kanyaah Catering",
        description: "Potongan makan lezat dari mitra dapur catering GEOVERSE.",
        service: "CATERING",
        discountType: "FIXED",
        discountValue: 10000,
        minTransaction: 30000,
        pointsCost: 10000,
        validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      },
      {
        voucherCode: "RCY-LND-5K",
        title: "Diskon Rp 5.000 Kanyaah Laundry",
        description: "Potongan laundry cuci kering setrika pakaian Anda.",
        service: "LAUNDRY",
        discountType: "FIXED",
        discountValue: 5000,
        minTransaction: 15000,
        pointsCost: 5000,
        validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      },
      {
        voucherCode: "RCY-ALL-20K",
        title: "Voucher Spesial Rp 20.000 Semua Layanan",
        description: "Berlaku untuk Marketplace, Ride, Send, Catering, dan Laundry.",
        service: "ALL",
        discountType: "FIXED",
        discountValue: 20000,
        minTransaction: 50000,
        pointsCost: 20000,
        validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      },
    ];

    for (const v of vouchersData) {
      await Voucher.findOneAndUpdate(
        { voucherCode: v.voucherCode },
        { ...v, status: "ACTIVE" },
        { upsert: true }
      );
    }
    console.log("✅ Seeded Multi-Service Vouchers for Point Redemption");

    console.log("🎉 Kanyaah Recycle Seeding Completed Successfully!");
    await mongoose.disconnect();
  } catch (err) {
    console.error("❌ Seeding Error:", err);
    process.exit(1);
  }
}

seedRecycleData();

const mongoose = require("mongoose");
require("dotenv").config({ path: "./backend/.env" });
const GeoDirectEquipment = require("../models/GeoDirectEquipment");

async function migrate() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB");

  // Update EQ-01 -> Geothermal Dryhouse
  await GeoDirectEquipment.findOneAndUpdate(
    { code: "EQ-01" },
    {
      $set: {
        name: "Geothermal Dryhouse",
        facilityType: "DRYHOUSE",
        description:
          "Layanan pengeringan hasil pertanian, terutama kopi, dengan memanfaatkan energi panas bumi melalui fasilitas Dryhouse.",
        specification:
          "4 Unit Dryhouse dengan kapasitas total 6.000 kg per batch. Dilengkapi pengontrol suhu dan konveksi termal alami panas bumi PGE Kamojang.",
        function:
          "Pengeringan hasil tani & kopi (Geothermal Wash, Honey Skin Contact, Natural Quick Dry) dengan kelembapan terkontrol stabil.",
        capacity: "4 Unit • Maksimal 6.000 kg / batch (Min. 100 kg)",
        maxCapacityKgPerDay: 6000,
        basePrice: 1000,
        pricingUnit: "per_kg",
        pricingFormulaType: "DRYHOUSE_TIERED",
        isAvailable: true,
        comingSoon: false,
        isActive: true,
      },
    }
  );

  // Update EQ-02 -> Geothermal Dehydrator
  await GeoDirectEquipment.findOneAndUpdate(
    { code: "EQ-02" },
    {
      $set: {
        name: "Geothermal Dehydrator",
        facilityType: "DEHYDRATOR",
        description:
          "Fasilitas dehidrasi presisi bersuhu rendah untuk komoditas hortikultura, teh, dan bahan pangan olahan bernilai tinggi.",
        specification:
          "Sistem tray bersirkulasi otomatis dengan sensor kelembapan dan distribusi udara hangat geotermal terkontrol.",
        function: "Dehidrasi buah, sayuran, herba, teh premium, dan rempah.",
        capacity: "Dalam Tahap Riset & Pengujian PGE",
        maxCapacityKgPerDay: 1000,
        basePrice: 0,
        pricingUnit: "per_batch",
        isAvailable: false,
        comingSoon: true,
        isActive: true,
      },
    }
  );

  // Update EQ-03 -> Geothermal Dry Tube
  await GeoDirectEquipment.findOneAndUpdate(
    { code: "EQ-03" },
    {
      $set: {
        name: "Geothermal Dry Tube",
        facilityType: "DRY_TUBE",
        description:
          "Teknologi pengeringan tabung rotary berkesinambungan memanfaatkan uap panas bumi untuk kapasitas volume massal terstandarisasi.",
        specification:
          "Rotary drum berbahan stainless steel food grade dengan injeksi panas geothermal indirect.",
        function: "Pengeringan massal biji-bijian, gabah, dan komoditas curah.",
        capacity: "Dalam Tahap Riset & Pengujian PGE",
        maxCapacityKgPerDay: 5000,
        basePrice: 0,
        pricingUnit: "per_ton",
        isAvailable: false,
        comingSoon: true,
        isActive: true,
      },
    }
  );

  // Set EQ-04 isActive: false
  await GeoDirectEquipment.findOneAndUpdate({ code: "EQ-04" }, { $set: { isActive: false } });

  const active = await GeoDirectEquipment.find({ isActive: true }).sort({ code: 1 }).lean();
  console.log("Active facilities count:", active.length);
  active.forEach((item) =>
    console.log(
      "•",
      item.code,
      ":",
      item.name,
      "| isAvailable:",
      item.isAvailable,
      "| comingSoon:",
      item.comingSoon
    )
  );

  await mongoose.disconnect();
}

migrate().catch(console.error);

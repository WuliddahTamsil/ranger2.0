const WasteBank = require("../models/WasteBank");
const WasteCategoryPrice = require("../models/WasteCategoryPrice");
const { calculateDistanceKm } = require("../services/recycleFareService");

/**
 * 1. Get all Waste Banks (with distance calculation if coords provided)
 * GET /api/waste-banks
 */
const getWasteBanks = async (req, res) => {
  try {
    const { lat, lng, pickup, openNow } = req.query;
    const filter = { status: "ACTIVE" };

    if (pickup === "true") {
      filter.acceptsPickup = true;
    }

    const banks = await WasteBank.find(filter).lean();

    // Attach prices and calculate distance
    const results = await Promise.all(
      banks.map(async (bank) => {
        const prices = await WasteCategoryPrice.find({
          bankSampahId: bank._id,
          isActive: true,
        }).lean();

        let distanceKm = null;
        if (lat != null && lng != null) {
          distanceKm = calculateDistanceKm(
            Number(lat),
            Number(lng),
            bank.latitude,
            bank.longitude
          );
        }

        const maxPrice = prices.length > 0 ? Math.max(...prices.map((p) => p.pricePerKg)) : 0;
        const acceptedCategories = [...new Set(prices.map((p) => p.category))];

        return {
          ...bank,
          distanceKm,
          maxPrice,
          prices,
          acceptedCategories,
        };
      })
    );

    // Sort by distance if coords were provided
    if (lat != null && lng != null) {
      results.sort((a, b) => (a.distanceKm || 999) - (b.distanceKm || 999));
    }

    return res.status(200).json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("getWasteBanks error:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal memuat daftar Bank Sampah.",
    });
  }
};

/**
 * 2. Get Waste Bank Detail by ID
 * GET /api/waste-banks/:id
 */
const getWasteBankById = async (req, res) => {
  try {
    const bank = await WasteBank.findById(req.params.id).lean();
    if (!bank) {
      return res.status(404).json({
        success: false,
        message: "Bank Sampah tidak ditemukan.",
      });
    }

    const prices = await WasteCategoryPrice.find({
      bankSampahId: bank._id,
      isActive: true,
    })
      .sort({ category: 1, pricePerKg: -1 })
      .lean();

    const { lat, lng } = req.query;
    let distanceKm = null;
    if (lat != null && lng != null) {
      distanceKm = calculateDistanceKm(
        Number(lat),
        Number(lng),
        bank.latitude,
        bank.longitude
      );
    }

    return res.status(200).json({
      success: true,
      data: {
        ...bank,
        distanceKm,
        prices,
      },
    });
  } catch (error) {
    console.error("getWasteBankById error:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal memuat detail Bank Sampah.",
    });
  }
};

/**
 * 3. Create a Waste Bank (admin or bank_sampah)
 * POST /api/waste-banks
 */
const createWasteBank = async (req, res) => {
  try {
    const ownerId = req.authUser._id;
    const {
      name,
      address,
      latitude,
      longitude,
      phone,
      photoUrl,
      openingHours,
      acceptsPickup,
      prices = [],
    } = req.body;

    if (!name || !address || latitude == null || longitude == null || !phone) {
      return res.status(400).json({
        success: false,
        message: "Nama, alamat, koordinat peta, dan nomor telepon wajib diisi.",
      });
    }

    const bank = await WasteBank.create({
      name,
      ownerId,
      address,
      latitude: Number(latitude),
      longitude: Number(longitude),
      phone,
      photoUrl: photoUrl || undefined,
      openingHours: openingHours || undefined,
      acceptsPickup: acceptsPickup !== false,
      status: "ACTIVE",
    });

    // Populate initial prices if provided
    if (Array.isArray(prices) && prices.length > 0) {
      const priceDocs = prices.map((p) => ({
        bankSampahId: bank._id,
        category: p.category,
        subCategory: p.subCategory || "Standard",
        pricePerKg: Number(p.pricePerKg) || 1000,
        minWeightKg: Number(p.minWeightKg) || 0.1,
        updatedBy: ownerId,
      }));
      await WasteCategoryPrice.insertMany(priceDocs);
    }

    return res.status(201).json({
      success: true,
      message: "Bank Sampah berhasil didaftarkan.",
      data: bank,
    });
  } catch (error) {
    console.error("createWasteBank error:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mendaftarkan Bank Sampah.",
    });
  }
};

/**
 * 4. Get Category Prices for a Waste Bank
 * GET /api/waste-banks/:id/prices
 */
const getCategoryPrices = async (req, res) => {
  try {
    const prices = await WasteCategoryPrice.find({
      bankSampahId: req.params.id,
      isActive: true,
    }).sort({ category: 1, pricePerKg: -1 });

    return res.status(200).json({
      success: true,
      data: prices,
    });
  } catch (error) {
    console.error("getCategoryPrices error:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal memuat katalog harga sampah.",
    });
  }
};

/**
 * 5. Update or Add Category Price
 * POST /api/waste-banks/:id/prices
 */
const updateCategoryPrice = async (req, res) => {
  try {
    const bankSampahId = req.params.id;
    const { category, subCategory, pricePerKg, minWeightKg } = req.body;

    if (!category || pricePerKg == null) {
      return res.status(400).json({
        success: false,
        message: "Kategori dan harga per kilogram wajib diisi.",
      });
    }

    const price = await WasteCategoryPrice.findOneAndUpdate(
      { bankSampahId, category, subCategory: subCategory || "Standard" },
      {
        pricePerKg: Number(pricePerKg),
        minWeightKg: Number(minWeightKg) || 0.1,
        isActive: true,
        updatedBy: req.authUser._id,
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      success: true,
      message: "Harga kategori sampah berhasil diperbarui.",
      data: price,
    });
  } catch (error) {
    console.error("updateCategoryPrice error:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal memperbarui harga kategori sampah.",
    });
  }
};

module.exports = {
  getWasteBanks,
  getWasteBankById,
  createWasteBank,
  getCategoryPrices,
  updateCategoryPrice,
};

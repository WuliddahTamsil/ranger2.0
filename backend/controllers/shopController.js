const mongoose = require("mongoose");
const MarketplaceStore = require("../models/MarketplaceStore");
const MarketplaceProduct = require("../models/MarketplaceProduct");
const InventoryLog = require("../models/InventoryLog");
const User = require("../models/User");

// Standard Haversine distance calculator in kilometers
const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 1.5; // default fallback
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};

// Check if store is currently open
const isStoreOpen = (openingHours) => {
  if (!openingHours) return true;
  if (openingHours.isOpenNow === false) return false;
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeStr = `${String(currentHour).padStart(2, "0")}:${String(currentMinute).padStart(2, "0")}`;

  const openTime = openingHours.openTime || "07:00";
  const closeTime = openingHours.closeTime || "22:00";

  return currentTimeStr >= openTime && currentTimeStr <= closeTime;
};

/**
 * GET /api/shop/stores
 * Query: latitude, longitude, storeType, query, openNow, sortBy
 */
const getStores = async (req, res) => {
  try {
    const { latitude, longitude, storeType, businessCategory, brandType, query, openNow, sortBy } = req.query;
    const userLat = parseFloat(latitude) || -7.1475;
    const userLon = parseFloat(longitude) || 107.8015;

    // Only ACTIVE outlets are shown to customers
    const filter = { status: "ACTIVE" };

    if (businessCategory && businessCategory !== "ALL" && businessCategory !== "Semua") {
      const catUpper = businessCategory.toUpperCase();
      filter.$or = [
        { businessCategory: catUpper },
        { storeType: catUpper },
      ];
    } else if (storeType && storeType !== "ALL" && storeType !== "Semua") {
      const storeUpper = storeType.toUpperCase();
      filter.$or = [
        { storeType: storeUpper },
        { businessCategory: storeUpper },
      ];
    }

    if (brandType && brandType !== "ALL" && brandType !== "Semua") {
      filter.brandType = brandType.toUpperCase();
    }

    if (query && query.trim()) {
      const q = query.trim();
      const queryCond = [
        { name: { $regex: q, $options: "i" } },
        { outletName: { $regex: q, $options: "i" } },
        { brandName: { $regex: q, $options: "i" } },
        { address: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
      ];
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: queryCond }];
        delete filter.$or;
      } else {
        filter.$or = queryCond;
      }
    }

    let stores = await MarketplaceStore.find(filter).lean();

    // Map distance and open status
    stores = stores.map((store) => {
      const distanceKm = calculateDistanceKm(userLat, userLon, store.latitude, store.longitude);
      const open = isStoreOpen(store.openingHours);
      // delivery estimate: base 15 mins + 3 mins per km
      const estimatedDeliveryMinutes = Math.round(15 + distanceKm * 3);
      // delivery fee: base 8000 up to 3km, then +2000 per km
      const deliveryFee = distanceKm <= 3 ? 8000 : Math.round(8000 + (distanceKm - 3) * 2000);

      return {
        ...store,
        distanceKm,
        isOpen: open,
        estimatedDeliveryMinutes,
        deliveryFee,
      };
    });

    if (openNow === "true" || openNow === true) {
      stores = stores.filter((s) => s.isOpen);
    }

    // Sort
    if (sortBy === "fastest") {
      stores.sort((a, b) => a.estimatedDeliveryMinutes - b.estimatedDeliveryMinutes);
    } else if (sortBy === "rating") {
      stores.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === "cheapest_fee") {
      stores.sort((a, b) => a.deliveryFee - b.deliveryFee);
    } else {
      // Default: nearest
      stores.sort((a, b) => a.distanceKm - b.distanceKm);
    }

    return res.json({
      success: true,
      count: stores.length,
      data: stores,
    });
  } catch (error) {
    console.error("getStores error:", error);
    return res.status(500).json({ success: false, message: "Gagal memuat daftar toko", error: error.message });
  }
};

/**
 * GET /api/shop/stores/:id
 */
const getStoreById = async (req, res) => {
  try {
    const { id } = req.params;
    const { latitude, longitude } = req.query;
    const userLat = parseFloat(latitude) || -7.1475;
    const userLon = parseFloat(longitude) || 107.8015;

    const store = await MarketplaceStore.findById(id).lean();
    if (!store) {
      return res.status(404).json({ success: false, message: "Toko tidak ditemukan" });
    }

    const distanceKm = calculateDistanceKm(userLat, userLon, store.latitude, store.longitude);
    const open = isStoreOpen(store.openingHours);
    const estimatedDeliveryMinutes = Math.round(15 + distanceKm * 3);
    const deliveryFee = distanceKm <= 3 ? 8000 : Math.round(8000 + (distanceKm - 3) * 2000);

    return res.json({
      success: true,
      data: {
        ...store,
        distanceKm,
        isOpen: open,
        estimatedDeliveryMinutes,
        deliveryFee,
      },
    });
  } catch (error) {
    console.error("getStoreById error:", error);
    return res.status(500).json({ success: false, message: "Gagal memuat detail toko", error: error.message });
  }
};

/**
 * GET /api/shop/stores/:id/products
 */
const getStoreProducts = async (req, res) => {
  try {
    const { id } = req.params;
    const { category, query, requiresPrescription, page = 1, limit = 50 } = req.query;

    // Verify store exists and is ACTIVE
    const store = await MarketplaceStore.findById(id).lean();
    if (!store || store.status !== "ACTIVE") {
      return res.status(404).json({ success: false, message: "Toko tidak tersedia atau belum aktif" });
    }

    const filter = {
      storeId: id,
      isActive: true,
      productType: "SHOP",
    };

    if (category && category !== "Semua" && category !== "ALL") {
      filter.$or = [
        { category: { $regex: category, $options: "i" } },
        { cat: { $regex: category, $options: "i" } },
      ];
    }

    if (query && query.trim()) {
      filter.$or = [
        { name: { $regex: query.trim(), $options: "i" } },
        { brand: { $regex: query.trim(), $options: "i" } },
        { description: { $regex: query.trim(), $options: "i" } },
      ];
    }

    if (requiresPrescription !== undefined) {
      filter.requiresPrescription = requiresPrescription === "true";
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const [products, total] = await Promise.all([
      MarketplaceProduct.find(filter).skip(skip).limit(parseInt(limit, 10)).sort({ stock: -1, rating: -1 }).lean(),
      MarketplaceProduct.countDocuments(filter),
    ]);

    // Categories in this store
    const storeCategories = await MarketplaceProduct.distinct("category", { storeId: id, isActive: true, productType: "SHOP" });

    return res.json({
      success: true,
      total,
      page: parseInt(page, 10),
      categories: ["Semua", ...storeCategories.filter(Boolean)],
      data: products,
    });
  } catch (error) {
    console.error("getStoreProducts error:", error);
    return res.status(500).json({ success: false, message: "Gagal memuat produk toko", error: error.message });
  }
};

/**
 * GET /api/shop/categories
 */
const getCategories = async (req, res) => {
  const categories = [
    { id: "cat_supermarket", name: "Supermarket", slug: "supermarket", icon: "Store", color: "#1B7A4E", bg: "#E8F5EE", desc: "Sayur, buah, daging, & susu" },
    { id: "cat_pharmacy", name: "Apotek", slug: "pharmacy", icon: "HeartPulse", color: "#0284C7", bg: "#E0F2FE", desc: "Obat, vitamin, & resep" },
    { id: "cat_minimarket", name: "Minimarket", slug: "minimarket", icon: "ShoppingBag", color: "#EA580C", bg: "#FFEDD5", desc: "Kebutuhan cepat & snack" },
    { id: "cat_sembako", name: "Sembako", slug: "sembako", icon: "Wheat", color: "#D97706", bg: "#FEF3C7", desc: "Beras, minyak, gula, & telur" },
    { id: "cat_beverage", name: "Minuman", slug: "minuman", icon: "Coffee", color: "#0D9488", bg: "#CCFBF1", desc: "Kopi, teh, jus, & air mineral" },
    { id: "cat_snack", name: "Snack & Makanan Ringan", slug: "snack", icon: "Cookie", color: "#E11D48", bg: "#FFE4E6", desc: "Biskuit, keripik, & cokelat" },
    { id: "cat_health", name: "Kesehatan", slug: "kesehatan", icon: "Activity", color: "#10B981", bg: "#D1FAE5", desc: "Masker, termometer, & P3K" },
    { id: "cat_baby", name: "Ibu & Bayi", slug: "bayi", icon: "Baby", color: "#8B5CF6", bg: "#EDE9FE", desc: "Popok, susu, & botol bayi" },
    { id: "cat_personal", name: "Personal Care", slug: "personal_care", icon: "Sparkles", color: "#EC4899", bg: "#FCE7F3", desc: "Sabun, sampo, & pasta gigi" },
    { id: "cat_household", name: "Rumah Tangga", slug: "household", icon: "Home", color: "#6366F1", bg: "#EEF2FF", desc: "Deterjen, pembersih, & tisu" },
    { id: "cat_beauty", name: "Kosmetik & Skincare", slug: "kosmetik", icon: "Smile", color: "#F43F5E", bg: "#FFE4E6", desc: "Perawatan kulit & kecantikan" },
    { id: "cat_umkm", name: "UMKM Lokal", slug: "umkm", icon: "Gift", color: "#F59E0B", bg: "#FEF3C7", desc: "Produk warga & olahan khas" },
  ];

  return res.json({
    success: true,
    data: categories,
  });
};

/**
 * GET /api/shop/search
 * Global search for products, stores, brands, categories
 */
const searchGlobal = async (req, res) => {
  try {
    const { q = "", category = "" } = req.query;
    const query = q.trim();

    if (!query && !category) {
      return res.json({ success: true, products: [], stores: [] });
    }

    // Only active stores
    const storeFilter = { status: "ACTIVE" };
    if (query) {
      storeFilter.$or = [
        { name: { $regex: query, $options: "i" } },
        { outletName: { $regex: query, $options: "i" } },
        { brandName: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
        { address: { $regex: query, $options: "i" } },
      ];
    }

    const matchedStores = await MarketplaceStore.find(storeFilter).limit(10).lean();
    const activeStoreIds = await MarketplaceStore.find({ status: "ACTIVE" }).distinct("_id");

    const productFilter = {
      isActive: true,
      productType: "SHOP",
      storeId: { $in: activeStoreIds },
    };

    if (query) {
      productFilter.$or = [
        { name: { $regex: query, $options: "i" } },
        { brand: { $regex: query, $options: "i" } },
        { category: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
      ];
    }

    if (category && category !== "Semua") {
      productFilter.category = { $regex: category, $options: "i" };
    }

    const products = await MarketplaceProduct.find(productFilter)
      .populate("storeId", "name outletName logo rating storeType businessCategory brandType")
      .limit(30)
      .lean();

    return res.json({
      success: true,
      products,
      stores: matchedStores,
    });
  } catch (error) {
    console.error("searchGlobal error:", error);
    return res.status(500).json({ success: false, message: "Gagal melakukan pencarian", error: error.message });
  }
};

/**
 * GET /api/shop/products/:id
 */
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await MarketplaceProduct.findById(id).populate("storeId").lean();
    if (!product) {
      return res.status(404).json({ success: false, message: "Produk tidak ditemukan" });
    }

    // Related products in the same category
    const related = await MarketplaceProduct.find({
      storeId: product.storeId?._id || product.storeId,
      category: product.category,
      _id: { $ne: product._id },
      isActive: true,
    })
      .limit(6)
      .lean();

    return res.json({
      success: true,
      data: {
        ...product,
        relatedProducts: related,
      },
    });
  } catch (error) {
    console.error("getProductById error:", error);
    return res.status(500).json({ success: false, message: "Gagal memuat detail produk", error: error.message });
  }
};

/**
 * GET /api/shop/merchant/store
 * Returns the authenticated Kanyaah Shop owner's store.
 */
const getMerchantStore = async (req, res) => {
  try {
    if (!req.authUser) return res.status(401).json({ success: false, message: "Autentikasi diperlukan" });
    const store = await MarketplaceStore.findOne({ ownerId: req.authUser._id }).lean();
    if (!store) return res.status(404).json({ success: false, message: "Toko Kanyaah Shop belum tersedia" });
    return res.json({ success: true, data: store });
  } catch (error) {
    console.error("getMerchantStore error:", error);
    return res.status(500).json({ success: false, message: "Gagal memuat profil toko" });
  }
};

/**
 * GET /api/shop/merchant/products
 * Includes inactive products so the owner can manage the full catalog.
 */
const getMerchantProducts = async (req, res) => {
  try {
    if (!req.authUser) return res.status(401).json({ success: false, message: "Autentikasi diperlukan" });
    const store = await MarketplaceStore.findOne({ ownerId: req.authUser._id }).select("_id").lean();
    if (!store) return res.status(404).json({ success: false, message: "Toko Kanyaah Shop belum tersedia" });
    const products = await MarketplaceProduct.find({ ownerId: req.authUser._id, storeId: store._id }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: products, storeId: String(store._id) });
  } catch (error) {
    console.error("getMerchantProducts error:", error);
    return res.status(500).json({ success: false, message: "Gagal memuat katalog toko" });
  }
};

/**
 * POST /api/shop/products
 * Store owner creates a new product
 */
const createProduct = async (req, res) => {
  try {
    const authUser = req.authUser;
    if (!authUser) {
      return res.status(401).json({ success: false, message: "Autentikasi diperlukan" });
    }

    const {
      storeId,
      name,
      brand,
      category,
      subcategory,
      sku,
      barcode,
      description,
      price,
      promoPrice,
      stock,
      minimumStock,
      unit,
      weight,
      requiresPrescription,
      requiresAgeVerification,
      isEcoProduct,
      img,
      images,
    } = req.body;

    if (!storeId || !name || price === undefined || stock === undefined) {
      return res.status(400).json({ success: false, message: "storeId, name, price, dan stock wajib diisi" });
    }

    // Ownership check
    const store = await MarketplaceStore.findById(storeId);
    if (!store) {
      return res.status(404).json({ success: false, message: "Toko tidak ditemukan" });
    }

    const isOwner = String(store.ownerId) === String(authUser._id) || authUser.role === "admin";
    if (!isOwner) {
      return res.status(403).json({ success: false, message: "Anda tidak memiliki izin mengelola produk toko ini" });
    }

    const initialStock = Math.max(0, Number(stock));
    const newProduct = await MarketplaceProduct.create({
      storeId,
      ownerId: authUser._id,
      name: name.trim(),
      brand: brand ? brand.trim() : "",
      category: category || "General",
      subcategory: subcategory ? subcategory.trim() : "",
      cat: category || "General",
      sku: sku ? sku.trim() : "",
      barcode: barcode ? barcode.trim() : "",
      description: description || "",
      price: Number(price),
      promoPrice: promoPrice !== undefined && promoPrice !== null ? Number(promoPrice) : null,
      stock: initialStock,
      minimumStock: Number(minimumStock) || 5,
      unit: unit || "pcs",
      weight: Number(weight) || 250,
      requiresPrescription: Boolean(requiresPrescription),
      requiresAgeVerification: Boolean(requiresAgeVerification),
      isEcoProduct: Boolean(isEcoProduct),
      img: img || (Array.isArray(images) && images[0]) || "",
      images: Array.isArray(images) ? images : img ? [img] : [],
      imageUrls: Array.isArray(images) ? images : img ? [img] : [],
      productType: "SHOP",
    });

    // Record initial inventory log
    await InventoryLog.create({
      productId: newProduct._id,
      storeId,
      type: "RESTOCK",
      quantity: newProduct.stock,
      beforeStock: 0,
      afterStock: newProduct.stock,
      createdBy: authUser._id,
      note: "Stok awal produk baru Kanyaah Shop",
    });

    return res.status(201).json({
      success: true,
      message: "Produk berhasil ditambahkan",
      data: newProduct,
    });
  } catch (error) {
    console.error("createProduct error:", error);
    return res.status(500).json({ success: false, message: "Gagal membuat produk", error: error.message });
  }
};

/**
 * PUT /api/shop/products/:id
 */
const updateProduct = async (req, res) => {
  try {
    const authUser = req.authUser;
    const { id } = req.params;

    const product = await MarketplaceProduct.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Produk tidak ditemukan" });
    }

    const store = await MarketplaceStore.findById(product.storeId);
    const isOwner =
      String(product.ownerId) === String(authUser._id) ||
      (store && String(store.ownerId) === String(authUser._id)) ||
      authUser.role === "admin";

    if (!isOwner) {
      return res.status(403).json({ success: false, message: "Anda tidak berhak mengubah produk ini" });
    }

    const updates = { ...req.body };
    delete updates._id;
    delete updates.ownerId;
    delete updates.storeId;
    updates.productType = "SHOP";

    // If stock is changed directly in updateProduct, create InventoryLog audit
    if (updates.stock !== undefined && Number(updates.stock) !== product.stock) {
      const beforeStock = product.stock;
      const afterStock = Math.max(0, Number(updates.stock));
      const delta = afterStock - beforeStock;

      await InventoryLog.create({
        productId: product._id,
        storeId: product.storeId,
        type: delta >= 0 ? "RESTOCK" : "ADJUSTMENT",
        quantity: Math.abs(delta),
        beforeStock,
        afterStock,
        createdBy: authUser._id,
        note: `Penyesuaian stok saat update data produk (${delta >= 0 ? "+" : ""}${delta})`,
      });
      updates.stock = afterStock;
    }

    if (updates.category && !updates.cat) {
      updates.cat = updates.category;
    }

    const updated = await MarketplaceProduct.findByIdAndUpdate(id, updates, { new: true });

    return res.json({
      success: true,
      message: "Produk berhasil diperbarui",
      data: updated,
    });
  } catch (error) {
    console.error("updateProduct error:", error);
    return res.status(500).json({ success: false, message: "Gagal memperbarui produk", error: error.message });
  }
};

/**
 * DELETE /api/shop/products/:id
 */
const deleteProduct = async (req, res) => {
  try {
    const authUser = req.authUser;
    const { id } = req.params;

    const product = await MarketplaceProduct.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Produk tidak ditemukan" });
    }

    const isOwner = String(product.ownerId) === String(authUser._id) || authUser.role === "admin";
    if (!isOwner) {
      return res.status(403).json({ success: false, message: "Anda tidak berhak menghapus produk ini" });
    }

    product.isActive = false;
    await product.save();

    return res.json({
      success: true,
      message: "Produk berhasil dinonaktifkan",
    });
  } catch (error) {
    console.error("deleteProduct error:", error);
    return res.status(500).json({ success: false, message: "Gagal menghapus produk", error: error.message });
  }
};

/**
 * PUT /api/shop/products/:id/stock
 * Merchant updates product stock with inventory audit trail
 */
const updateProductStock = async (req, res) => {
  try {
    const authUser = req.authUser;
    const { id } = req.params;
    const { quantity, type = "RESTOCK", note = "" } = req.body;

    if (quantity === undefined || isNaN(Number(quantity))) {
      return res.status(400).json({ success: false, message: "Jumlah stok wajib diisi" });
    }

    const product = await MarketplaceProduct.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Produk tidak ditemukan" });
    }

    const isOwner = String(product.ownerId) === String(authUser._id) || authUser.role === "admin";
    if (!isOwner) {
      return res.status(403).json({ success: false, message: "Anda tidak berhak mengubah stok produk ini" });
    }

    const delta = Number(quantity);
    const beforeStock = product.stock;
    const afterStock = Math.max(0, beforeStock + delta);

    product.stock = afterStock;
    await product.save();

    await InventoryLog.create({
      productId: product._id,
      storeId: product.storeId,
      type: type.toUpperCase(),
      quantity: delta,
      beforeStock,
      afterStock,
      createdBy: authUser._id,
      note: note || `Pembaruan stok manual (${type})`,
    });

    return res.json({
      success: true,
      message: "Stok berhasil diperbarui",
      data: {
        productId: product._id,
        beforeStock,
        afterStock,
      },
    });
  } catch (error) {
    console.error("updateProductStock error:", error);
    return res.status(500).json({ success: false, message: "Gagal mengubah stok", error: error.message });
  }
};

/**
 * POST /api/shop/merchant/products/bulk
 * Store owner imports products in bulk (CSV/JSON)
 */
const bulkImportProducts = async (req, res) => {
  try {
    const authUser = req.authUser;
    if (!authUser) {
      return res.status(401).json({ success: false, message: "Autentikasi diperlukan" });
    }

    const { storeId, items } = req.body;
    if (!storeId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "storeId dan daftar produk (items) wajib diisi" });
    }

    const store = await MarketplaceStore.findById(storeId);
    if (!store) {
      return res.status(404).json({ success: false, message: "Toko tidak ditemukan" });
    }

    const isOwner = String(store.ownerId) === String(authUser._id) || authUser.role === "admin";
    if (!isOwner) {
      return res.status(403).json({ success: false, message: "Anda tidak memiliki izin mengelola produk toko ini" });
    }

    const imported = [];
    for (const item of items) {
      if (!item.name || item.price === undefined) continue;
      const initialStock = Math.max(0, Number(item.stock) || 0);
      const prod = await MarketplaceProduct.create({
        storeId,
        ownerId: authUser._id,
        name: String(item.name).trim(),
        brand: String(item.brand || "").trim(),
        category: String(item.category || item.cat || "General").trim(),
        subcategory: String(item.subcategory || "").trim(),
        cat: String(item.category || item.cat || "General").trim(),
        sku: String(item.sku || "").trim(),
        barcode: String(item.barcode || "").trim(),
        description: String(item.description || "").trim(),
        price: Number(item.price),
        promoPrice: item.promoPrice != null ? Number(item.promoPrice) : null,
        stock: initialStock,
        minimumStock: Number(item.minimumStock) || 5,
        unit: String(item.unit || "pcs").trim(),
        weight: Number(item.weight) || 250,
        images: Array.isArray(item.images) ? item.images : item.img ? [item.img] : [],
        img: item.img || (item.images && item.images[0]) || "",
        isActive: item.isActive !== false,
        requiresPrescription: Boolean(item.requiresPrescription),
        requiresAgeVerification: Boolean(item.requiresAgeVerification),
        productType: "SHOP",
      });

      if (initialStock > 0) {
        await InventoryLog.create({
          productId: prod._id,
          storeId,
          type: "RESTOCK",
          quantity: initialStock,
          beforeStock: 0,
          afterStock: initialStock,
          createdBy: authUser._id,
          note: "Import massal katalog produk",
        });
      }
      imported.push(prod);
    }

    return res.status(201).json({
      success: true,
      message: `${imported.length} produk berhasil diimport`,
      count: imported.length,
      data: imported,
    });
  } catch (error) {
    console.error("bulkImportProducts error:", error);
    return res.status(500).json({ success: false, message: "Gagal import produk massal", error: error.message });
  }
};

module.exports = {
  getStores,
  getStoreById,
  getStoreProducts,
  getCategories,
  searchGlobal,
  getProductById,
  getMerchantStore,
  getMerchantProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  updateProductStock,
  bulkImportProducts,
  calculateDistanceKm,
  isStoreOpen,
};

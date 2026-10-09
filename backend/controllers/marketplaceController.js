const mongoose = require("mongoose");
const MarketplaceProduct = require("../models/MarketplaceProduct");
const MarketplaceOrder = require("../models/MarketplaceOrder");
const MarketplaceWithdrawal = require("../models/MarketplaceWithdrawal");
const User = require("../models/User");
const Review = require("../models/Review");

const validateOwner = async (ownerId, mustBeVerified = true) => {
  if (!mongoose.Types.ObjectId.isValid(ownerId)) return null;
  const filter = { _id: ownerId, role: "pemilik_marketplace" };
  if (mustBeVerified) {
    filter.status = "verified";
  }
  return User.findOne(filter).select("_id role status");
};

const getProductsByOwner = async (req, res) => {
  try {
    const owner = await validateOwner(req.params.ownerId, false);
    if (!owner) return res.status(404).json({ success: false, message: "Pemilik marketplace tidak ditemukan" });
    const products = await MarketplaceProduct.find({ ownerId: owner._id }).sort({ createdAt: -1 });
    return res.json({ success: true, count: products.length, data: products });
  } catch (error) {
    console.error("Get marketplace products error:", error);
    return res.status(500).json({ success: false, message: "Gagal mengambil produk marketplace" });
  }
};

const getAllProducts = async (req, res) => {
  try {
    const verifiedOwners = await User.find({ role: "pemilik_marketplace", status: "verified" }).select("_id").lean();
    const verifiedOwnerIds = verifiedOwners.map((u) => u._id);

    const products = await MarketplaceProduct.find({
      ownerId: { $in: verifiedOwnerIds },
      productType: { $ne: "SHOP" },
      $or: [{ storeId: null }, { storeId: { $exists: false } }],
      cat: { $in: ["Makanan", "UMKM Lokal"] },
      isActive: true,
      stock: { $gt: 0 },
    })
      .populate("ownerId", "name roleData")
      .sort({ createdAt: -1 })
      .lean();

    const productIds = products.map((product) => String(product._id));
    const reviews = productIds.length > 0
      ? await Review.find({ productIds: { $in: productIds } }).sort({ createdAt: -1 }).lean()
      : [];
    const reviewMap = new Map();
    reviews.forEach((review) => {
      (review.productIds || []).forEach((productId) => {
        const current = reviewMap.get(String(productId)) || [];
        current.push(review);
        reviewMap.set(String(productId), current);
      });
    });
    const enrichedProducts = products.map((product) => {
      const productReviews = reviewMap.get(String(product._id)) || [];
      const rating = productReviews.length > 0
        ? Number((productReviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) / productReviews.length).toFixed(1))
        : product.rating || 0;
      return { ...product, rating, totalReviews: productReviews.length, reviews: productReviews.slice(0, 20) };
    });
    return res.json({ success: true, count: enrichedProducts.length, data: enrichedProducts });
  } catch (error) {
    console.error("Get all marketplace products error:", error);
    return res.status(500).json({ success: false, message: "Gagal mengambil produk marketplace" });
  }
};

const createProduct = async (req, res) => {
  try {
    const effectiveOwnerId = req.authUser ? req.authUser._id : req.body.ownerId;
    if (req.authUser && req.body.ownerId && String(req.body.ownerId) !== String(req.authUser._id)) {
      return res.status(403).json({ success: false, message: "Anda tidak dapat membuat produk atas nama toko lain." });
    }

    const { name, description, cat, price, stock, isActive, img, images } = req.body;
    const owner = await validateOwner(effectiveOwnerId, true);
    if (!owner) {
      return res.status(403).json({
        success: false,
        message: "Akun pemilik UMKM belum diverifikasi oleh admin atau tidak valid.",
      });
    }

    const numPrice = Number(price);
    const numStock = Number(stock !== undefined ? stock : 0);
    if (!name?.trim() || isNaN(numPrice) || numPrice < 0) {
      return res.status(400).json({ success: false, message: "Nama produk dan harga valid wajib diisi" });
    }
    if (isNaN(numStock) || numStock < 0) {
      return res.status(400).json({ success: false, message: "Jumlah stok tidak valid" });
    }

    const imageList = Array.isArray(images) && images.length > 0 ? images : (img ? [img] : []);
    const primaryImg = (imageList.length > 0 ? imageList[0] : img) || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=300&fit=crop&q=80";

    const allowedCategories = ["Makanan", "UMKM Lokal"];
    const productCat = allowedCategories.includes(cat) ? cat : "Makanan";

    const product = await MarketplaceProduct.create({
      ownerId: owner._id,
      name: name.trim(),
      description: description || "",
      cat: productCat,
      price: numPrice,
      stock: numStock,
      productType: "UMKM",
      isActive: isActive !== undefined ? Boolean(isActive) : true,
      img: primaryImg,
      images: imageList.length > 0 ? imageList : (primaryImg ? [primaryImg] : []),
    });
    return res.status(201).json({ success: true, message: "Produk berhasil disimpan", data: product });
  } catch (error) {
    console.error("Create marketplace product error:", error);
    return res.status(500).json({ success: false, message: "Gagal menyimpan produk marketplace" });
  }
};

const updateProduct = async (req, res) => {
  try {
    const existing = await MarketplaceProduct.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: "Produk tidak ditemukan" });

    if (req.authUser && String(existing.ownerId) !== String(req.authUser._id)) {
      return res.status(403).json({ success: false, message: "Anda tidak memiliki hak akses untuk mengubah produk toko lain." });
    }

    const allowedFields = ["name", "description", "cat", "price", "stock", "isActive", "img", "images", "brand", "unit", "weight"];
    const updatePayload = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        updatePayload[key] = req.body[key];
      }
    }

    if (updatePayload.name !== undefined && !String(updatePayload.name).trim()) {
      return res.status(400).json({ success: false, message: "Nama produk tidak boleh kosong" });
    }
    if (updatePayload.price !== undefined) {
      const p = Number(updatePayload.price);
      if (isNaN(p) || p < 0) return res.status(400).json({ success: false, message: "Harga tidak valid" });
      updatePayload.price = p;
    }
    if (updatePayload.stock !== undefined) {
      const s = Number(updatePayload.stock);
      if (isNaN(s) || s < 0) return res.status(400).json({ success: false, message: "Stok tidak valid" });
      updatePayload.stock = s;
    }

    if (updatePayload.cat !== undefined) {
      const allowedCategories = ["Makanan", "UMKM Lokal"];
      updatePayload.cat = allowedCategories.includes(updatePayload.cat) ? updatePayload.cat : "Makanan";
    }

    if (Array.isArray(updatePayload.images) && updatePayload.images.length > 0) {
      if (!updatePayload.img) {
        updatePayload.img = updatePayload.images[0];
      }
    } else if (updatePayload.img && (!updatePayload.images || updatePayload.images.length === 0)) {
      updatePayload.images = [updatePayload.img];
    }

    const product = await MarketplaceProduct.findByIdAndUpdate(req.params.id, updatePayload, {
      new: true,
      runValidators: true,
    });
    return res.json({ success: true, message: "Produk berhasil diperbarui", data: product });
  } catch (error) {
    console.error("Update marketplace product error:", error);
    return res.status(500).json({ success: false, message: "Gagal memperbarui produk marketplace" });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const existing = await MarketplaceProduct.findById(req.params.id);
    if (!existing) return res.status(404).json({ success: false, message: "Produk tidak ditemukan" });

    if (req.authUser && String(existing.ownerId) !== String(req.authUser._id)) {
      return res.status(403).json({ success: false, message: "Anda tidak memiliki hak akses untuk menghapus produk toko lain." });
    }

    await MarketplaceProduct.findByIdAndDelete(req.params.id);
    return res.json({ success: true, message: "Produk berhasil dihapus" });
  } catch (error) {
    console.error("Delete marketplace product error:", error);
    return res.status(500).json({ success: false, message: "Gagal menghapus produk marketplace" });
  }
};

const getWithdrawals = async (req, res) => {
  try {
    const ownerId = req.authUser?._id || req.query.ownerId;
    if (!ownerId) {
      return res.status(400).json({ success: false, message: "ID pemilik toko diperlukan" });
    }
    const withdrawals = await MarketplaceWithdrawal.find({ ownerId })
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ success: true, data: withdrawals });
  } catch (error) {
    console.error("Get withdrawals error:", error);
    return res.status(500).json({ success: false, message: "Gagal mengambil riwayat penarikan dana" });
  }
};

const createWithdrawal = async (req, res) => {
  try {
    const ownerId = req.authUser?._id || req.body?.ownerId;
    const owner = await validateOwner(ownerId, true);
    if (!owner) {
      return res.status(403).json({ success: false, message: "Hanya pemilik toko Marketplace yang terverifikasi yang dapat mengajukan penarikan dana." });
    }

    const { amount, method, destination, accountName } = req.body;
    const amountNum = Number(amount);

    if (!amountNum || amountNum < 10000) {
      return res.status(400).json({ success: false, message: "Minimal penarikan dana adalah Rp10.000" });
    }
    if (!method || !destination) {
      return res.status(400).json({ success: false, message: "Metode dan tujuan penarikan wajib diisi" });
    }

    // Hitung total pendapatan dari order yang selesai (subtotal)
    const completedOrders = await MarketplaceOrder.find({
      ownerId: owner._id,
      status: "Selesai",
    }).lean();
    const totalEarnings = completedOrders.reduce((sum, order) => sum + Number(order.subtotal || order.totalAmount || 0), 0);

    // Hitung total penarikan yang sudah diajukan (Sukses atau Diproses)
    const activeWithdrawals = await MarketplaceWithdrawal.find({
      ownerId: owner._id,
      status: { $in: ["Sukses", "Diproses"] },
    }).lean();
    const totalWithdrawn = activeWithdrawals.reduce((sum, w) => sum + Number(w.amount || 0), 0);

    const availableBalance = Math.max(0, totalEarnings - totalWithdrawn);
    if (amountNum > availableBalance) {
      return res.status(400).json({
        success: false,
        message: `Saldo tidak mencukupi. Saldo tersedia: Rp${availableBalance.toLocaleString("id-ID")}`,
      });
    }

    const fullOwner = await User.findById(owner._id).select("name roleData").lean();
    const storeName = fullOwner?.roleData?.businessName || fullOwner?.name || "Toko UMKM";

    const withdrawal = await MarketplaceWithdrawal.create({
      ownerId: owner._id,
      storeName,
      amount: amountNum,
      method,
      destination,
      accountName: accountName || "",
      status: "Diproses",
    });

    return res.status(201).json({
      success: true,
      message: "Pengajuan penarikan dana berhasil dibuat",
      data: withdrawal,
    });
  } catch (error) {
    console.error("Create withdrawal error:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal membuat pengajuan penarikan dana",
    });
  }
};

module.exports = {
  getProductsByOwner,
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getWithdrawals,
  createWithdrawal,
};

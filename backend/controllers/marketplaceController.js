const mongoose = require("mongoose");
const MarketplaceProduct = require("../models/MarketplaceProduct");
const User = require("../models/User");
const Review = require("../models/Review");

const validateOwner = async (ownerId) => {
  if (!mongoose.Types.ObjectId.isValid(ownerId)) return null;
  return User.findOne({ _id: ownerId, role: "pemilik_marketplace" }).select("_id role");
};

const getProductsByOwner = async (req, res) => {
  try {
    const owner = await validateOwner(req.params.ownerId);
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
    const products = await MarketplaceProduct.find({ isActive: true, stock: { $gt: 0 } })
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
    const { ownerId, name, description, cat, price, stock, isActive, img, images } = req.body;
    const owner = await validateOwner(ownerId);
    if (!owner) return res.status(403).json({ success: false, message: "Akun pemilik marketplace tidak valid" });
    if (!name?.trim() || price === undefined) {
      return res.status(400).json({ success: false, message: "Nama produk dan harga wajib diisi" });
    }
    const imageList = Array.isArray(images) && images.length > 0 ? images : (img ? [img] : []);
    const primaryImg = (imageList.length > 0 ? imageList[0] : img) || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=300&fit=crop&q=80";

    const product = await MarketplaceProduct.create({
      ownerId: owner._id,
      name: name.trim(),
      description: description || "",
      cat: cat || "Makanan",
      price: Number(price),
      stock: Number(stock || 0),
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
    const updatePayload = { ...req.body };
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
    if (!product) return res.status(404).json({ success: false, message: "Produk tidak ditemukan" });
    return res.json({ success: true, message: "Produk berhasil diperbarui", data: product });
  } catch (error) {
    console.error("Update marketplace product error:", error);
    return res.status(500).json({ success: false, message: "Gagal memperbarui produk marketplace" });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await MarketplaceProduct.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ success: false, message: "Produk tidak ditemukan" });
    return res.json({ success: true, message: "Produk berhasil dihapus" });
  } catch (error) {
    console.error("Delete marketplace product error:", error);
    return res.status(500).json({ success: false, message: "Gagal menghapus produk marketplace" });
  }
};

module.exports = { getProductsByOwner, getAllProducts, createProduct, updateProduct, deleteProduct };

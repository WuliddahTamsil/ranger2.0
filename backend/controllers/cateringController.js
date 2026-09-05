const mongoose = require("mongoose");
const CateringProduct = require("../models/CateringProduct");
const User = require("../models/User");
const CateringOrder = require("../models/CateringOrder");
const Notification = require("../models/Notification");

// Create product (by Pemilik Catering)
const createProduct = async (req, res) => {
  try {
    const { ownerId, name, description, cat, price, stock, isActive, img } = req.body;

    if (!ownerId || !name || price === undefined) {
      return res.status(400).json({
        success: false,
        message: "Owner ID, nama menu, dan harga wajib diisi",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(ownerId)) {
      return res.status(400).json({
        success: false,
        message: "Akun ini masih tersimpan lokal di browser dan belum memiliki ID database. Silakan keluar lalu masuk kembali setelah server aktif.",
      });
    }

    const owner = await User.findById(ownerId).select("role");
    if (!owner || owner.role !== "pemilik_catering") {
      return res.status(403).json({
        success: false,
        message: "Menu hanya dapat ditambahkan oleh akun pemilik catering yang terdaftar.",
      });
    }

    const newProduct = await CateringProduct.create({
      ownerId,
      name: name.trim(),
      description: description || "",
      cat: cat || "Nasi Box",
      price: Number(price),
      stock: stock ? Number(stock) : 0,
      isActive: isActive !== undefined ? isActive : true,
      img: img || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=300&fit=crop&q=80",
    });

    return res.status(201).json({
      success: true,
      message: "Menu catering berhasil ditambahkan",
      data: newProduct,
    });
  } catch (error) {
    console.error("❌ Create product error:", error);
    return res.status(500).json({ success: false, message: "Gagal membuat menu catering", error: error.message });
  }
};

// Get products by ownerId (for Pemilik Catering Dashboard)
const getProductsByOwner = async (req, res) => {
  try {
    const { ownerId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(ownerId)) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [], // Return empty array for local accounts
      });
    }
    const products = await CateringProduct.find({ ownerId }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    console.error("❌ Get products by owner error:", error);
    return res.status(500).json({ success: false, message: "Gagal mengambil data menu", error: error.message });
  }
};

// Update product (by Pemilik Catering)
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await CateringProduct.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Menu tidak ditemukan" });
    }

    const updatedProduct = await CateringProduct.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    });

    return res.status(200).json({
      success: true,
      message: "Menu berhasil diperbarui",
      data: updatedProduct,
    });
  } catch (error) {
    console.error("❌ Update product error:", error);
    return res.status(500).json({ success: false, message: "Gagal memperbarui menu", error: error.message });
  }
};

// Delete product (by Pemilik Catering)
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await CateringProduct.findById(id);
    if (!product) {
      return res.status(404).json({ success: false, message: "Menu tidak ditemukan" });
    }

    await CateringProduct.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Menu berhasil dihapus",
    });
  } catch (error) {
    console.error("❌ Delete product error:", error);
    return res.status(500).json({ success: false, message: "Gagal menghapus menu", error: error.message });
  }
};

// Get all active catering shops (for Customer)
const getAllCateringShops = async (req, res) => {
  try {
    // Return catering shops that are verified or pending (not rejected) so they can be tested immediately
    const query = { role: "pemilik_catering", status: { $ne: "rejected" } };
    const shops = await User.find(query).select("-passwordHash").sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: shops.length,
      data: shops,
    });
  } catch (error) {
    console.error("❌ Get catering shops error:", error);
    return res.status(500).json({ success: false, message: "Gagal mengambil data mitra catering", error: error.message });
  }
};

// Get products/menus by shop ownerId (for Customer Detail View)
const getProductsByShop = async (req, res) => {
  try {
    const { ownerId } = req.params;
    // Customer should only see active products
    const products = await CateringProduct.find({ ownerId, isActive: true }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: products.length,
      data: products,
    });
  } catch (error) {
    console.error("❌ Get products by shop error:", error);
    return res.status(500).json({ success: false, message: "Gagal mengambil menu catering", error: error.message });
  }
};

const getAllActiveProducts = async (req, res) => {
  try {
    const products = await CateringProduct.find({ isActive: true, stock: { $gt: 0 } })
      .populate("ownerId", "name roleData")
      .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, count: products.length, data: products });
  } catch (error) {
    console.error("Get all active catering products error:", error);
    return res.status(500).json({ success: false, message: "Gagal mengambil menu catering" });
  }
};

// Create catering order (by Customer)
const createCateringOrder = async (req, res) => {
  try {
    const {
      customerId,
      ownerId,
      customerName,
      customerPhone,
      address,
      menuName,
      portions,
      price,
      totalAmount,
      deliveryFee,
      serviceFee,
      paymentOption,
      paymentMethod,
      paymentStatus,
      paidAmount,
      remainingAmount,
      cateringDate,
      cateringTime,
      notes,
      productId,
      storeId,
      driverTip,
      voucherId,
      discount,
    } = req.body;

    if (!ownerId || !customerId || !customerName || !address || !menuName || !paymentMethod) {
      return res.status(400).json({ success: false, message: "Data pesanan catering belum lengkap" });
    }
    const orderCode = `RNG-CAT-${Date.now().toString().slice(-8)}`;

    const newOrder = await CateringOrder.create({
      orderCode,
      customerId,
      ownerId,
      customerName,
      customerPhone,
      address,
      storeId: storeId || String(ownerId),
      productId: productId || "",
      menuName,
      portions,
      price,
      totalAmount,
      deliveryFee: deliveryFee || 0,
      serviceFee: serviceFee || 0,
      driverTip: driverTip || 0,
      voucherId: voucherId || "",
      discount: discount || 0,
      paymentOption,
      paymentMethod,
      paymentStatus,
      paidAmount,
      remainingAmount,
      cateringDate,
      cateringTime,
      status: "Menunggu",
      notes: notes || "",
    });

    req.io?.to(`owner:${ownerId}`).emit("order_created", newOrder);
    req.io?.to(`customer:${customerId}`).emit("order_created", newOrder);
    if (mongoose.Types.ObjectId.isValid(customerId)) {
      await Notification.create({
        userId: customerId,
        title: "Pesanan catering berhasil dibuat",
        message: `Pesanan ${newOrder.orderCode} telah diteruskan ke catering.`,
        type: "payment_confirmed",
        relatedId: newOrder._id,
      });
    }
    if (mongoose.Types.ObjectId.isValid(ownerId)) {
      await Notification.create({
        userId: ownerId,
        title: "Pesanan catering baru masuk",
        message: `${customerName} membuat pesanan ${newOrder.orderCode}.`,
        type: "order_new",
        relatedId: newOrder._id,
      });
    }
    return res.status(201).json({
      success: true,
      message: "Pemesanan catering berhasil dibuat",
      data: newOrder,
    });
  } catch (error) {
    console.error("❌ Create catering order error:", error);
    return res.status(500).json({ success: false, message: "Gagal membuat pemesanan catering", error: error.message });
  }
};

const getCateringOrdersByCustomer = async (req, res) => {
  try {
    const orders = await CateringOrder.find({ customerId: req.params.customerId }).sort({ createdAt: -1 }).lean();
    return res.status(200).json({ success: true, data: orders });
  } catch (error) {
    console.error("Get catering orders by customer error:", error);
    return res.status(500).json({ success: false, message: "Gagal mengambil pesanan customer" });
  }
};

// Get catering orders by ownerId (for Pemilik Catering Dashboard)
const getCateringOrdersByOwner = async (req, res) => {
  try {
    const { ownerId } = req.params;
    const orders = await CateringOrder.find({ ownerId }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    console.error("❌ Get catering orders by owner error:", error);
    return res.status(500).json({ success: false, message: "Gagal mengambil data pesanan catering", error: error.message });
  }
};

// Update catering order status (by Pemilik Catering)
const updateCateringOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const order = await CateringOrder.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Pesanan tidak ditemukan" });
    }

    order.status = status;
    await order.save();
    if (mongoose.Types.ObjectId.isValid(order.customerId)) {
      await Notification.create({
        userId: order.customerId,
        title: "Status pesanan catering diperbarui",
        message: `Pesanan ${order.orderCode} sekarang ${order.status}.`,
        type: "order_status",
        relatedId: order._id,
      });
    }
    req.io?.to(`owner:${order.ownerId}`).emit("order_status_updated", order);
    req.io?.to(`customer:${order.customerId}`).emit("order_status_updated", order);

    return res.status(200).json({
      success: true,
      message: "Status pesanan berhasil diperbarui",
      data: order,
    });
  } catch (error) {
    console.error("❌ Update catering order status error:", error);
    return res.status(500).json({ success: false, message: "Gagal memperbarui status pesanan", error: error.message });
  }
};

module.exports = {
  createProduct,
  getProductsByOwner,
  updateProduct,
  deleteProduct,
  getAllCateringShops,
  getProductsByShop,
  getAllActiveProducts,
  createCateringOrder,
  getCateringOrdersByOwner,
  getCateringOrdersByCustomer,
  updateCateringOrderStatus,
};

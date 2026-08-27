const LaundryStore = require("../models/LaundryStore");
const LaundryOrder = require("../models/LaundryOrder");
const User = require("../models/User");

// 1. Ambil semua toko laundry (Explore Customer)
exports.getStores = async (req, res) => {
  try {
    const { search, category } = req.query;

    // Auto-sync: Pastikan semua akun bertipe pemilik_laundry memiliki entri toko
    const laundryOwners = await User.find({ role: "pemilik_laundry" });
    for (const owner of laundryOwners) {
      const exists = await LaundryStore.findOne({ ownerId: owner._id });
      if (!exists) {
        const storeName = owner.roleData?.businessName || owner.name || "Toko Laundry Mitra";
        await LaundryStore.create({
          ownerId: owner._id,
          storeName: storeName.charAt(0).toUpperCase() + storeName.slice(1),
          description: owner.roleData?.description || "Layanan laundry profesional, cepat, bersih higienis, dan terpercaya.",
          address: owner.address || owner.roleData?.businessAddress || "Jl. Kamojang, Garut",
          phone: owner.phone || "",
          openingHours: "Buka • Tutup 21.00",
          isOpen: true,
          rating: 4.9,
          totalReviews: 45,
          distanceText: "0.4 km",
          imageUrl: owner.profilePhoto || "https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=600&q=80",
          badges: ["Antar Jemput", "Ekspres 3 Jam", "Garansi Bersih"],
          services: [
            { name: "Cuci Komplit (Cuci + Setrika)", price: 6000, unit: "kg", desc: "Cuci, kering, setrika uap, pewangi & packing rapi", category: "biasa", durationHours: 24, isActive: true },
            { name: "Express 3 Jam (Siap Pakai)", price: 10000, unit: "kg", desc: "Prioritas khusus selesai dalam 3 jam", category: "ekspres", durationHours: 3, isActive: true },
            { name: "Cuci Kering Lipat", price: 4500, unit: "kg", desc: "Cuci higienis & lipat rapi tanpa setrika", category: "biasa", durationHours: 24, isActive: true },
            { name: "Setrika Uap Saja", price: 3500, unit: "kg", desc: "Setrika uap licin dan wangi tahan lama", category: "biasa", durationHours: 12, isActive: true },
            { name: "Cuci Bedcover Besar", price: 25000, unit: "pcs", desc: "Pembersihan menyeluruh bedcover/selimut besar", category: "satuan", durationHours: 48, isActive: true },
          ],
        });
      }
    }

    let filter = { isOpen: true };

    if (search) {
      filter.$or = [
        { storeName: { $regex: search, $options: "i" } },
        { address: { $regex: search, $options: "i" } },
        { "services.name": { $regex: search, $options: "i" } },
      ];
    }

    const stores = await LaundryStore.find(filter).sort({ createdAt: -1 });
    return res.status(200).json({
      success: true,
      count: stores.length,
      data: stores,
    });
  } catch (error) {
    console.error("❌ getStores Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 2. Ambil detail satu toko laundry
exports.getStoreById = async (req, res) => {
  try {
    const store = await LaundryStore.findById(req.params.id);
    if (!store) {
      return res.status(404).json({ success: false, message: "Toko laundry tidak ditemukan" });
    }
    return res.status(200).json({ success: true, data: store });
  } catch (error) {
    console.error("❌ getStoreById Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 3. Ambil toko milik owner saat ini
exports.getMyStore = async (req, res) => {
  try {
    const ownerId = req.user?.id || req.query.ownerId;
    if (!ownerId) {
      return res.status(400).json({ success: false, message: "Owner ID diperlukan" });
    }

    let store = await LaundryStore.findOne({ ownerId });
    if (!store) {
      // Buat default toko jika belum ada
      store = await LaundryStore.create({
        ownerId,
        storeName: "Toko Laundry Saya",
        address: "Kamojang, Jawa Barat",
        services: [
          { name: "Cuci Komplit (Cuci + Setrika)", price: 6000, unit: "kg", desc: "Cuci, kering, setrika, pewangi, dan packing rapi", category: "biasa", durationHours: 24 },
          { name: "Cuci Kering Lipat", price: 4500, unit: "kg", desc: "Cuci bersih, keringkan dan lipat rapi tanpa setrika", category: "biasa", durationHours: 24 },
          { name: "Setrika Saja", price: 3500, unit: "kg", desc: "Setrika uap licin dan wangi tahan lama", category: "biasa", durationHours: 12 },
          { name: "Express 3 Jam", price: 10000, unit: "kg", desc: "Selesai dalam 3 jam siap pakai", category: "ekspres", durationHours: 3 },
          { name: "Bedcover / Selimut Besar", price: 25000, unit: "pcs", desc: "Pembersihan menyeluruh bebas tungau dan wangi", category: "satuan", durationHours: 48 },
        ],
      });
    }

    return res.status(200).json({ success: true, data: store });
  } catch (error) {
    console.error("❌ getMyStore Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 4. Update profil toko & layanan oleh pemilik
exports.saveMyStore = async (req, res) => {
  try {
    const ownerId = req.user?.id || req.body.ownerId;
    const { storeName, description, address, phone, openingHours, isOpen, imageUrl, services, badges } = req.body;

    let store = await LaundryStore.findOne({ ownerId });
    if (store) {
      if (storeName) store.storeName = storeName;
      if (description) store.description = description;
      if (address) store.address = address;
      if (phone) store.phone = phone;
      if (openingHours) store.openingHours = openingHours;
      if (typeof isOpen === "boolean") store.isOpen = isOpen;
      if (imageUrl) store.imageUrl = imageUrl;
      if (services) store.services = services;
      if (badges) store.badges = badges;
      await store.save();
    } else {
      store = await LaundryStore.create({
        ownerId,
        storeName: storeName || "Usaha Laundry",
        description,
        address: address || "Jl. Kamojang",
        phone,
        openingHours,
        isOpen: isOpen ?? true,
        imageUrl,
        services: services || [],
        badges,
      });
    }

    return res.status(200).json({ success: true, data: store, message: "Data toko laundry berhasil disimpan" });
  } catch (error) {
    console.error("❌ saveMyStore Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 5. Buat Pesanan Baru oleh Customer
exports.createOrder = async (req, res) => {
  try {
    const {
      customerId,
      customerName,
      customerPhone,
      pickupAddress,
      pickupCoords,
      deliveryAddress,
      deliveryCoords,
      storeId,
      storeName,
      ownerId,
      serviceId,
      serviceName,
      pricePerUnit,
      unitType,
      notes,
    } = req.body;

    const orderCode = `LND-${Math.floor(1000 + Math.random() * 9000)}`;

    const newOrder = await LaundryOrder.create({
      orderCode,
      customerId: customerId || "cust-unknown",
      customerName: customerName || "Pelanggan Rangers",
      customerPhone: customerPhone || "08123456789",
      pickupAddress: pickupAddress || "Jl. Mawar No. 12, Kamojang",
      pickupCoords: pickupCoords || "",
      deliveryAddress: deliveryAddress || pickupAddress || "Jl. Mawar No. 12, Kamojang",
      deliveryCoords: deliveryCoords || "",
      storeId,
      storeName: storeName || "Mitra Laundry",
      ownerId: ownerId || "owner-unknown",
      serviceId: serviceId || "komplit",
      serviceName: serviceName || "Cuci Komplit",
      pricePerUnit: Number(pricePerUnit) || 6000,
      unitType: unitType || "kg",
      notes: notes || "",
      status: "MENUNGGU_DRIVER_JEMPUT",
      paymentStatus: "menunggu_timbangan",
    });

    // Realtime notification via Socket.io
    if (req.io) {
      req.io.emit("new_laundry_order", newOrder);
      req.io.emit(`laundry_owner_${ownerId}`, { type: "NEW_ORDER", order: newOrder });
    }

    return res.status(201).json({
      success: true,
      data: newOrder,
      message: "Pesanan laundry berhasil dibuat. Menunggu penjemputan driver!",
    });
  } catch (error) {
    console.error("❌ createOrder Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 6. Ambil pesanan Customer
exports.getCustomerOrders = async (req, res) => {
  try {
    const { customerId } = req.params;
    const orders = await LaundryOrder.find({ customerId }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: orders });
  } catch (error) {
    console.error("❌ getCustomerOrders Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 7. Ambil pesanan Toko Laundry / Owner
exports.getStoreOrders = async (req, res) => {
  try {
    const { ownerId } = req.params;
    let query = {};
    if (ownerId && ownerId !== "all") {
      query.ownerId = ownerId;
    }
    const orders = await LaundryOrder.find(query).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: orders });
  } catch (error) {
    console.error("❌ getStoreOrders Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 8. Ambil pesanan untuk Driver (Jemput & Antar)
exports.getDriverOrders = async (req, res) => {
  try {
    // Driver melihat order yang butuh penjemputan atau butuh pengantaran
    const orders = await LaundryOrder.find({
      status: {
        $in: [
          "MENUNGGU_DRIVER_JEMPUT",
          "DRIVER_MENUJU_CUSTOMER",
          "DRIVER_MENUJU_LAUNDRY",
          "SIAP_DIANTAR",
          "DRIVER_MENGANTAR_BALIK",
        ],
      },
    }).sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: orders });
  } catch (error) {
    console.error("❌ getDriverOrders Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 9. Pemilik Laundry Menimbang & Terbitkan Tagihan ke Customer
exports.weighAndBillOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { weightOrQty, customLaundryCost } = req.body;

    const order = await LaundryOrder.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Pesanan laundry tidak ditemukan" });
    }

    const actualWeight = Number(weightOrQty);
    if (isNaN(actualWeight) || actualWeight <= 0) {
      return res.status(400).json({ success: false, message: "Hasil timbangan harus berupa angka positif" });
    }

    order.actualWeightOrQty = actualWeight;
    // Hitung biaya laundry
    const laundryCost = customLaundryCost ? Number(customLaundryCost) : Math.round(actualWeight * order.pricePerUnit);
    order.laundryCost = laundryCost;
    order.totalAmount = laundryCost + (order.deliveryFeePickup || 4000) + (order.deliveryFeeDrop || 4000) + (order.serviceFee || 1000);
    order.status = "MENUNGGU_PEMBAYARAN";
    order.paymentStatus = "menunggu_pembayaran";

    await order.save();

    // Broadcast Realtime via Socket.io
    if (req.io) {
      req.io.emit("laundry_order_updated", order);
      req.io.emit(`laundry_customer_${order.customerId}`, {
        type: "INVOICE_READY",
        message: `Tagihan laundry untuk order ${order.orderCode} sebesar Rp ${order.totalAmount.toLocaleString("id-ID")} siap dibayar.`,
        order,
      });
    }

    return res.status(200).json({
      success: true,
      data: order,
      message: `Tagihan berhasil diterbitkan! Berat: ${actualWeight} ${order.unitType}, Total: Rp ${order.totalAmount.toLocaleString("id-ID")}`,
    });
  } catch (error) {
    console.error("❌ weighAndBillOrder Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 10. Customer Mengirim Bukti Pembayaran (Wajib QRIS / Transfer Bank + Bukti Upload)
exports.payOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentMethod, paymentProofUrl } = req.body;

    const order = await LaundryOrder.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Pesanan laundry tidak ditemukan" });
    }

    if (!paymentProofUrl) {
      return res.status(400).json({ success: false, message: "Bukti transfer / pembayaran wajib diupload!" });
    }

    order.paymentMethod = paymentMethod === "Transfer Bank" ? "Transfer Bank" : "QRIS";
    order.paymentProofUrl = paymentProofUrl;
    order.paymentStatus = "menunggu_verifikasi";
    order.status = "MENUNGGU_VERIFIKASI_PEMBAYARAN";

    await order.save();

    // Broadcast Realtime via Socket.io ke Pemilik Laundry
    if (req.io) {
      req.io.emit("laundry_order_updated", order);
      req.io.emit(`laundry_owner_${order.ownerId}`, {
        type: "PAYMENT_PROOF_UPLOADED",
        message: `Customer ${order.customerName} telah mengunggah bukti pembayaran untuk order ${order.orderCode}. Silakan verifikasi!`,
        order,
      });
    }

    return res.status(200).json({
      success: true,
      data: order,
      message: "Bukti pembayaran berhasil dikirim! Menunggu verifikasi dari pemilik laundry.",
    });
  } catch (error) {
    console.error("❌ payOrder Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 10B. Pemilik Laundry Memverifikasi Bukti Pembayaran
exports.verifyPayment = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, rejectionReason } = req.body; // action: 'approve' | 'reject'

    const order = await LaundryOrder.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Pesanan laundry tidak ditemukan" });
    }

    if (action === "approve") {
      order.paymentStatus = "lunas";
      order.status = "SEDANG_DICUCI";
      order.paidAt = new Date();
      order.paymentRejectionReason = "";
    } else {
      order.paymentStatus = "ditolak";
      order.status = "MENUNGGU_PEMBAYARAN";
      order.paymentRejectionReason = rejectionReason || "Bukti transfer tidak jelas atau nominal belum sesuai. Silakan unggah ulang.";
    }

    await order.save();

    // Broadcast Realtime ke Customer
    if (req.io) {
      req.io.emit("laundry_order_updated", order);
      req.io.emit(`laundry_customer_${order.customerId}`, {
        type: action === "approve" ? "PAYMENT_APPROVED" : "PAYMENT_REJECTED",
        message: action === "approve"
          ? `Pembayaran pesanan ${order.orderCode} telah diverifikasi lunas oleh pemilik laundry. Pakaian mulai diproses cuci!`
          : `Bukti pembayaran pesanan ${order.orderCode} ditolak: ${order.paymentRejectionReason}`,
        order,
      });
    }

    return res.status(200).json({
      success: true,
      data: order,
      message: action === "approve" ? "Pembayaran berhasil diverifikasi lunas!" : "Bukti pembayaran ditolak, customer diminta upload ulang.",
    });
  } catch (error) {
    console.error("❌ verifyPayment Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 11. Update Status Pesanan Umum (Driver / Mitra)
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, driverPickupId, driverPickupName, driverDeliveryId, driverDeliveryName } = req.body;

    const order = await LaundryOrder.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Pesanan laundry tidak ditemukan" });
    }

    // Validasi aturan: Jangan izinkan pengantaran balik jika belum bayar
    if (
      (status === "DRIVER_MENGANTAR_BALIK" || status === "SELESAI") &&
      order.paymentStatus !== "lunas"
    ) {
      return res.status(400).json({
        success: false,
        message: "Pakaian tidak dapat diantar ke customer sebelum pembayaran lunas!",
      });
    }

    if (status) order.status = status;
    if (driverPickupId) order.driverPickupId = driverPickupId;
    if (driverPickupName) order.driverPickupName = driverPickupName;
    if (driverDeliveryId) order.driverDeliveryId = driverDeliveryId;
    if (driverDeliveryName) order.driverDeliveryName = driverDeliveryName;

    await order.save();

    if (req.io) {
      req.io.emit("laundry_order_updated", order);
      req.io.emit(`laundry_customer_${order.customerId}`, { type: "STATUS_CHANGE", order });
      req.io.emit(`laundry_owner_${order.ownerId}`, { type: "STATUS_CHANGE", order });
    }

    return res.status(200).json({
      success: true,
      data: order,
      message: `Status pesanan berhasil diupdate menjadi: ${order.status}`,
    });
  } catch (error) {
    console.error("❌ updateOrderStatus Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

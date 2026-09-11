const mongoose = require("mongoose");
const LaundryStore = require("../models/LaundryStore");
const LaundryOrder = require("../models/LaundryOrder");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { syncConversationForOrder } = require("../services/conversationService");

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
      const ownerUser = await User.findById(ownerId);
      const storeName = ownerUser?.roleData?.businessName || ownerUser?.name || "Toko Laundry Saya";
      // Buat default toko jika belum ada dengan rekening kosong (belum diatur)
      store = await LaundryStore.create({
        ownerId,
        storeName: storeName.charAt(0).toUpperCase() + storeName.slice(1),
        address: ownerUser?.address || ownerUser?.roleData?.businessAddress || "Kamojang, Jawa Barat",
        phone: ownerUser?.phone || "",
        bankName: "",
        bankAccountNumber: "",
        bankAccountHolder: "",
        qrisImageUrl: "",
        services: [
          { name: "Cuci Komplit (Cuci + Setrika)", price: 6000, unit: "kg", desc: "Cuci, kering, setrika, pewangi, dan packing rapi", category: "biasa", durationHours: 24, isActive: true },
          { name: "Cuci Kering Lipat", price: 4500, unit: "kg", desc: "Cuci bersih, keringkan dan lipat rapi tanpa setrika", category: "biasa", durationHours: 24, isActive: true },
          { name: "Setrika Saja", price: 3500, unit: "kg", desc: "Setrika uap licin dan wangi tahan lama", category: "biasa", durationHours: 12, isActive: true },
          { name: "Express 3 Jam", price: 10000, unit: "kg", desc: "Selesai dalam 3 jam siap pakai", category: "ekspres", durationHours: 3, isActive: true },
          { name: "Bedcover / Selimut Besar", price: 25000, unit: "pcs", desc: "Pembersihan menyeluruh bebas tungau dan wangi", category: "satuan", durationHours: 48, isActive: true },
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
    const {
      storeName,
      description,
      address,
      phone,
      openingHours,
      isOpen,
      imageUrl,
      services,
      badges,
      bankName,
      bankAccountNumber,
      bankAccountHolder,
      qrisImageUrl,
    } = req.body;

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
      if (bankName) store.bankName = bankName;
      if (bankAccountNumber) store.bankAccountNumber = bankAccountNumber;
      if (bankAccountHolder) store.bankAccountHolder = bankAccountHolder;
      if (qrisImageUrl) store.qrisImageUrl = qrisImageUrl;
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
        bankName: bankName || "BCA",
        bankAccountNumber: bankAccountNumber || "",
        bankAccountHolder: bankAccountHolder || "",
        qrisImageUrl: qrisImageUrl || "",
      });
    }

    return res.status(200).json({ success: true, data: store, message: "Data toko laundry berhasil disimpan" });
  } catch (error) {
    console.error("❌ saveMyStore Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 5. Buat Pesanan Baru oleh Customer (Status: MENUNGGU_KONFIRMASI_MITRA)
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
      addressSnapshot,
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

    // Snapshot store bank & QRIS details
    let storeSnapshot = null;
    if (storeId) {
      storeSnapshot = await LaundryStore.findById(storeId);
    }
    if (!storeSnapshot && ownerId) {
      storeSnapshot = await LaundryStore.findOne({ ownerId });
    }

    const newOrder = await LaundryOrder.create({
      orderCode,
      customerId: customerId || "cust-unknown",
      customerName: customerName || "Pelanggan GEOVERSE",
      customerPhone: customerPhone || "08123456789",
      pickupAddress: pickupAddress || "Jl. Mawar No. 12, Kamojang",
      pickupCoords: pickupCoords || "",
      deliveryAddress: deliveryAddress || pickupAddress || "Jl. Mawar No. 12, Kamojang",
      deliveryCoords: deliveryCoords || "",
      addressSnapshot: addressSnapshot || null,
      storeId: storeSnapshot ? storeSnapshot._id : storeId,
      storeName: storeName || (storeSnapshot ? storeSnapshot.storeName : "Mitra Laundry"),
      ownerId: ownerId || (storeSnapshot ? String(storeSnapshot.ownerId) : "owner-unknown"),
      serviceId: serviceId || "komplit",
      serviceName: serviceName || "Cuci Komplit",
      pricePerUnit: Number(pricePerUnit) || 6000,
      unitType: unitType || "kg",
      notes: notes || "",
      bankName: storeSnapshot?.bankName || "BCA",
      bankAccountNumber: storeSnapshot?.bankAccountNumber || "",
      bankAccountHolder: storeSnapshot?.bankAccountHolder || "",
      qrisImageUrl: storeSnapshot?.qrisImageUrl || "",
      deliveryFeePickup: 4000,
      deliveryFeeDrop: 4000,
      serviceFee: 1000,
      status: "MENUNGGU_KONFIRMASI_MITRA",
      paymentStatus: "menunggu_timbangan",
    });

    await syncConversationForOrder(newOrder, "laundry");

    // Realtime notification via Socket.io
    if (req.io) {
      req.io.emit("new_laundry_order", newOrder);
      req.io.emit(`laundry_owner_${newOrder.ownerId}`, { type: "NEW_ORDER", order: newOrder });
    }

    return res.status(201).json({
      success: true,
      data: newOrder,
      message: "Pesanan laundry berhasil dikirim! Menunggu konfirmasi (ACC) pemilik laundry.",
    });
  } catch (error) {
    console.error("❌ createOrder Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 5B. Pemilik Laundry ACC Pesanan Masuk (Status -> MENUNGGU_DRIVER_JEMPUT)
exports.acceptOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await LaundryOrder.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Pesanan laundry tidak ditemukan" });
    }

    order.status = "MENUNGGU_DRIVER_JEMPUT";
    await order.save();

    // Broadcast ke Driver & Customer
    if (req.io) {
      req.io.emit("laundry_order_updated", order);
      req.io.emit("broadcast_driver_pickup", {
        type: "NEW_PICKUP_JOB",
        message: `Order Jemput Laundry baru (${order.orderCode}) dari ${order.customerName}!`,
        order,
      });
      req.io.emit(`laundry_customer_${order.customerId}`, {
        type: "ORDER_ACCEPTED_BY_MITRA",
        message: `Pesanan ${order.orderCode} telah disetujui Mitra Laundry. Mencari driver terdekat untuk penjemputan!`,
        order,
      });
    }

    return res.status(200).json({
      success: true,
      data: order,
      message: "Pesanan disetujui! Notifikasi penjemputan telah disiarkan ke para driver.",
    });
  } catch (error) {
    console.error("❌ acceptOrder Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 5C. Driver Mengambil Job Penjemputan (Sistem Cepat-cepatan / First-Come-First-Serve)
exports.takePickupJob = async (req, res) => {
  try {
    const { id } = req.params;
    const { driverId, driverName, driverPhone } = req.body;

    const order = await LaundryOrder.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Pesanan tidak ditemukan" });
    }

    if (order.status !== "MENUNGGU_DRIVER_JEMPUT") {
      return res.status(400).json({
        success: false,
        message: "Maaf, order penjemputan ini sudah diambil oleh driver lain!",
      });
    }

    order.driverPickupId = driverId;
    order.driverPickupName = driverName || "Driver GEOVERSE";
    order.driverPickupPhone = driverPhone || "0812-3456-7890";
    order.status = "DRIVER_MENUJU_CUSTOMER";
    await order.save();

    if (req.io) {
      req.io.emit("laundry_order_updated", order);
      req.io.emit(`laundry_customer_${order.customerId}`, {
        type: "DRIVER_ASSIGNED_PICKUP",
        message: `Driver ${order.driverPickupName} sedang menuju lokasimu untuk mengambil pakaian kotor.`,
        order,
      });
      req.io.emit(`laundry_owner_${order.ownerId}`, {
        type: "DRIVER_ASSIGNED_PICKUP",
        message: `Driver ${order.driverPickupName} telah mengambil tugas penjemputan order ${order.orderCode}.`,
        order,
      });
    }

    return res.status(200).json({
      success: true,
      data: order,
      message: "Berhasil mengambil order jemput! Silakan menuju lokasi customer.",
    });
  } catch (error) {
    console.error("❌ takePickupJob Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 5D. Driver Konfirmasi Pakaian Kotor Sudah Diambil dari Customer (Status -> DRIVER_MENUJU_LAUNDRY)
exports.pickedUpByDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await LaundryOrder.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Pesanan tidak ditemukan" });
    }

    order.status = "DRIVER_MENUJU_LAUNDRY";
    await order.save();

    if (req.io) {
      req.io.emit("laundry_order_updated", order);
      req.io.emit(`laundry_customer_${order.customerId}`, {
        type: "PICKED_UP_BY_DRIVER",
        message: `Pakaian kotormu telah diambil oleh driver dan sedang dalam perjalanan menuju outlet laundry.`,
        order,
      });
      req.io.emit(`laundry_owner_${order.ownerId}`, {
        type: "PICKED_UP_BY_DRIVER",
        message: `Driver sedang mengantar pakaian kotor order ${order.orderCode} ke outletmu.`,
        order,
      });
    }

    return res.status(200).json({
      success: true,
      data: order,
      message: "Pakaian berhasil diambil! Silakan antar ke outlet laundry.",
    });
  } catch (error) {
    console.error("❌ pickedUpByDriver Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 5E. Driver Konfirmasi Pakaian Kotor Tiba di Outlet Laundry (Status -> TIBA_DI_LAUNDRY)
exports.arrivedAtLaundry = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await LaundryOrder.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Pesanan tidak ditemukan" });
    }

    order.status = "TIBA_DI_LAUNDRY";
    await order.save();

    if (req.io) {
      req.io.emit("laundry_order_updated", order);
      req.io.emit(`laundry_owner_${order.ownerId}`, {
        type: "LAUNDRY_ARRIVED_AT_STORE",
        message: `Pakaian order ${order.orderCode} telah tiba di outlet. Silakan timbang dan terbitkan tagihan!`,
        order,
      });
      req.io.emit(`laundry_customer_${order.customerId}`, {
        type: "LAUNDRY_ARRIVED_AT_STORE",
        message: `Pakaianmu telah sampai di outlet laundry. Menunggu proses penimbangan.`,
        order,
      });
    }

    return res.status(200).json({
      success: true,
      data: order,
      message: "Pakaian telah diserahkan ke outlet laundry! Trip penjemputan selesai.",
    });
  } catch (error) {
    console.error("❌ arrivedAtLaundry Error:", error);
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

// 7B. Ambil daftar pelanggan riil yang sudah pernah order ke Toko Laundry ini
exports.getStoreCustomers = async (req, res) => {
  try {
    const { ownerId } = req.params;
    let query = {};
    if (ownerId && ownerId !== "all") {
      query.ownerId = ownerId;
    }

    const orders = await LaundryOrder.find(query).sort({ createdAt: -1 });

    // Grouping by customerId / customerName
    const customerMap = {};
    for (const ord of orders) {
      const cId = ord.customerId || ord.customerName;
      if (!customerMap[cId]) {
        customerMap[cId] = {
          id: cId,
          customerId: ord.customerId,
          name: ord.customerName,
          phone: ord.customerPhone || "0812-3456-7890",
          address: ord.pickupAddress || ord.deliveryAddress || "Jl. Kamojang, Garut",
          totalOrders: 0,
          totalSpent: 0,
          lastOrderCode: ord.orderCode,
          lastOrderService: ord.serviceName,
          lastOrderStatus: ord.status,
          lastOrderDate: ord.createdAt,
          orders: [],
        };
      }
      customerMap[cId].totalOrders += 1;
      customerMap[cId].totalSpent += ord.totalAmount || 0;
      customerMap[cId].orders.push({
        orderCode: ord.orderCode,
        serviceName: ord.serviceName,
        totalAmount: ord.totalAmount,
        status: ord.status,
        date: ord.createdAt,
      });
    }

    const customers = Object.values(customerMap);
    return res.status(200).json({
      success: true,
      count: customers.length,
      data: customers,
    });
  } catch (error) {
    console.error("❌ getStoreCustomers Error:", error);
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

    // Synchronize current store bank / QRIS info in case owner updated it
    if (order.ownerId) {
      const storeObj = await LaundryStore.findOne({ ownerId: order.ownerId });
      if (storeObj) {
        if (storeObj.bankName) order.bankName = storeObj.bankName;
        if (storeObj.bankAccountNumber) order.bankAccountNumber = storeObj.bankAccountNumber;
        if (storeObj.bankAccountHolder) order.bankAccountHolder = storeObj.bankAccountHolder;
        if (storeObj.qrisImageUrl) order.qrisImageUrl = storeObj.qrisImageUrl;
      }
    }

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
    await syncConversationForOrder(order, "laundry");
    for (const assignedDriverId of [order.driverPickupId, order.driverDeliveryId].filter(Boolean)) {
      if (mongoose.Types.ObjectId.isValid(String(assignedDriverId))) {
        await Notification.create({
          userId: assignedDriverId,
          title: "Order laundry ditugaskan",
          message: `Pesanan ${order.orderCode} membutuhkan proses driver.`,
          type: "order_status",
          relatedId: order._id,
        });
      }
    }

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

// 12. Pemilik Laundry Selesai Cuci & Siapkan Pengantaran Balik (Status -> SIAP_DIANTAR)
exports.markReadyForDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await LaundryOrder.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Pesanan laundry tidak ditemukan" });
    }

    if (order.paymentStatus !== "lunas") {
      return res.status(400).json({
        success: false,
        message: "Pakaian tidak dapat disiapkan untuk antar balik karena customer belum melunasi pembayaran!",
      });
    }

    order.status = "SIAP_DIANTAR";
    await order.save();

    // Broadcast ke Driver & Customer
    if (req.io) {
      req.io.emit("laundry_order_updated", order);
      req.io.emit("broadcast_driver_delivery", {
        type: "NEW_DELIVERY_JOB",
        message: `Order Antar Laundry Bersih (${order.orderCode}) siap diantar ke ${order.customerName}!`,
        order,
      });
      req.io.emit(`laundry_customer_${order.customerId}`, {
        type: "LAUNDRY_READY_FOR_DELIVERY",
        message: `Cucianmu telah selesai dicuci & dipacking rapi! Sedang mencari driver untuk pengantaran ke rumah.`,
        order,
      });
    }

    return res.status(200).json({
      success: true,
      data: order,
      message: "Cucian siap diantar! Notifikasi pengantaran telah disiarkan ke para driver.",
    });
  } catch (error) {
    console.error("❌ markReadyForDelivery Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 13. Driver Mengambil Job Pengantaran Balik (Sistem Cepat-cepatan)
exports.takeDeliveryJob = async (req, res) => {
  try {
    const { id } = req.params;
    const { driverId, driverName, driverPhone } = req.body;

    const order = await LaundryOrder.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Pesanan tidak ditemukan" });
    }

    if (order.status !== "SIAP_DIANTAR") {
      return res.status(400).json({
        success: false,
        message: "Maaf, order pengantaran ini sudah diambil oleh driver lain!",
      });
    }

    order.driverDeliveryId = driverId;
    order.driverDeliveryName = driverName || "Driver GEOVERSE";
    order.driverDeliveryPhone = driverPhone || "0812-3456-7890";
    order.status = "DRIVER_MENGANTAR_BALIK";
    await order.save();

    if (req.io) {
      req.io.emit("laundry_order_updated", order);
      req.io.emit(`laundry_customer_${order.customerId}`, {
        type: "DRIVER_DELIVERING_CLEAN",
        message: `Driver ${order.driverDeliveryName} sedang mengantar pakaian bersihmu ke alamat tujuan!`,
        order,
      });
      req.io.emit(`laundry_owner_${order.ownerId}`, {
        type: "DRIVER_DELIVERING_CLEAN",
        message: `Driver ${order.driverDeliveryName} telah mengambil cucian bersih order ${order.orderCode} untuk diantar ke customer.`,
        order,
      });
    }

    return res.status(200).json({
      success: true,
      data: order,
      message: "Berhasil mengambil order pengantaran! Silakan ambil cucian di outlet dan antar ke customer.",
    });
  } catch (error) {
    console.error("❌ takeDeliveryJob Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 14. Konfirmasi Pengantaran Selesai
exports.completeDelivery = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await LaundryOrder.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Pesanan tidak ditemukan" });
    }

    order.status = "SELESAI";
    await order.save();

    if (req.io) {
      req.io.emit("laundry_order_updated", order);
      req.io.emit(`laundry_customer_${order.customerId}`, {
        type: "ORDER_COMPLETED",
        message: `Pesanan laundry ${order.orderCode} telah selesai. Terima kasih telah menggunakan layanan GEOVERSE!`,
        order,
      });
      req.io.emit(`laundry_owner_${order.ownerId}`, {
        type: "ORDER_COMPLETED",
        message: `Pesanan ${order.orderCode} telah sukses diantar dan selesai!`,
        order,
      });
    }

    return res.status(200).json({
      success: true,
      data: order,
      message: "Pesanan laundry telah berhasil diselesaikan!",
    });
  } catch (error) {
    console.error("❌ completeDelivery Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// 15. Update Lokasi Live Driver untuk Tracking Peta
exports.updateDriverLocation = async (req, res) => {
  try {
    const { id } = req.params;
    const { coords, lat, lng } = req.body;

    const order = await LaundryOrder.findById(id);
    if (!order) {
      return res.status(404).json({ success: false, message: "Pesanan tidak ditemukan" });
    }

    if (coords) order.driverLiveCoords = coords;
    if (typeof lat === "number") order.driverLiveLat = lat;
    if (typeof lng === "number") order.driverLiveLng = lng;
    await order.save();

    if (req.io) {
      req.io.emit("laundry_driver_location", {
        orderId: order._id,
        orderCode: order.orderCode,
        coords: order.driverLiveCoords,
        lat: order.driverLiveLat,
        lng: order.driverLiveLng,
        status: order.status,
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        coords: order.driverLiveCoords,
        lat: order.driverLiveLat,
        lng: order.driverLiveLng,
      },
    });
  } catch (error) {
    console.error("❌ updateDriverLocation Error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

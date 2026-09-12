const { createHash, randomUUID } = require("crypto");
const mongoose = require("mongoose");
const CateringProduct = require("../models/CateringProduct");
const CateringOrder = require("../models/CateringOrder");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { syncConversationForOrder } = require("../services/conversationService");

const cateringMonths = new Map([
  ["januari", 1], ["februari", 2], ["maret", 3], ["april", 4],
  ["mei", 5], ["juni", 6], ["juli", 7], ["agustus", 8],
  ["september", 9], ["oktober", 10], ["november", 11], ["desember", 12],
]);
const validCateringTimes = new Set(["11:00", "14:00", "18:00"]);

const isValidCateringSchedule = (dateText, timeText) => {
  const match = String(dateText || "").match(/^\s*(?:[A-Za-z]+,\s*)?(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})\s*$/);
  if (!match || !validCateringTimes.has(String(timeText || ""))) return false;
  const day = Number(match[1]);
  const month = cateringMonths.get(match[2].toLowerCase());
  const year = Number(match[3]);
  if (!month || day < 1 || day > 31) return false;
  const requestedDate = Date.UTC(year, month - 1, day);
  const parsedDate = new Date(requestedDate);
  if (parsedDate.getUTCFullYear() !== year || parsedDate.getUTCMonth() !== month - 1 || parsedDate.getUTCDate() !== day) return false;

  // The customer-facing form shows Jakarta-local dates and requires at least two days' notice.
  const jakartaNow = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const today = Date.UTC(jakartaNow.getUTCFullYear(), jakartaNow.getUTCMonth(), jakartaNow.getUTCDate());
  return requestedDate >= today + 2 * 24 * 60 * 60 * 1000;
};

const makeRequestHash = (body) => createHash("sha256").update(JSON.stringify({
  customerId: String(body.customerId || ""),
  ownerId: String(body.ownerId || ""),
  productId: String(body.productId || ""),
  portions: Number(body.portions),
  address: String(body.address || "").trim(),
  cateringDate: String(body.cateringDate || ""),
  cateringTime: String(body.cateringTime || ""),
  paymentOption: String(body.paymentOption || ""),
  notes: String(body.notes || "").trim().slice(0, 500),
})).digest("hex");

const replayExistingOrder = async (res, key, requestHash) => {
  const existing = await CateringOrder.findOne({ idempotencyKey: key });
  if (!existing) return false;
  if (existing.requestHash !== requestHash) {
    res.status(409).json({ success: false, message: "Checkout ini sudah dikirim dengan detail berbeda. Periksa pesanan sebelum mencoba lagi." });
    return true;
  }
  res.status(200).json({ success: true, data: existing, idempotentReplay: true });
  return true;
};

const createCateringOrder = async (req, res) => {
  let session;
  const body = req.body || {};
  const idempotencyKey = String(req.get("Idempotency-Key") || "").trim();
  const requestHash = makeRequestHash(body);

  try {
    const {
      customerId, ownerId, productId, portions, address, addressSnapshot,
      paymentOption, cateringDate, cateringTime, notes,
    } = body;
    const portionCount = Number(portions);
    const allowedPaymentOptions = new Set(["dp30", "dp50", "lunas"]);

    if (!idempotencyKey || idempotencyKey.length > 200) {
      return res.status(400).json({ success: false, message: "Kunci checkout tidak valid. Coba kirim pesanan lagi." });
    }
    if (!mongoose.Types.ObjectId.isValid(customerId) || !mongoose.Types.ObjectId.isValid(ownerId) || !mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({ success: false, message: "Pelanggan, mitra, dan menu harus berasal dari data yang valid." });
    }
    if (!Number.isInteger(portionCount) || portionCount < 10 || !address?.trim() || !cateringDate?.trim() || !cateringTime?.trim() || !allowedPaymentOptions.has(paymentOption)) {
      return res.status(400).json({ success: false, message: "Periksa jumlah porsi, alamat, jadwal, dan skema pembayaran." });
    }
    if (!isValidCateringSchedule(cateringDate, cateringTime)) {
      return res.status(400).json({ success: false, message: "Pilih jadwal Catering minimal dua hari dari sekarang dan gunakan salah satu jam yang tersedia." });
    }
    if (await replayExistingOrder(res, idempotencyKey, requestHash)) return;

    const [customer, owner] = await Promise.all([
      User.findById(customerId).select("name phone role"),
      User.findById(ownerId).select("name phone address role status roleData"),
    ]);
    if (!customer || customer.role !== "customer") {
      return res.status(400).json({ success: false, message: "Akun pelanggan tidak valid. Masuk kembali lalu coba lagi." });
    }
    if (!owner || owner.role !== "pemilik_catering" || owner.status === "rejected") {
      return res.status(409).json({ success: false, message: "Mitra Catering tidak tersedia." });
    }
    if (owner.roleData?.isDapurOpen !== "true") {
      return res.status(409).json({ success: false, message: "Dapur Catering sedang tutup." });
    }

    const product = await CateringProduct.findOne({ _id: productId, ownerId, isActive: true }).lean();
    if (!product) return res.status(409).json({ success: false, message: "Menu sudah tidak tersedia. Perbarui pilihan menu." });
    if (product.stock < portionCount) return res.status(409).json({ success: false, message: `Stok menu tidak mencukupi. Sisa ${product.stock} porsi.` });

    // These fees match current MVP UI values; Product Decision Required before launch.
    const deliveryFee = 15000;
    const serviceFee = 5000;
    const subtotal = product.price * portionCount;
    const totalAmount = subtotal + deliveryFee + serviceFee;
    // No payment provider/confirmation is wired. Never record the selected DP as money received.
    const paidAmount = 0;
    const remainingAmount = totalAmount;
    const storeName = owner.roleData?.businessName || owner.name || "Mitra Catering";
    const storeAddress = owner.roleData?.businessAddress || owner.roleData?.address || owner.address || "";
    let order;

    session = await mongoose.startSession();
    await session.withTransaction(async () => {
      const stockUpdate = await CateringProduct.updateOne(
        { _id: productId, ownerId, isActive: true, stock: { $gte: portionCount } },
        { $inc: { stock: -portionCount } },
        { session }
      );
      if (stockUpdate.modifiedCount !== 1) {
        const error = new Error("Stok menu berubah saat checkout. Perbarui menu lalu coba lagi.");
        error.statusCode = 409;
        throw error;
      }

      const [created] = await CateringOrder.create([{
        orderCode: `RNG-CAT-${randomUUID().slice(0, 8).toUpperCase()}`,
        idempotencyKey,
        requestHash,
        customerId: String(customerId),
        ownerId: String(ownerId),
        customerName: customer.name,
        customerPhone: customer.phone || "",
        address: address.trim(),
        addressSnapshot: addressSnapshot || null,
        storeId: String(ownerId),
        storeName,
        storeAddress,
        productId: String(productId),
        menuName: product.name,
        portions: portionCount,
        price: product.price,
        totalAmount,
        deliveryFee,
        serviceFee,
        paymentOption,
        paymentMethod: "Belum ditentukan",
        paymentStatus: "Menunggu konfirmasi pembayaran",
        paidAmount,
        remainingAmount,
        cateringDate: cateringDate.trim(),
        cateringTime: cateringTime.trim(),
        status: "Menunggu",
        notes: String(notes || "").trim().slice(0, 500),
      }], { session });
      order = created;
    });
    await session.endSession();
    session = null;

    await Promise.allSettled([
      syncConversationForOrder(order, "catering"),
      Notification.create({
        userId: customerId,
        title: "Pesanan Catering dibuat",
        message: `Pesanan ${order.orderCode} menunggu konfirmasi pembayaran. Belum ada pembayaran yang tercatat.`,
        type: "order_new",
        relatedId: order._id,
      }),
      Notification.create({
        userId: ownerId,
        title: "Pesanan Catering baru",
        message: `${customer.name} mengirim permintaan pesanan ${order.orderCode}.`,
        type: "order_new",
        relatedId: order._id,
      }),
    ]);
    req.io?.to(`owner:${ownerId}`).emit("order_created", order);
    req.io?.to(`customer:${customerId}`).emit("order_created", order);
    return res.status(201).json({ success: true, data: order });
  } catch (error) {
    console.error("Create catering order error:", error);
    if (session) await session.endSession().catch(() => undefined);
    if (error.code === 11000 && idempotencyKey) {
      if (await replayExistingOrder(res, idempotencyKey, requestHash)) return;
    }
    return res.status(error.statusCode || 500).json({ success: false, message: error.message || "Gagal membuat pesanan Catering" });
  }
};

module.exports = { createCateringOrder };

const User = require("../models/User");
const WasteDeposit = require("../models/WasteDeposit");
const WasteBank = require("../models/WasteBank");
const WasteCategoryPrice = require("../models/WasteCategoryPrice");
const Notification = require("../models/Notification");
const { computeEnvironmentalImpact, calculateCategoryPointAndRupiah } = require("../services/recycleFareService");
const { creditPoints } = require("../services/pointWalletService");

/**
 * Helper to emit real-time socket updates
 */
const emitToDepositRoom = (io, depositId, event, payload) => {
  if (io && depositId) {
    io.to(`deposit:${String(depositId)}`).emit(event, payload);
  }
};

/**
 * 1. Customer: Create Waste Deposit Request
 * POST /api/waste/deposits
 */
const createDeposit = async (req, res) => {
  try {
    let customerId = req.authUser?._id || req.user?._id || req.body.customerId;
    if (!customerId) {
      const fallbackCustomer = await User.findOne({ role: "customer" }).lean();
      customerId = fallbackCustomer?._id;
    }
    if (!customerId) {
      return res.status(401).json({ success: false, message: "Silakan login terlebih dahulu untuk membuat tiket setor sampah." });
    }
    const {
      bankSampahId,
      method = "DROP_OFF",
      pickupAddress,
      pickupLatitude,
      pickupLongitude,
      pickupSchedule,
      pickupNotes,
      categories = [],
      customerPhotos = [],
      idempotencyKey,
    } = req.body;

    if (!bankSampahId) {
      return res.status(400).json({ success: false, message: "Bank Sampah wajib dipilih." });
    }

    if (method === "PICKUP" && (!pickupAddress || pickupLatitude == null || pickupLongitude == null)) {
      return res.status(400).json({ success: false, message: "Alamat dan titik lokasi penjemputan wajib diisi." });
    }

    // Idempotency check
    if (idempotencyKey) {
      const existing = await WasteDeposit.findOne({ idempotencyKey }).lean();
      if (existing) {
        return res.status(200).json({
          success: true,
          message: "Permintaan setor sampah sudah dibuat sebelumnya.",
          data: existing,
        });
      }
    }

    const bank = await WasteBank.findById(bankSampahId).lean();
    if (!bank) {
      return res.status(404).json({ success: false, message: "Bank Sampah tidak ditemukan." });
    }

    // Lookup active prices from this bank
    const bankPrices = await WasteCategoryPrice.find({
      bankSampahId,
      isActive: true,
    }).lean();

    const priceMap = {};
    for (const p of bankPrices) {
      priceMap[p.category] = p.pricePerKg;
    }

    // Prepare categories (if provided by customer, otherwise default pending weighing)
    let estimatedTotalWeightKg = 0;
    let estimatedTotalRupiah = 0;
    let formattedCategories = [];

    if (Array.isArray(categories) && categories.length > 0) {
      formattedCategories = categories.map((cat) => {
        const weight = Math.max(0, Number(cat.estimatedWeightKg) || 0);
        const pricePerKg = Number(priceMap[cat.category]) || 1000;
        const { totalRupiah, totalPoint } = calculateCategoryPointAndRupiah(weight, pricePerKg);

        estimatedTotalWeightKg += weight;
        estimatedTotalRupiah += totalRupiah;

        return {
          category: cat.category,
          subCategory: cat.subCategory || "Standard",
          estimatedWeightKg: weight,
          pricePerKg,
          totalRupiah,
          totalPoint,
        };
      });
    } else {
      formattedCategories = [
        {
          category: "Lainnya",
          subCategory: "Sampah Campur Daur Ulang",
          estimatedWeightKg: 0,
          pricePerKg: 0,
          totalRupiah: 0,
          totalPoint: 0,
        },
      ];
    }

    const depositCode = `RNG-RCY-${Date.now().toString().slice(-8)}`;
    const environmentalImpact = computeEnvironmentalImpact(formattedCategories);

    const deposit = await WasteDeposit.create({
      depositCode,
      customerId,
      bankSampahId,
      method,
      pickupAddress: method === "PICKUP" ? pickupAddress : bank.address,
      pickupLatitude: method === "PICKUP" ? Number(pickupLatitude) : bank.latitude,
      pickupLongitude: method === "PICKUP" ? Number(pickupLongitude) : bank.longitude,
      pickupSchedule: pickupSchedule ? new Date(pickupSchedule) : null,
      pickupNotes: pickupNotes || "",
      categories: formattedCategories,
      estimatedTotalWeightKg: Math.round(estimatedTotalWeightKg * 10) / 10,
      estimatedPoint: estimatedTotalRupiah, // 1 Point = Rp 1
      estimatedRupiah: estimatedTotalRupiah,
      customerPhotos: Array.isArray(customerPhotos) ? customerPhotos : [],
      status: "REQUESTED",
      statusHistory: [
        {
          status: "REQUESTED",
          actorId: customerId,
          actorRole: "customer",
          note: `Permintaan setor ${method === "PICKUP" ? "Pickup" : "Antar Langsung"} dibuat oleh customer.`,
          createdAt: new Date(),
        },
      ],
      environmentalImpact,
      idempotencyKey: idempotencyKey || undefined,
    });

    // Notify Bank Sampah
    await Notification.create({
      userId: bank.ownerId,
      title: "Setoran Sampah Baru!",
      message: `Ada permintaan setor sampah (${method}) #${depositCode} estimasi ${deposit.estimatedTotalWeightKg} kg.`,
      type: "order_status",
      relatedId: deposit._id,
    }).catch(() => {});

    if (req.io) {
      req.io.emit("recycle:new_deposit", deposit);
    }

    return res.status(201).json({
      success: true,
      message: "Permintaan setor sampah berhasil dikirim! Menunggu konfirmasi Bank Sampah.",
      data: deposit,
    });
  } catch (error) {
    console.error("createDeposit error:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal membuat permintaan setor sampah.",
      error: error.message,
    });
  }
};

/**
 * 2. Get Customer's Own Deposits
 * GET /api/waste/deposits/customer/:customerId
 */
const getCustomerDeposits = async (req, res) => {
  try {
    const customerId = req.params.customerId;
    if (req.authUser && String(req.authUser._id) !== String(customerId) && req.authUser.role !== "admin") {
      return res.status(403).json({ success: false, message: "Akses ditolak." });
    }

    const deposits = await WasteDeposit.find({ customerId })
      .populate("bankSampahId", "name phone address photoUrl rating")
      .populate("driverId", "name phone profilePhoto")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: deposits,
    });
  } catch (error) {
    console.error("getCustomerDeposits error:", error);
    return res.status(500).json({ success: false, message: "Gagal memuat riwayat setor sampah." });
  }
};

/**
 * 3. Get Deposit Detail by ID
 * GET /api/waste/deposits/:id
 */
const getDepositById = async (req, res) => {
  try {
    const rawId = req.params.id;
    const isObjectId = mongoose.Types.ObjectId.isValid(rawId);
    const filter = isObjectId ? { _id: rawId } : { depositCode: rawId };

    const deposit = await WasteDeposit.findOne(filter)
      .populate("bankSampahId", "name phone address photoUrl rating openingHours")
      .populate("driverId", "name phone profilePhoto")
      .populate("weighedBy", "name phone")
      .lean();

    if (!deposit) {
      return res.status(404).json({ success: false, message: "Data setor sampah tidak ditemukan." });
    }

    return res.status(200).json({
      success: true,
      data: deposit,
    });
  } catch (error) {
    console.error("getDepositById error:", error);
    return res.status(500).json({ success: false, message: "Gagal memuat detail setoran sampah." });
  }
};

/**
 * 4. Bank Sampah: Get Queue Deposits
 * GET /api/waste/deposits/bank/:bankSampahId
 */
const getBankDeposits = async (req, res) => {
  try {
    const bankSampahId = req.params.bankSampahId;
    const { status } = req.query;

    const filter = { bankSampahId };
    if (status) {
      filter.status = status;
    }

    const deposits = await WasteDeposit.find(filter)
      .populate("customerId", "name phone address profilePhoto")
      .populate("driverId", "name phone profilePhoto")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: deposits,
    });
  } catch (error) {
    console.error("getBankDeposits error:", error);
    return res.status(500).json({ success: false, message: "Gagal memuat antrean Bank Sampah." });
  }
};

/**
 * 5. Bank Sampah: Accept Deposit Request
 * POST /api/waste/deposits/:id/accept
 */
const acceptDeposit = async (req, res) => {
  try {
    const deposit = await WasteDeposit.findById(req.params.id);
    if (!deposit) {
      return res.status(404).json({ success: false, message: "Setoran tidak ditemukan." });
    }

    const actorId = req.authUser?._id || req.user?._id || deposit.bankSampahId;
    const actorRole = req.authUser?.role || "bank_sampah";

    deposit.status = "ACCEPTED";
    deposit.statusHistory.push({
      status: "ACCEPTED",
      actorId,
      actorRole,
      note: "Permintaan setor diterima oleh Bank Sampah.",
      createdAt: new Date(),
    });
    await deposit.save();

    await Notification.create({
      userId: deposit.customerId,
      title: "Setoran Diterima!",
      message: `Permintaan setor sampah #${deposit.depositCode} telah diterima Bank Sampah.`,
      type: "order_status",
      relatedId: deposit._id,
    }).catch(() => {});

    emitToDepositRoom(req.io, deposit._id, "recycle:status_updated", deposit);

    return res.status(200).json({
      success: true,
      message: "Setoran berhasil diterima.",
      data: deposit,
    });
  } catch (error) {
    console.error("acceptDeposit error:", error);
    return res.status(500).json({ success: false, message: "Gagal menerima setoran." });
  }
};

/**
 * 6. Driver: Accept Pickup Task
 * POST /api/waste/deposits/:id/assign-driver
 */
const assignDriver = async (req, res) => {
  try {
    const driverId = req.authUser?._id || req.user?._id || req.body.driverId;
    const deposit = await WasteDeposit.findById(req.params.id);
    if (!deposit) {
      return res.status(404).json({ success: false, message: "Setoran tidak ditemukan." });
    }

    if (deposit.driverId && String(deposit.driverId) !== String(driverId)) {
      return res.status(400).json({ success: false, message: "Tugas penjemputan sudah diambil driver lain." });
    }

    deposit.driverId = driverId;
    deposit.status = "DRIVER_ASSIGNED";
    deposit.statusHistory.push({
      status: "DRIVER_ASSIGNED",
      actorId: driverId,
      actorRole: "driver",
      note: `Driver (${req.authUser?.name || "Driver"}) bersiap menjemput sampah.`,
      createdAt: new Date(),
    });
    await deposit.save();

    await Notification.create({
      userId: deposit.customerId,
      title: "Driver Menuju Lokasi!",
      message: `Driver ${req.authUser?.name || "Driver"} ditugaskan menjemput sampah Anda.`,
      type: "order_status",
      relatedId: deposit._id,
    }).catch(() => {});

    emitToDepositRoom(req.io, deposit._id, "recycle:status_updated", deposit);

    return res.status(200).json({
      success: true,
      message: "Tugas pickup berhasil diambil.",
      data: deposit,
    });
  } catch (error) {
    console.error("assignDriver error:", error);
    return res.status(500).json({ success: false, message: "Gagal mengambil tugas pickup." });
  }
};

/**
 * 7. Admin Sampah / Petugas: Input Actual Weighing & Proof
 * POST /api/waste/deposits/:id/weigh
 */
const weighDeposit = async (req, res) => {
  try {
    const deposit = await WasteDeposit.findById(req.params.id);
    if (!deposit) {
      return res.status(404).json({ success: false, message: "Setoran tidak ditemukan." });
    }

    const officerId = req.authUser?._id || req.user?._id || deposit.bankSampahId;
    const actorRole = req.authUser?.role || "bank_sampah";
    const rawCats = req.body.actualCategories || req.body.categories || [];
    const actualCategories = Array.isArray(rawCats) ? rawCats : [];
    const { weighingProofPhotos = [], weighingNotes = "" } = req.body;

    if (actualCategories.length === 0) {
      return res.status(400).json({ success: false, message: "Masukkan berat aktual penimbangan." });
    }

    // Lookup active prices from this bank
    const bankPrices = await WasteCategoryPrice.find({
      bankSampahId: deposit.bankSampahId,
      isActive: true,
    }).lean();

    const priceMap = {};
    const subCatMap = {};
    for (const p of bankPrices) {
      const key = `${p.category}:::${p.subCategory || "Standard"}`;
      priceMap[key] = p.pricePerKg;
      priceMap[p.category] = priceMap[p.category] || p.pricePerKg;
      subCatMap[p.category] = p.subCategory || "Standard";
    }

    let actualTotalWeightKg = 0;
    let finalTotalRupiah = 0;

    // Build verified categories from officer weighing inputs
    const updatedCategories = actualCategories
      .filter((ac) => (Number(ac.actualWeightKg) || 0) > 0)
      .map((ac) => {
        const actualWeight = Math.max(0, Number(ac.actualWeightKg) || 0);
        const specificSub = ac.subCategory || subCatMap[ac.category] || "Standard";
        const key = `${ac.category}:::${specificSub}`;
        const pricePerKg = Number(ac.pricePerKg) || Number(priceMap[key]) || Number(priceMap[ac.category]) || 1000;
        const { totalRupiah, totalPoint } = calculateCategoryPointAndRupiah(actualWeight, pricePerKg);

        actualTotalWeightKg += actualWeight;
        finalTotalRupiah += totalRupiah;

        return {
          category: ac.category,
          subCategory: specificSub,
          estimatedWeightKg: ac.estimatedWeightKg || actualWeight,
          actualWeightKg: actualWeight,
          pricePerKg,
          totalRupiah,
          totalPoint,
        };
      });

    if (updatedCategories.length === 0) {
      return res.status(400).json({ success: false, message: "Total berat aktual harus lebih dari 0 kg." });
    }

    deposit.categories = updatedCategories;
    deposit.actualTotalWeightKg = Math.round(actualTotalWeightKg * 10) / 10;
    deposit.finalRupiah = finalTotalRupiah;
    deposit.finalPoint = finalTotalRupiah; // 1 Point = Rp 1
    deposit.weighingProofPhotos = Array.isArray(weighingProofPhotos) ? weighingProofPhotos : [];
    deposit.weighingNotes = weighingNotes;
    deposit.weighedBy = officerId;
    deposit.status = "WAITING_CUSTOMER_CONFIRMATION";
    deposit.environmentalImpact = computeEnvironmentalImpact(updatedCategories);

    deposit.statusHistory.push({
      status: "WAITING_CUSTOMER_CONFIRMATION",
      actorId: officerId,
      actorRole,
      note: `Hasil timbang diinput: ${deposit.actualTotalWeightKg} kg = ${deposit.finalPoint} Pts. Menunggu konfirmasi customer.`,
      createdAt: new Date(),
    });

    await deposit.save();

    // Send notification to customer to review & confirm scale results
    await Notification.create({
      userId: deposit.customerId,
      title: "Hasil Timbang Siap Dikonfirmasi!",
      message: `Sampah Anda telah ditimbang: ${deposit.actualTotalWeightKg} kg (${deposit.finalPoint} Point). Ketuk untuk setujui.`,
      type: "order_status",
      relatedId: deposit._id,
    }).catch(() => {});

    emitToDepositRoom(req.io, deposit._id, "recycle:weighing_ready", deposit);

    return res.status(200).json({
      success: true,
      message: "Hasil timbangan berhasil disimpan! Menunggu konfirmasi customer.",
      data: deposit,
    });
  } catch (error) {
    console.error("weighDeposit error:", error);
    return res.status(500).json({ success: false, message: "Gagal menyimpan hasil timbangan." });
  }
};

/**
 * 8. Customer: Confirm Scale Result -> Issues Points Atomically
 * POST /api/waste/deposits/:id/confirm
 */
const confirmWeighing = async (req, res) => {
  try {
    const deposit = await WasteDeposit.findById(req.params.id);

    if (!deposit) {
      return res.status(404).json({ success: false, message: "Setoran tidak ditemukan." });
    }

    const customerId = req.authUser?._id || req.user?._id || deposit.customerId;

    if (req.authUser && String(deposit.customerId) !== String(req.authUser._id) && req.authUser.role !== "admin") {
      return res.status(403).json({ success: false, message: "Hanya pemilik pesanan yang dapat mengonfirmasi hasil timbang." });
    }

    if (deposit.status === "POINT_ISSUED" || deposit.status === "COMPLETED") {
      return res.status(200).json({
        success: true,
        message: "Poin untuk setoran ini sudah diterbitkan sebelumnya.",
        data: deposit,
      });
    }

    // Atomic credit to PointWallet & PointLedger
    const creditResult = await creditPoints({
      userId: customerId,
      points: deposit.finalPoint,
      sourceType: "WASTE_DEPOSIT",
      sourceId: String(deposit._id),
      notes: `Setor sampah #${deposit.depositCode} (${deposit.actualTotalWeightKg} kg)`,
      actorId: customerId,
      kgDeposited: deposit.actualTotalWeightKg,
      co2ReductionKg: deposit.environmentalImpact?.co2ReductionKg || 0,
    });

    deposit.customerConfirmedAt = new Date();
    deposit.status = "COMPLETED";
    deposit.statusHistory.push({
      status: "POINT_ISSUED",
      actorId: customerId,
      actorRole: "customer",
      note: `Customer menyetujui hasil timbang. ${deposit.finalPoint} GEOVERSE Point berhasil diterbitkan!`,
      createdAt: new Date(),
    });
    deposit.statusHistory.push({
      status: "COMPLETED",
      actorId: customerId,
      actorRole: "system",
      note: "Transaksi setoran sampah selesai secara penuh.",
      createdAt: new Date(),
    });

    await deposit.save();

    // Update WasteBank aggregates
    await WasteBank.findByIdAndUpdate(deposit.bankSampahId, {
      $inc: {
        totalWasteProcessedKg: deposit.actualTotalWeightKg,
        totalPointsIssued: deposit.finalPoint,
      },
    }).catch(() => {});

    // Notify Customer of Point Issuance
    await Notification.create({
      userId: customerId,
      title: "🎉 Poin Berhasil Diterima!",
      message: `Selamat! Anda menerima ${deposit.finalPoint.toLocaleString("id-ID")} GEOVERSE Point dari setor sampah.`,
      type: "points",
      relatedId: deposit._id,
    }).catch(() => {});

    emitToDepositRoom(req.io, deposit._id, "recycle:completed", deposit);

    return res.status(200).json({
      success: true,
      message: `Poin berhasil diterbitkan! Anda mendapatkan ${deposit.finalPoint.toLocaleString("id-ID")} GEOVERSE Point.`,
      data: deposit,
      wallet: creditResult.wallet,
    });
  } catch (error) {
    console.error("confirmWeighing error:", error);
    return res.status(500).json({ success: false, message: error.message || "Gagal mengonfirmasi hasil timbang." });
  }
};

/**
 * 9. Customer: File Complaint / Dispute regarding weighing
 * POST /api/waste/deposits/:id/complaint
 */
const disputeWeighing = async (req, res) => {
  try {
    const deposit = await WasteDeposit.findById(req.params.id);
    if (!deposit) {
      return res.status(404).json({ success: false, message: "Setoran tidak ditemukan." });
    }

    const customerId = req.authUser?._id || req.user?._id || deposit.customerId;

    if (req.authUser && String(deposit.customerId) !== String(req.authUser._id) && req.authUser.role !== "admin") {
      return res.status(403).json({ success: false, message: "Akses ditolak." });
    }

    const { reason } = req.body;

    deposit.status = "DISPUTED";
    deposit.disputeReason = reason || "Hasil timbang tidak sesuai kesepakatan.";
    deposit.statusHistory.push({
      status: "DISPUTED",
      actorId: customerId,
      actorRole: "customer",
      note: `Customer mengajukan komplain: ${deposit.disputeReason}`,
      createdAt: new Date(),
    });

    await deposit.save();

    emitToDepositRoom(req.io, deposit._id, "recycle:disputed", deposit);

    return res.status(200).json({
      success: true,
      message: "Komplain berhasil dikirim ke pengelola Bank Sampah.",
      data: deposit,
    });
  } catch (error) {
    console.error("disputeWeighing error:", error);
    return res.status(500).json({ success: false, message: "Gagal mengajukan komplain." });
  }
};

module.exports = {
  createDeposit,
  getCustomerDeposits,
  getDepositById,
  getBankDeposits,
  acceptDeposit,
  assignDriver,
  weighDeposit,
  confirmWeighing,
  disputeWeighing,
};

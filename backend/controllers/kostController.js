const Kost = require("../models/Kost");
const User = require("../models/User");
const Booking = require("../models/Booking");

// Get all Kosts (for customer search & filter)
const getAllKosts = async (req, res) => {
  try {
    const { search, type, city, minPrice, maxPrice, facilities } = req.query;
    const query = { isActive: true };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { address: { $regex: search, $options: "i" } },
        { district: { $regex: search, $options: "i" } },
      ];
    }

    if (type && type !== "Semua") {
      query.type = type;
    }

    if (city) {
      query.city = { $regex: city, $options: "i" };
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    if (facilities) {
      const facilityArray = Array.isArray(facilities) ? facilities : facilities.split(",");
      query.facilities = { $all: facilityArray };
    }

    const kosts = await Kost.find(query).populate("ownerId", "name email phone profilePhoto").sort({ createdAt: -1 });

    const formattedKosts = kosts.map((k) => {
      const kObj = k.toObject ? k.toObject({ virtuals: true }) : { ...k };
      const rooms = Array.isArray(kObj.rooms) ? kObj.rooms : [];
      const roomPrices = rooms
        .map((r) => Number(r.priceMonthly) || 0)
        .filter((p) => p > 0);
      if (roomPrices.length > 0) {
        kObj.price = Math.min(...roomPrices);
      }
      const roomImgs = rooms
        .flatMap((r) => (Array.isArray(r.images) ? r.images : []))
        .filter(Boolean);
      if (roomImgs.length > 0) {
        // Real room photos take precedence over default images
        kObj.images = Array.from(new Set([...roomImgs, ...(kObj.images || [])]));
      }
      return kObj;
    });

    return res.status(200).json({
      success: true,
      count: formattedKosts.length,
      data: formattedKosts,
    });
  } catch (error) {
    console.error("❌ Get all kosts error:", error);
    return res.status(500).json({ success: false, message: "Gagal mengambil data kost", error: error.message });
  }
};

// Get single Kost detail
const getKostById = async (req, res) => {
  try {
    const kost = await Kost.findById(req.params.id).populate("ownerId", "name email phone profilePhoto");
    if (!kost) {
      return res.status(404).json({ success: false, message: "Kost tidak ditemukan" });
    }

    const kObj = kost.toObject ? kost.toObject({ virtuals: true }) : { ...kost };
    const rooms = Array.isArray(kObj.rooms) ? kObj.rooms : [];
    const roomPrices = rooms
      .map((r) => Number(r.priceMonthly) || 0)
      .filter((p) => p > 0);
    if (roomPrices.length > 0) {
      kObj.price = Math.min(...roomPrices);
    }
    const roomImgs = rooms
      .flatMap((r) => (Array.isArray(r.images) ? r.images : []))
      .filter(Boolean);
    if (roomImgs.length > 0) {
      kObj.images = Array.from(new Set([...roomImgs, ...(kObj.images || [])]));
    }

    return res.status(200).json({ success: true, data: kObj });
  } catch (error) {
    console.error("❌ Get kost detail error:", error);
    return res.status(500).json({ success: false, message: "Gagal mengambil detail kost", error: error.message });
  }
};

// Create new Kost (by Pemilik Kos)
const createKost = async (req, res) => {
  try {
    const {
      ownerId,
      name,
      type,
      address,
      city,
      district,
      latitude,
      longitude,
      description,
      price,
      facilities,
      rules,
      images,
      rooms,
      bankAccount,
      dpAmount,
    } = req.body;

    if (!ownerId || !name || !price || !address) {
      return res.status(400).json({
        success: false,
        message: "Owner ID, nama kost, alamat, dan harga wajib diisi",
      });
    }

    const newKost = await Kost.create({
      ownerId,
      name: name.trim(),
      type: type || "Campur",
      address: address.trim(),
      city: city || "Yogyakarta",
      district: district || "",
      latitude,
      longitude,
      description: description || "",
      price: Number(price),
      facilities: facilities || [],
      rules: rules || [],
      images: images || [],
      rooms: rooms || [],
      bankAccount: bankAccount || {},
      dpAmount: dpAmount ? Number(dpAmount) : 200000,
    });

    return res.status(201).json({
      success: true,
      message: "Kost berhasil ditambahkan",
      data: newKost,
    });
  } catch (error) {
    console.error("❌ Create kost error:", error);
    return res.status(500).json({ success: false, message: "Gagal membuat data kost", error: error.message });
  }
};

// Update Kost info
const updateKost = async (req, res) => {
  try {
    const kost = await Kost.findById(req.params.id);
    if (!kost) {
      return res.status(404).json({ success: false, message: "Kost tidak ditemukan" });
    }

    const updatedKost = await Kost.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    return res.status(200).json({
      success: true,
      message: "Data kost berhasil diperbarui",
      data: updatedKost,
    });
  } catch (error) {
    console.error("❌ Update kost error:", error);
    return res.status(500).json({ success: false, message: "Gagal memperbarui kost", error: error.message });
  }
};

// Helper to find kost by ownerId or email
const findKostByOwnerOrEmail = async (ownerIdentifier) => {
  let kost = null;
  // If valid ObjectId
  if (ownerIdentifier && ownerIdentifier.match(/^[0-9a-fA-F]{24}$/)) {
    kost = await Kost.findOne({ ownerId: ownerIdentifier });
  }
  // If not found or identifier is email
  if (!kost) {
    const user = await User.findOne({
      $or: [
        { email: ownerIdentifier },
        { email: "aisk@gmail.com" },
        { name: new RegExp(ownerIdentifier || "ais", "i") },
      ],
    });
    if (user) {
      kost = await Kost.findOne({ ownerId: user._id });
    }
  }
  // Fallback to Ais Kost Exclusive
  if (!kost) {
    kost = await Kost.findOne({ name: /Ais Kost/i });
  }
  return kost;
};

// Get Kosts by Owner
const getKostsByOwner = async (req, res) => {
  try {
    const { ownerId } = req.params;
    let kosts = [];

    if (ownerId && ownerId.match(/^[0-9a-fA-F]{24}$/)) {
      kosts = await Kost.find({ ownerId }).sort({ createdAt: -1 });
    }

    if (!kosts || kosts.length === 0) {
      const kost = await findKostByOwnerOrEmail(ownerId);
      if (kost) kosts = [kost];
    }

    return res.status(200).json({
      success: true,
      count: kosts.length,
      data: kosts,
    });
  } catch (error) {
    console.error("❌ Get owner kosts error:", error);
    return res.status(500).json({ success: false, message: "Gagal mengambil data kost pemilik", error: error.message });
  }
};

// =================== ROOMS CONTROLLERS ===================

// Get all rooms of a Kost
const getRoomsByOwner = async (req, res) => {
  try {
    const { ownerId } = req.params;
    const kost = await findKostByOwnerOrEmail(ownerId);

    if (!kost) {
      return res.status(404).json({ success: false, message: "Data properti kost belum ada." });
    }

    const rooms = kost.rooms.map((r) => {
      const roomImgs = Array.isArray(r.images) && r.images.length > 0
        ? r.images
        : [(kost.images && kost.images[0]) || "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=600&q=80"];

      const rawNumber = String(r.roomNumber || "101").replace(/^(Kamar\s*)+/gi, "").trim() || "101";
      const rawFacs = Array.isArray(r.facilities) ? r.facilities : [];
      const uniqueFacs = Array.from(new Set(rawFacs));

      return {
        id: r._id.toString(),
        name: `Kamar ${rawNumber}`,
        type: r.roomType || "Non AC",
        status: !r.isAvailable ? "terisi" : "kosong",
        facilities: uniqueFacs,
        inclusions: [],
        tenant: r.currentTenant?.name
          ? {
              name: r.currentTenant.name,
              avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
              phone: r.currentTenant.phone,
              entryDate: r.currentTenant.entryDate,
            }
          : undefined,
        price: `Rp ${Number(r.priceMonthly).toLocaleString("id-ID")}`,
        image: roomImgs[0],
        images: roomImgs,
        description: "Kamar nyaman dan bersih, siap huni.",
        floor: r.floor || 1,
        isAvailable: r.isAvailable,
      };
    });

    return res.status(200).json({
      success: true,
      count: rooms.length,
      kostId: kost._id,
      kostName: kost.name,
      data: rooms,
    });
  } catch (error) {
    console.error("❌ getRoomsByOwner error:", error);
    return res.status(500).json({ success: false, message: "Gagal mengambil daftar kamar", error: error.message });
  }
};

// Add new room
const addRoom = async (req, res) => {
  try {
    const { ownerId } = req.params;
    const { roomNumber, roomType, priceMonthly, floor, facilities, isAvailable, image, images } = req.body;

    const kost = await findKostByOwnerOrEmail(ownerId);
    if (!kost) {
      return res.status(404).json({ success: false, message: "Kost tidak ditemukan" });
    }

    const roomImages = Array.isArray(images) && images.length > 0
      ? images
      : (image ? [image] : []);

    const newRoom = {
      roomNumber: roomNumber || `${kost.rooms.length + 1}`,
      roomType: roomType || "Tipe AC",
      priceMonthly: Number(priceMonthly) || kost.price,
      floor: Number(floor) || 1,
      facilities: facilities || ["AC", "WiFi", "KM Dalam"],
      isAvailable: isAvailable !== undefined ? isAvailable : true,
      images: roomImages,
    };

    kost.rooms.push(newRoom);

    // Synchronize parent Kost starting price, images, and facilities
    const allRoomPrices = kost.rooms.map((r) => Number(r.priceMonthly) || 0).filter((p) => p > 0);
    if (allRoomPrices.length > 0) {
      kost.price = Math.min(...allRoomPrices);
    }
    if (roomImages.length > 0) {
      kost.images = Array.from(new Set([...roomImages, ...(kost.images || [])]));
    }
    if (Array.isArray(facilities) && facilities.length > 0) {
      kost.facilities = Array.from(new Set([...facilities, ...(kost.facilities || [])]));
    }

    kost.markModified("rooms");
    await kost.save();

    return res.status(201).json({
      success: true,
      message: `Kamar ${newRoom.roomNumber} berhasil ditambahkan ke MongoDB!`,
      data: kost.rooms[kost.rooms.length - 1],
    });
  } catch (error) {
    console.error("❌ addRoom error:", error);
    return res.status(500).json({ success: false, message: "Gagal menambahkan kamar", error: error.message });
  }
};

// Update room
const updateRoom = async (req, res) => {
  try {
    const { ownerId, roomId } = req.params;
    const updateData = req.body;

    const kost = await findKostByOwnerOrEmail(ownerId);
    if (!kost) return res.status(404).json({ success: false, message: "Kost tidak ditemukan" });

    let room = null;
    if (roomId && roomId.match(/^[0-9a-fA-F]{24}$/)) {
      room = kost.rooms.id(roomId);
    }
    if (!room && roomId) {
      const cleanId = roomId.replace(/^(Kamar\s*)+/gi, "").trim();
      room = kost.rooms.find((r) => r.roomNumber === cleanId || r.roomNumber === roomId || r._id.toString() === roomId);
    }
    if (!room && updateData.roomNumber) {
      const cleanNum = updateData.roomNumber.replace(/^(Kamar\s*)+/gi, "").trim();
      room = kost.rooms.find((r) => r.roomNumber === cleanNum || r.roomNumber === updateData.roomNumber);
    }
    if (!room) return res.status(404).json({ success: false, message: "Kamar tidak ditemukan" });

    if (updateData.roomNumber) room.roomNumber = updateData.roomNumber.replace(/^(Kamar\s*)+/gi, "").trim();
    if (updateData.roomType) room.roomType = updateData.roomType;
    if (updateData.priceMonthly) room.priceMonthly = Number(updateData.priceMonthly);
    if (updateData.isAvailable !== undefined) room.isAvailable = updateData.isAvailable;
    if (updateData.facilities) room.facilities = Array.from(new Set(updateData.facilities));
    if (updateData.currentTenant !== undefined) room.currentTenant = updateData.currentTenant;
    if (Array.isArray(updateData.images)) {
      room.images = updateData.images;
      if (updateData.images.length > 0) {
        kost.images = Array.from(new Set([...updateData.images, ...(kost.images || [])]));
      }
    } else if (updateData.image) {
      room.images = [updateData.image];
    }

    // Synchronize lowest price
    const allRoomPrices = kost.rooms.map((r) => Number(r.priceMonthly) || 0).filter((p) => p > 0);
    if (allRoomPrices.length > 0) {
      kost.price = Math.min(...allRoomPrices);
    }

    kost.markModified("rooms");
    await kost.save();

    return res.status(200).json({
      success: true,
      message: "Data kamar berhasil diperbarui di MongoDB",
      data: room,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Delete room
const deleteRoom = async (req, res) => {
  try {
    const { ownerId, roomId } = req.params;
    const kost = await findKostByOwnerOrEmail(ownerId);
    if (!kost) return res.status(404).json({ success: false, message: "Kost tidak ditemukan" });

    let roomIndex = -1;
    if (roomId && roomId.match(/^[0-9a-fA-F]{24}$/)) {
      roomIndex = kost.rooms.findIndex((r) => r._id.toString() === roomId);
    }
    if (roomIndex === -1 && roomId) {
      const cleanNum = roomId.replace(/^(Kamar\s*)+/gi, "").trim();
      roomIndex = kost.rooms.findIndex((r) => r.roomNumber === cleanNum || r.roomNumber === roomId);
    }

    if (roomIndex === -1) {
      return res.status(404).json({ success: false, message: "Kamar tidak ditemukan" });
    }

    kost.rooms.splice(roomIndex, 1);

    const allRoomPrices = kost.rooms.map((r) => Number(r.priceMonthly) || 0).filter((p) => p > 0);
    if (allRoomPrices.length > 0) {
      kost.price = Math.min(...allRoomPrices);
    }

    kost.markModified("rooms");
    await kost.save();

    return res.status(200).json({
      success: true,
      message: "Kamar berhasil dihapus dari database",
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// =================== TENANTS CONTROLLERS ===================

// Get all tenants
const getTenantsByOwner = async (req, res) => {
  try {
    const { ownerId } = req.params;
    const kost = await findKostByOwnerOrEmail(ownerId);
    if (!kost) return res.status(404).json({ success: false, message: "Kost tidak ditemukan" });

    // Fetch related bookings to know exact DP and settlement status
    const bookings = await Booking.find({
      kostId: kost._id,
      status: { $in: ["dp_verified", "active", "completed", "dp_submitted"] },
    }).sort({ createdAt: -1 });

    // Extract all rooms with tenants
    const tenants = [];
    kost.rooms.forEach((r, idx) => {
      if (r.currentTenant && r.currentTenant.name) {
        const entryDate = r.currentTenant.entryDate ? new Date(r.currentTenant.entryDate) : new Date();
        const dueDate = r.currentTenant.dueDate ? new Date(r.currentTenant.dueDate) : new Date(new Date().setDate(new Date().getDate() + 20));
        const daysLeft = Math.max(0, Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24)));

        // Match booking by roomNumber or customer name
        const matchBooking = bookings.find(
          (b) => b.roomNumber === r.roomNumber || b.customerName?.toLowerCase() === r.currentTenant.name?.toLowerCase()
        );

        const monthlyPriceNum = Number(r.priceMonthly) || 700000;
        const totalAmountNum = matchBooking?.totalAmount || monthlyPriceNum;
        const dpAmountNum = matchBooking?.dpAmount || Math.round(monthlyPriceNum * 0.2);
        const isSettled = matchBooking ? matchBooking.settlementStatus === "settled" : false;
        const settledAmountNum = matchBooking?.settledAmount || (isSettled ? totalAmountNum - dpAmountNum : 0);
        const remainingAmountNum = isSettled ? 0 : Math.max(0, totalAmountNum - dpAmountNum);

        tenants.push({
          id: r._id.toString(),
          bookingId: matchBooking?._id ? matchBooking._id.toString() : undefined,
          bookingCode: matchBooking?.bookingCode,
          name: r.currentTenant.name,
          avatar: `https://images.unsplash.com/photo-${1535713875000 + idx * 100}?auto=format&fit=crop&w=150&q=80`,
          status: daysLeft <= 10 ? "akan_keluar" : "aktif",
          roomNumber: r.roomNumber,
          roomType: r.roomType || "Tipe AC",
          phone: r.currentTenant.phone || "081234567890",
          entryDate: entryDate.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }),
          daysLeft: daysLeft,
          priceMonth: Number(r.priceMonthly).toLocaleString("id-ID"),
          totalAmount: totalAmountNum,
          dpAmount: dpAmountNum,
          settledAmount: settledAmountNum,
          remainingAmount: remainingAmountNum,
          isSettled: isSettled,
          settlementMethod: matchBooking?.settlementPaymentMethod,
          settledAt: matchBooking?.settledAt,
          settlementNotes: matchBooking?.settlementNotes,
          settlementProofImage: matchBooking?.settlementProofImage,
          dpProofImage: matchBooking?.dpProofImage || matchBooking?.proofImage,
          dpPaidAt: matchBooking?.dpPaidAt || matchBooking?.createdAt,
          dpVerifiedAt: matchBooking?.verifiedAt || matchBooking?.updatedAt,
          customerEmail: matchBooking?.customerEmail,
          durationMonths: r.currentTenant.durationMonths || matchBooking?.durationMonths || 1,
          extensionTotal: r.currentTenant.extensionTotal || 0,
          extensionPaid: r.currentTenant.extensionPaid || 0,
          extensionRemaining: r.currentTenant.extensionRemaining || 0,
          extensionStatus: r.currentTenant.extensionStatus || "none",
        });
      }
    });

    return res.status(200).json({
      success: true,
      count: tenants.length,
      data: tenants,
    });
  } catch (error) {
    console.error("❌ getTenantsByOwner error:", error);
    return res.status(500).json({ success: false, message: "Gagal mengambil daftar penghuni", error: error.message });
  }
};

// Add new tenant to room
const addTenant = async (req, res) => {
  try {
    const { ownerId } = req.params;
    const { name, phone, roomNumber, entryDate, durationMonths } = req.body;

    const kost = await findKostByOwnerOrEmail(ownerId);
    if (!kost) return res.status(404).json({ success: false, message: "Kost tidak ditemukan" });

    // Find matching room by roomNumber or first available room
    let room = kost.rooms.find((r) => r.roomNumber === roomNumber);
    if (!room) {
      room = kost.rooms.find((r) => r.isAvailable);
    }

    if (!room) {
      return res.status(400).json({ success: false, message: "Kamar tidak ditemukan atau semua kamar sudah penuh." });
    }

    const startDate = entryDate ? new Date(entryDate) : new Date();
    const months = Number(durationMonths) || 1;
    const dueDate = new Date(startDate);
    dueDate.setMonth(dueDate.getMonth() + months);

    room.isAvailable = false;
    room.currentTenant = {
      name: name.trim(),
      phone: phone ? phone.trim() : "",
      entryDate: startDate,
      dueDate: dueDate,
      durationMonths: months,
      extensionTotal: 0,
      extensionPaid: 0,
      extensionRemaining: 0,
      extensionStatus: "none",
    };

    await kost.save();

    return res.status(201).json({
      success: true,
      message: `Penghuni ${name} berhasil didaftarkan ke Kamar ${room.roomNumber}!`,
      data: room.currentTenant,
    });
  } catch (error) {
    console.error("❌ addTenant error:", error);
    return res.status(500).json({ success: false, message: "Gagal menambahkan penghuni", error: error.message });
  }
};

// Update tenant details / extend duration / record partial payment
const updateTenant = async (req, res) => {
  try {
    const { ownerId, tenantId } = req.params;
    const {
      name,
      phone,
      roomNumber,
      roomType,
      entryDate,
      priceMonthly,
      durationMonths,
      extensionTotal,
      extensionPaid,
      extensionRemaining,
      extensionStatus,
    } = req.body;

    const kost = await findKostByOwnerOrEmail(ownerId);
    if (!kost) return res.status(404).json({ success: false, message: "Kost tidak ditemukan" });

    const room = kost.rooms.id(tenantId) || kost.rooms.find((r) => r.roomNumber === roomNumber);
    if (!room || !room.currentTenant) {
      return res.status(404).json({ success: false, message: "Data penghuni kamar tidak ditemukan" });
    }

    if (name) room.currentTenant.name = name.trim();
    if (phone !== undefined) room.currentTenant.phone = phone.trim();
    if (entryDate) {
      room.currentTenant.entryDate = new Date(entryDate);
    }
    if (durationMonths !== undefined) {
      const months = Number(durationMonths) || 1;
      room.currentTenant.durationMonths = months;
      const startDate = room.currentTenant.entryDate ? new Date(room.currentTenant.entryDate) : new Date();
      const dueDate = new Date(startDate);
      dueDate.setMonth(dueDate.getMonth() + months);
      room.currentTenant.dueDate = dueDate;
    }
    if (priceMonthly !== undefined) {
      const cleanPrice = Number(String(priceMonthly).replace(/[^0-9]/g, "")) || room.priceMonthly;
      room.priceMonthly = cleanPrice;
    }
    if (roomType !== undefined) {
      room.roomType = roomType;
    }
    if (extensionTotal !== undefined) {
      room.currentTenant.extensionTotal = Number(extensionTotal);
    }
    if (extensionPaid !== undefined) {
      room.currentTenant.extensionPaid = Number(extensionPaid);
    }
    if (extensionRemaining !== undefined) {
      room.currentTenant.extensionRemaining = Number(extensionRemaining);
    }
    if (extensionStatus !== undefined) {
      room.currentTenant.extensionStatus = extensionStatus;
    }

    // Also sync corresponding Booking if exists
    const matchBooking = await Booking.findOne({
      kostId: kost._id,
      roomNumber: room.roomNumber,
      status: { $in: ["dp_verified", "active", "completed", "dp_submitted"] },
    }).sort({ createdAt: -1 });

    if (matchBooking) {
      if (name) matchBooking.customerName = name.trim();
      if (phone) matchBooking.customerPhone = phone.trim();
      if (durationMonths !== undefined) {
        const months = Number(durationMonths) || 1;
        matchBooking.durationMonths = months;
        matchBooking.totalAmount = (Number(room.priceMonthly) || 700000) * months;
        if (room.currentTenant.dueDate) {
          matchBooking.dueDate = room.currentTenant.dueDate;
        }
      }
      await matchBooking.save();
    }

    await kost.save();

    return res.status(200).json({
      success: true,
      message: "Data penghuni & durasi sewa berhasil diperbarui!",
      data: room.currentTenant,
    });
  } catch (error) {
    console.error("❌ updateTenant error:", error);
    return res.status(500).json({ success: false, message: "Gagal memperbarui data penghuni", error: error.message });
  }
};

// Delete/checkout tenant
const deleteTenant = async (req, res) => {
  try {
    const { ownerId, tenantId } = req.params;
    const kost = await findKostByOwnerOrEmail(ownerId);
    if (!kost) return res.status(404).json({ success: false, message: "Kost tidak ditemukan" });

    const room = kost.rooms.id(tenantId);
    if (room) {
      room.isAvailable = true;
      room.currentTenant = undefined;
      await kost.save();
    }

    return res.status(200).json({
      success: true,
      message: "Penghuni berhasil dikeluarkan dan status kamar kembali tersedia.",
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

// Get Property details (facilities, rules, description) by Owner
const getKostProperty = async (req, res) => {
  try {
    const { ownerId } = req.params;
    const kost = await findKostByOwnerOrEmail(ownerId);
    if (!kost) return res.status(404).json({ success: false, message: "Kost tidak ditemukan" });
    return res.status(200).json({ success: true, data: kost });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Gagal mengambil properti kos", error: error.message });
  }
};

// Update Property details (shared facilities, rules, description, bankAccount) by Owner
const updateKostProperty = async (req, res) => {
  try {
    const { ownerId } = req.params;
    const kost = await findKostByOwnerOrEmail(ownerId);
    if (!kost) return res.status(404).json({ success: false, message: "Kost tidak ditemukan" });

    const { facilities, rules, description, name, type, address, city, district, bankAccount, dpAmount } = req.body;
    if (facilities !== undefined) {
      kost.facilities = Array.isArray(facilities) ? Array.from(new Set(facilities.filter(Boolean))) : facilities;
      kost.markModified("facilities");
    }
    if (rules !== undefined) {
      kost.rules = Array.isArray(rules) ? Array.from(new Set(rules.filter(Boolean))) : rules;
      kost.markModified("rules");
    }
    if (description !== undefined) kost.description = description;
    if (name !== undefined) kost.name = name;
    if (type !== undefined) kost.type = type;
    if (address !== undefined) kost.address = address;
    if (city !== undefined) kost.city = city;
    if (district !== undefined) kost.district = district;

    if (bankAccount !== undefined) {
      kost.bankAccount = {
        paymentType: bankAccount.paymentType === "qris" ? "qris" : "bank",
        bankName: bankAccount.bankName || (kost.bankAccount && kost.bankAccount.bankName) || "BCA",
        accountNumber: bankAccount.accountNumber !== undefined ? String(bankAccount.accountNumber).trim() : (kost.bankAccount?.accountNumber || ""),
        accountHolder: bankAccount.accountHolder !== undefined ? String(bankAccount.accountHolder).trim() : (kost.bankAccount?.accountHolder || ""),
        qrisImage: bankAccount.qrisImage !== undefined ? String(bankAccount.qrisImage).trim() : (kost.bankAccount?.qrisImage || ""),
      };
      kost.markModified("bankAccount");
    }

    if (dpAmount !== undefined) {
      kost.dpAmount = Number(dpAmount);
    }

    await kost.save();

    return res.status(200).json({
      success: true,
      message: "Data rekening pembayaran & properti kos berhasil diperbarui di database!",
      data: kost,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: "Gagal memperbarui properti kos", error: error.message });
  }
};

module.exports = {
  getAllKosts,
  getKostById,
  createKost,
  updateKost,
  getKostsByOwner,
  getKostProperty,
  updateKostProperty,
  getRoomsByOwner,
  addRoom,
  updateRoom,
  deleteRoom,
  getTenantsByOwner,
  addTenant,
  updateTenant,
  deleteTenant,
};

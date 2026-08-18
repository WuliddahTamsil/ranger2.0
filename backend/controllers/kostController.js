const Kost = require("../models/Kost");
const User = require("../models/User");

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

    return res.status(200).json({
      success: true,
      count: kosts.length,
      data: kosts,
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

    return res.status(200).json({ success: true, data: kost });
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
  // If not found or identifier is email or 'ais'
  if (!kost) {
    const user = await User.findOne({
      $or: [
        { email: ownerIdentifier },
        { email: "aisl@gmail.com" },
        { email: "aisk@gmail.com" },
        { name: new RegExp(ownerIdentifier, "i") },
      ],
    });
    if (user) {
      kost = await Kost.findOne({ ownerId: user._id });
    }
  }
  // Fallback to first kost if any
  if (!kost) {
    kost = await Kost.findOne({});
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

    const rooms = kost.rooms.map((r) => ({
      id: r._id.toString(),
      name: `Kamar ${r.roomNumber}`,
      type: r.roomType || "Tipe AC",
      status: !r.isAvailable ? "terisi" : "kosong",
      facilities: r.facilities && r.facilities.length > 0 ? r.facilities : ["WiFi", "AC", "KM Dalam"],
      inclusions: ["Termasuk Listrik & Air"],
      tenant: r.currentTenant?.name
        ? {
            name: r.currentTenant.name,
            avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80",
            phone: r.currentTenant.phone,
            entryDate: r.currentTenant.entryDate,
          }
        : undefined,
      price: `Rp ${Number(r.priceMonthly).toLocaleString("id-ID")}`,
      image: (r.images && r.images[0]) || (kost.images && kost.images[0]) || "https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=600&q=80",
      description: "Kamar nyaman dan bersih, siap huni.",
      floor: r.floor || 1,
    }));

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
    const { roomNumber, roomType, priceMonthly, floor, facilities, isAvailable, image } = req.body;

    const kost = await findKostByOwnerOrEmail(ownerId);
    if (!kost) {
      return res.status(404).json({ success: false, message: "Kost tidak ditemukan" });
    }

    const newRoom = {
      roomNumber: roomNumber || `${kost.rooms.length + 1}`,
      roomType: roomType || "Tipe AC",
      priceMonthly: Number(priceMonthly) || kost.price,
      floor: Number(floor) || 1,
      facilities: facilities || ["AC", "WiFi", "KM Dalam"],
      isAvailable: isAvailable !== undefined ? isAvailable : true,
      images: image ? [image] : [],
    };

    kost.rooms.push(newRoom);
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

    const room = kost.rooms.id(roomId);
    if (!room) return res.status(404).json({ success: false, message: "Kamar tidak ditemukan" });

    if (updateData.roomNumber) room.roomNumber = updateData.roomNumber;
    if (updateData.roomType) room.roomType = updateData.roomType;
    if (updateData.priceMonthly) room.priceMonthly = Number(updateData.priceMonthly);
    if (updateData.isAvailable !== undefined) room.isAvailable = updateData.isAvailable;
    if (updateData.facilities) room.facilities = updateData.facilities;
    if (updateData.currentTenant !== undefined) room.currentTenant = updateData.currentTenant;

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

    kost.rooms.pull({ _id: roomId });
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

    // Extract all rooms with tenants
    const tenants = [];
    kost.rooms.forEach((r, idx) => {
      if (r.currentTenant && r.currentTenant.name) {
        const entryDate = r.currentTenant.entryDate ? new Date(r.currentTenant.entryDate) : new Date();
        const dueDate = r.currentTenant.dueDate ? new Date(r.currentTenant.dueDate) : new Date(new Date().setDate(new Date().getDate() + 20));
        const daysLeft = Math.max(0, Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24)));

        tenants.push({
          id: r._id.toString(),
          name: r.currentTenant.name,
          avatar: `https://images.unsplash.com/photo-${1535713875000 + idx * 100}?auto=format&fit=crop&w=150&q=80`,
          status: daysLeft <= 10 ? "akan_keluar" : "aktif",
          roomNumber: r.roomNumber,
          roomType: r.roomType || "Tipe AC",
          phone: r.currentTenant.phone || "081234567890",
          entryDate: entryDate.toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }),
          daysLeft: daysLeft,
          priceMonth: Number(r.priceMonthly).toLocaleString("id-ID"),
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

module.exports = {
  getAllKosts,
  getKostById,
  createKost,
  updateKost,
  getKostsByOwner,
  getRoomsByOwner,
  addRoom,
  updateRoom,
  deleteRoom,
  getTenantsByOwner,
  addTenant,
  deleteTenant,
};

const Kost = require("../models/Kost");
const User = require("../models/User");
const Booking = require("../models/Booking");

const sanitizeRulesByCategory = (rules, categoryType) => {
  if (!Array.isArray(rules)) return [];
  if (categoryType === "wisata") {
    return rules.filter(
      (r) =>
        !r.toLowerCase().includes("kamar") &&
        !r.toLowerCase().includes("lawan jenis") &&
        !r.toLowerCase().includes("akses 24 jam") &&
        !r.toLowerCase().includes("jam malam") &&
        !r.toLowerCase().includes("check-in") &&
        !r.toLowerCase().includes("check-out")
    );
  }
  if (categoryType === "hotel") {
    return rules.filter(
      (r) =>
        !r.toLowerCase().includes("lawan jenis") &&
        !r.toLowerCase().includes("jam malam") &&
        !r.toLowerCase().includes("tiket") &&
        !r.toLowerCase().includes("wahana")
    );
  }
  if (categoryType === "kost") {
    return rules.filter(
      (r) =>
        !r.toLowerCase().includes("tiket") &&
        !r.toLowerCase().includes("wahana") &&
        !r.toLowerCase().includes("kunjungan") &&
        !r.toLowerCase().includes("jam buka: 08.00")
    );
  }
  return rules;
};

// Get all Kosts (for customer search & filter)
const getAllKosts = async (req, res) => {
  try {
    const { search, type, categoryType, city, minPrice, maxPrice, facilities } = req.query;
    const query = { isActive: true };

    if (categoryType && categoryType !== "all") {
      query.categoryType = categoryType;
    }

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
      } else if (Array.isArray(kObj.hotelRooms) && kObj.hotelRooms.length > 0) {
        const hotelPrices = kObj.hotelRooms.map((hr) => Number(hr.pricePerNight) || 0).filter((p) => p > 0);
        if (hotelPrices.length > 0) kObj.price = Math.min(...hotelPrices);
      } else if (Array.isArray(kObj.wisataTickets) && kObj.wisataTickets.length > 0) {
        const ticketPrices = kObj.wisataTickets.map((wt) => Number(wt.price) || 0).filter((p) => p > 0);
        if (ticketPrices.length > 0) kObj.price = Math.min(...ticketPrices);
      }
      const roomImgs = rooms
        .flatMap((r) => (Array.isArray(r.images) ? r.images : []))
        .filter(Boolean);
      if (roomImgs.length > 0) {
        // Real room photos take precedence over default images
        kObj.images = Array.from(new Set([...roomImgs, ...(kObj.images || [])]));
      }

      // Ensure Wisata and Hotel never show Kost gender 'Campur' or room facilities
      if (kObj.categoryType === "wisata") {
        if (!kObj.type || ["campur", "putri", "putra"].includes(String(kObj.type).toLowerCase())) {
          kObj.type = "Wisata Rekreasi";
        }
        const ticketFacs = Array.from(
          new Set(
            (Array.isArray(kObj.wisataTickets) ? kObj.wisataTickets : [])
              .flatMap((t) => t.includedFacilities || t.facilities || [])
          )
        ).filter(Boolean);
        if (ticketFacs.length > 0) {
          kObj.facilities = ticketFacs;
        } else if (Array.isArray(kObj.facilities)) {
          kObj.facilities = kObj.facilities.filter(
            (f) => !["Kasur", "KM Dalam", "Lemari", "Meja"].includes(f)
          );
        } else {
          kObj.facilities = [];
        }
      } else if (kObj.categoryType === "hotel") {
        if (!kObj.type || ["campur", "putri", "putra"].includes(String(kObj.type).toLowerCase())) {
          kObj.type = "Hotel & Villa";
        }
        const hotelFacs = Array.from(
          new Set(
            (Array.isArray(kObj.hotelRooms) ? kObj.hotelRooms : [])
              .flatMap((r) => r.facilities || [])
          )
        ).filter(Boolean);
        if (hotelFacs.length > 0) {
          kObj.facilities = hotelFacs;
        } else if (Array.isArray(kObj.facilities)) {
          kObj.facilities = kObj.facilities.filter(
            (f) => !["Kasur", "KM Dalam"].includes(f)
          );
        } else {
          kObj.facilities = [];
        }
      }

      kObj.rules = sanitizeRulesByCategory(kObj.rules, kObj.categoryType);

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

    // Ensure Wisata and Hotel never show Kost gender 'Campur' or room facilities
    if (kObj.categoryType === "wisata") {
      if (!kObj.type || ["campur", "putri", "putra"].includes(String(kObj.type).toLowerCase())) {
        kObj.type = "Wisata Rekreasi";
      }
      const ticketFacs = Array.from(
        new Set(
          (Array.isArray(kObj.wisataTickets) ? kObj.wisataTickets : [])
            .flatMap((t) => t.includedFacilities || t.facilities || [])
        )
      ).filter(Boolean);
      if (ticketFacs.length > 0) {
        kObj.facilities = ticketFacs;
      } else if (Array.isArray(kObj.facilities)) {
        kObj.facilities = kObj.facilities.filter(
          (f) => !["Kasur", "KM Dalam", "Lemari", "Meja"].includes(f)
        );
      } else {
        kObj.facilities = [];
      }
    } else if (kObj.categoryType === "hotel") {
      if (!kObj.type || ["campur", "putri", "putra"].includes(String(kObj.type).toLowerCase())) {
        kObj.type = "Hotel & Villa";
      }
      const hotelFacs = Array.from(
        new Set(
          (Array.isArray(kObj.hotelRooms) ? kObj.hotelRooms : [])
            .flatMap((r) => r.facilities || [])
        )
      ).filter(Boolean);
      if (hotelFacs.length > 0) {
        kObj.facilities = hotelFacs;
      } else if (Array.isArray(kObj.facilities)) {
        kObj.facilities = kObj.facilities.filter(
          (f) => !["Kasur", "KM Dalam"].includes(f)
        );
      } else {
        kObj.facilities = [];
      }
    }

    kObj.rules = sanitizeRulesByCategory(kObj.rules, kObj.categoryType);

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

// Helper to find kost by ownerId or email (with auto-creation for valid partners)
const findKostByOwnerOrEmail = async (ownerIdentifier) => {
  if (!ownerIdentifier) return null;
  let kost = null;
  let user = null;

  // If valid ObjectId
  if (String(ownerIdentifier).match(/^[0-9a-fA-F]{24}$/)) {
    kost = await Kost.findOne({ ownerId: ownerIdentifier });
    if (!kost) {
      user = await User.findById(ownerIdentifier);
    }
  }

  // If not found or identifier is email/username
  if (!kost) {
    const cleanEmail = String(ownerIdentifier).toLowerCase().trim();
    if (!user) {
      user = await User.findOne({ email: cleanEmail });
    }
    if (user) {
      kost = await Kost.findOne({ ownerId: user._id });
    }
  }

  // If still no Kost record but user exists as pemilik_kos, auto-provision their Kost document
  if (!kost && user && (user.role === "pemilik_kos" || user.role === "admin")) {
    const rawRoleData = user.roleData instanceof Map ? Object.fromEntries(user.roleData) : (user.roleData || {});
    const kostName = rawRoleData.businessName || user.name || "Kost Mitra";
    const categoryType = rawRoleData.businessCategory || (rawRoleData.propertyType?.toLowerCase().includes("wisata") ? "wisata" : rawRoleData.propertyType?.toLowerCase().includes("hotel") || rawRoleData.propertyType?.toLowerCase().includes("villa") ? "hotel" : "kost");
    let kostType = "Campur";
    if (categoryType === "wisata") kostType = "Wisata Rekreasi";
    else if (categoryType === "hotel") kostType = "Hotel & Villa";
    else if (rawRoleData.propertyType?.toLowerCase().includes("putri")) kostType = "Putri";
    else if (rawRoleData.propertyType?.toLowerCase().includes("putra")) kostType = "Putra";

    const lat = Number(rawRoleData.latitude) || -7.2278;
    const lng = Number(rawRoleData.longitude) || 107.9087;

    kost = await Kost.create({
      ownerId: user._id,
      name: kostName.charAt(0).toUpperCase() + kostName.slice(1),
      categoryType: categoryType || "kost",
      type: kostType,
      address: user.address || rawRoleData.businessAddress || "Jl. Raya Kamojang, Samarang, Garut",
      city: "Garut",
      district: "Kamojang",
      latitude: lat,
      longitude: lng,
      description: "Properti eksklusif nyaman, bersih, aman, dan berfasilitas lengkap di kawasan Garut.",
      price: categoryType === "wisata" ? 25000 : categoryType === "hotel" ? 450000 : 1200000,
      dpAmount: categoryType === "wisata" ? 25000 : 200000,
      facilities: categoryType === "wisata"
        ? ["Spot Foto", "Gazebo", "Kolam Renang", "Area Parkir", "Toilet & Bilas", "Food Court"]
        : categoryType === "hotel"
        ? ["WiFi Gratis", "AC Dingin", "Smart TV", "Bathtub", "Restoran & Kafe", "Resepsionis 24 Jam"]
        : ["WiFi", "AC", "KM Dalam", "Kasur", "Lemari", "Parkir Luas"],
      rules: categoryType === "wisata"
        ? ["Dilarang Membuang Sampah Sembarangan", "Jaga Keselamatan di Area Wahana"]
        : ["Akses 24 Jam", "Dilarang Merokok di Kamar"],
      images: [
        user.profilePhoto || (categoryType === "wisata" ? "https://images.unsplash.com/photo-1582650625119-3a31f8fa2699?auto=format&fit=crop&w=800&q=80" : categoryType === "hotel" ? "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80" : "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80"),
      ],
      rooms: (categoryType === "kost" || String(rawRoleData.businessCategories || "").includes("kost") || !rawRoleData.businessCategories) ? [
        { roomNumber: "101", roomType: "Tipe AC", floor: 1, priceMonthly: 1200000, isAvailable: true, facilities: ["AC", "WiFi", "KM Dalam", "Kasur", "Lemari"], images: [] }
      ] : [],
      hotelRooms: (categoryType === "hotel" || String(rawRoleData.businessCategories || "").includes("hotel")) ? [
        { roomName: "Deluxe Villa Room", bedType: "King Bed", capacity: 2, pricePerNight: 450000, isAvailable: true, facilities: ["WiFi", "AC", "Smart TV", "Bathtub", "Sarapan"], images: [] }
      ] : [],
      wisataTickets: (categoryType === "wisata" || String(rawRoleData.businessCategories || "").includes("wisata")) ? [
        { ticketName: "Tiket Masuk Reguler", ticketType: "reguler", price: 25000, description: "Akses seluruh wahana air dan spot foto", includedFacilities: ["Spot Foto", "Gazebo", "Kolam Renang"] }
      ] : [],
    });
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

// Get all rooms / items of a Kost, Hotel, or Wisata
const getRoomsByOwner = async (req, res) => {
  try {
    const { ownerId } = req.params;
    const kost = await findKostByOwnerOrEmail(ownerId);

    if (!kost) {
      return res.status(404).json({ success: false, message: "Data properti belum terdaftar." });
    }

    const categoryType = kost.categoryType || "kost";

    if (categoryType === "hotel" && Array.isArray(kost.hotelRooms) && kost.hotelRooms.length > 0) {
      const hotelRoomsList = kost.hotelRooms.map((hr) => {
        const roomImgs = Array.isArray(hr.images) && hr.images.length > 0
          ? hr.images
          : [(kost.images && kost.images[0]) || "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80"];

        return {
          id: hr._id.toString(),
          name: hr.roomName || "Deluxe Room",
          type: `${hr.bedType || "King Bed"} • ${hr.capacity || 2} Tamu`,
          roomName: hr.roomName || "Deluxe Room",
          bedType: hr.bedType || "King Bed",
          capacity: hr.capacity || 2,
          breakfastIncluded: hr.breakfastIncluded !== false,
          status: hr.isAvailable ? "kosong" : "terisi",
          facilities: Array.isArray(hr.facilities) ? hr.facilities : ["AC", "Smart TV", "WiFi", "Bathtub"],
          inclusions: hr.breakfastIncluded !== false ? ["Termasuk Sarapan"] : ["Tanpa Sarapan"],
          price: `Rp ${Number(hr.pricePerNight || kost.price || 450000).toLocaleString("id-ID")}`,
          pricePerNight: Number(hr.pricePerNight || kost.price || 450000),
          image: roomImgs[0],
          images: roomImgs,
          description: `Kamar tipe ${hr.roomName} dengan ${hr.bedType || "King Bed"} untuk ${hr.capacity || 2} tamu.`,
          isAvailable: hr.isAvailable !== false,
          categoryType: "hotel",
        };
      });

      return res.status(200).json({
        success: true,
        count: hotelRoomsList.length,
        kostId: kost._id,
        kostName: kost.name,
        categoryType: "hotel",
        data: hotelRoomsList,
      });
    }

    if (categoryType === "wisata" && Array.isArray(kost.wisataTickets) && kost.wisataTickets.length > 0) {
      const ticketsList = kost.wisataTickets.map((wt) => {
        const rawImgs = (kost.images && kost.images.length > 0)
          ? kost.images
          : ["https://images.unsplash.com/photo-1582650625119-3a31f8fa2699?auto=format&fit=crop&w=800&q=80"];

        return {
          id: wt._id.toString(),
          name: wt.ticketName || "Tiket Masuk Reguler",
          type: wt.ticketType ? `Kategori ${wt.ticketType.toUpperCase()}` : "Tiket Reguler",
          ticketName: wt.ticketName || "Tiket Masuk Reguler",
          ticketType: wt.ticketType || "reguler",
          status: "kosong",
          facilities: Array.isArray(wt.includedFacilities) ? wt.includedFacilities : ["Spot Foto", "Gazebo"],
          inclusions: Array.isArray(wt.includedFacilities) ? wt.includedFacilities : ["Spot Foto", "Gazebo"],
          price: `Rp ${Number(wt.price || kost.price || 25000).toLocaleString("id-ID")}`,
          pricePerNight: Number(wt.price || kost.price || 25000),
          image: rawImgs[0],
          images: rawImgs,
          description: wt.description || "Akses wahana wisata dan spot foto.",
          isAvailable: true,
          categoryType: "wisata",
        };
      });

      return res.status(200).json({
        success: true,
        count: ticketsList.length,
        kostId: kost._id,
        kostName: kost.name,
        categoryType: "wisata",
        data: ticketsList,
      });
    }

    // Default: Kost rooms
    const rooms = (kost.rooms || []).map((r) => {
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
        categoryType: "kost",
      };
    });

    return res.status(200).json({
      success: true,
      count: rooms.length,
      kostId: kost._id,
      kostName: kost.name,
      categoryType: kost.categoryType || "kost",
      data: rooms,
    });
  } catch (error) {
    console.error("❌ getRoomsByOwner error:", error);
    return res.status(500).json({ success: false, message: "Gagal mengambil daftar item / kamar", error: error.message });
  }
};

// Add new room, hotel room type, or wisata ticket
const addRoom = async (req, res) => {
  try {
    const { ownerId } = req.params;
    const body = req.body;

    const kost = await findKostByOwnerOrEmail(ownerId);
    if (!kost) {
      return res.status(404).json({ success: false, message: "Properti tidak ditemukan" });
    }

    const categoryType = kost.categoryType || "kost";

    const roomImages = Array.isArray(body.images) && body.images.length > 0
      ? body.images
      : (body.image ? [body.image] : []);

    if (categoryType === "hotel") {
      const newHotelRoom = {
        roomName: body.roomName || body.name || body.roomNumber || `Deluxe Room ${kost.hotelRooms.length + 1}`,
        bedType: body.bedType || "King Bed",
        capacity: Number(body.capacity) || 2,
        pricePerNight: Number(body.pricePerNight || body.priceMonthly || body.price) || 450000,
        isAvailable: body.isAvailable !== undefined ? body.isAvailable : true,
        facilities: body.facilities || ["AC", "WiFi", "Smart TV", "Bathtub", "Sarapan"],
        images: roomImages,
        breakfastIncluded: body.breakfastIncluded !== undefined ? body.breakfastIncluded : true,
      };

      kost.hotelRooms.push(newHotelRoom);
      const allHotelPrices = kost.hotelRooms.map((h) => Number(h.pricePerNight) || 0).filter((p) => p > 0);
      if (allHotelPrices.length > 0) kost.price = Math.min(...allHotelPrices);
      if (roomImages.length > 0) kost.images = Array.from(new Set([...roomImages, ...(kost.images || [])]));

      kost.markModified("hotelRooms");
      await kost.save();

      return res.status(201).json({
        success: true,
        message: `Tipe Kamar "${newHotelRoom.roomName}" berhasil ditambahkan!`,
        data: kost.hotelRooms[kost.hotelRooms.length - 1],
      });
    }

    if (categoryType === "wisata") {
      const newTicket = {
        ticketName: body.ticketName || body.name || body.roomNumber || `Tiket Kategori ${kost.wisataTickets.length + 1}`,
        ticketType: body.ticketType || "reguler",
        price: Number(body.price || body.priceMonthly || body.pricePerNight) || 25000,
        description: body.description || "Akses wahana wisata dan spot foto",
        includedFacilities: body.facilities || body.includedFacilities || ["Spot Foto", "Gazebo"],
      };

      kost.wisataTickets.push(newTicket);
      const allTicketPrices = kost.wisataTickets.map((t) => Number(t.price) || 0).filter((p) => p > 0);
      if (allTicketPrices.length > 0) {
        kost.price = Math.min(...allTicketPrices);
        kost.dpAmount = Math.min(...allTicketPrices);
      }
      kost.markModified("wisataTickets");
      await kost.save();

      return res.status(201).json({
        success: true,
        message: `Kategori Tiket "${newTicket.ticketName}" berhasil ditambahkan!`,
        data: kost.wisataTickets[kost.wisataTickets.length - 1],
      });
    }

    // Default Kost Room
    const newRoom = {
      roomNumber: body.roomNumber || `${kost.rooms.length + 1}`,
      roomType: body.roomType || "Tipe AC",
      priceMonthly: Number(body.priceMonthly) || kost.price,
      floor: Number(body.floor) || 1,
      facilities: body.facilities || ["AC", "WiFi", "KM Dalam"],
      isAvailable: body.isAvailable !== undefined ? body.isAvailable : true,
      images: roomImages,
    };

    kost.rooms.push(newRoom);

    const allRoomPrices = kost.rooms.map((r) => Number(r.priceMonthly) || 0).filter((p) => p > 0);
    if (allRoomPrices.length > 0) {
      kost.price = Math.min(...allRoomPrices);
    }
    if (roomImages.length > 0) {
      kost.images = Array.from(new Set([...roomImages, ...(kost.images || [])]));
    }
    if (Array.isArray(body.facilities) && body.facilities.length > 0) {
      kost.facilities = Array.from(new Set([...body.facilities, ...(kost.facilities || [])]));
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
    return res.status(500).json({ success: false, message: "Gagal menambahkan kamar / item", error: error.message });
  }
};

// Update room, hotel room type, or wisata ticket
const updateRoom = async (req, res) => {
  try {
    const { ownerId, roomId } = req.params;
    const updateData = req.body;

    const kost = await findKostByOwnerOrEmail(ownerId);
    if (!kost) return res.status(404).json({ success: false, message: "Properti tidak ditemukan" });

    const categoryType = kost.categoryType || "kost";

    if (categoryType === "hotel") {
      let hotelRoom = null;
      if (roomId && roomId.match(/^[0-9a-fA-F]{24}$/)) {
        hotelRoom = kost.hotelRooms.id(roomId);
      }
      if (!hotelRoom) {
        hotelRoom = kost.hotelRooms.find((h) => h._id?.toString() === roomId || h.roomName === updateData.roomName || h.roomName === updateData.name);
      }
      if (hotelRoom) {
        if (updateData.roomName || updateData.name) hotelRoom.roomName = updateData.roomName || updateData.name;
        if (updateData.bedType) hotelRoom.bedType = updateData.bedType;
        if (updateData.capacity !== undefined) hotelRoom.capacity = Number(updateData.capacity);
        if (updateData.pricePerNight || updateData.priceMonthly || updateData.price) {
          hotelRoom.pricePerNight = Number(updateData.pricePerNight || updateData.priceMonthly || updateData.price);
        }
        if (updateData.isAvailable !== undefined) hotelRoom.isAvailable = updateData.isAvailable;
        if (updateData.facilities) hotelRoom.facilities = updateData.facilities;
        if (updateData.breakfastIncluded !== undefined) hotelRoom.breakfastIncluded = updateData.breakfastIncluded;
        if (Array.isArray(updateData.images)) hotelRoom.images = updateData.images;

        const allHotelPrices = kost.hotelRooms.map((h) => Number(h.pricePerNight) || 0).filter((p) => p > 0);
        if (allHotelPrices.length > 0) kost.price = Math.min(...allHotelPrices);

        kost.markModified("hotelRooms");
        await kost.save();

        return res.status(200).json({
          success: true,
          message: `Tipe Kamar "${hotelRoom.roomName}" berhasil diperbarui!`,
          data: hotelRoom,
        });
      }
    }

    if (categoryType === "wisata") {
      let ticket = null;
      if (roomId && roomId.match(/^[0-9a-fA-F]{24}$/)) {
        ticket = kost.wisataTickets.id(roomId);
      }
      if (!ticket) {
        ticket = kost.wisataTickets.find((t) => t._id?.toString() === roomId || t.ticketName === updateData.ticketName || t.ticketName === updateData.name);
      }
      if (ticket) {
        if (updateData.ticketName || updateData.name) ticket.ticketName = updateData.ticketName || updateData.name;
        if (updateData.ticketType) ticket.ticketType = updateData.ticketType;
        if (updateData.price || updateData.priceMonthly || updateData.pricePerNight) {
          ticket.price = Number(updateData.price || updateData.priceMonthly || updateData.pricePerNight);
        }
        if (updateData.description) ticket.description = updateData.description;
        if (updateData.facilities || updateData.includedFacilities) {
          ticket.includedFacilities = updateData.facilities || updateData.includedFacilities;
        }

        const allTicketPrices = kost.wisataTickets.map((t) => Number(t.price) || 0).filter((p) => p > 0);
        if (allTicketPrices.length > 0) {
          kost.price = Math.min(...allTicketPrices);
          kost.dpAmount = Math.min(...allTicketPrices);
        }

        kost.markModified("wisataTickets");
        await kost.save();

        return res.status(200).json({
          success: true,
          message: `Kategori Tiket "${ticket.ticketName}" berhasil diperbarui!`,
          data: ticket,
        });
      }
    }

    // Default Kost Room
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

// Delete room, hotel room type, or wisata ticket
const deleteRoom = async (req, res) => {
  try {
    const { ownerId, roomId } = req.params;
    const kost = await findKostByOwnerOrEmail(ownerId);
    if (!kost) return res.status(404).json({ success: false, message: "Properti tidak ditemukan" });

    const categoryType = kost.categoryType || "kost";

    if (categoryType === "hotel") {
      let hotelIndex = kost.hotelRooms.findIndex((h) => h._id?.toString() === roomId || h.roomName === roomId);
      if (hotelIndex !== -1) {
        kost.hotelRooms.splice(hotelIndex, 1);
        const allHotelPrices = kost.hotelRooms.map((h) => Number(h.pricePerNight) || 0).filter((p) => p > 0);
        if (allHotelPrices.length > 0) kost.price = Math.min(...allHotelPrices);
        kost.markModified("hotelRooms");
        await kost.save();
        return res.status(200).json({ success: true, message: "Tipe kamar hotel berhasil dihapus" });
      }
    }

    if (categoryType === "wisata") {
      let ticketIndex = kost.wisataTickets.findIndex((t) => t._id?.toString() === roomId || t.ticketName === roomId);
      if (ticketIndex !== -1) {
        kost.wisataTickets.splice(ticketIndex, 1);
        const allTicketPrices = kost.wisataTickets.map((t) => Number(t.price) || 0).filter((p) => p > 0);
        if (allTicketPrices.length > 0) {
          kost.price = Math.min(...allTicketPrices);
          kost.dpAmount = Math.min(...allTicketPrices);
        }
        kost.markModified("wisataTickets");
        await kost.save();
        return res.status(200).json({ success: true, message: "Kategori tiket wisata berhasil dihapus" });
      }
    }

    let roomIndex = -1;
    if (roomId && roomId.match(/^[0-9a-fA-F]{24}$/)) {
      roomIndex = kost.rooms.findIndex((r) => r._id.toString() === roomId);
    }
    if (roomIndex === -1 && roomId) {
      const cleanNum = roomId.replace(/^(Kamar\s*)+/gi, "").trim();
      roomIndex = kost.rooms.findIndex((r) => r.roomNumber === cleanNum || r.roomNumber === roomId);
    }

    if (roomIndex === -1) {
      return res.status(404).json({ success: false, message: "Item tidak ditemukan" });
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

    const {
      facilities,
      rules,
      description,
      name,
      type,
      categoryType,
      address,
      city,
      district,
      latitude,
      longitude,
      bankAccount,
      dpAmount,
      stars,
      openHours,
      price,
      hotelRooms,
      wisataTickets,
    } = req.body;

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
    if (categoryType !== undefined) kost.categoryType = categoryType;
    if (address !== undefined) kost.address = address;
    if (city !== undefined) kost.city = city;
    if (district !== undefined) kost.district = district;
    if (latitude !== undefined) kost.latitude = Number(latitude);
    if (longitude !== undefined) kost.longitude = Number(longitude);
    if (stars !== undefined) kost.stars = Number(stars);
    if (openHours !== undefined) kost.openHours = openHours;
    if (price !== undefined) kost.price = Number(price);

    if (Array.isArray(hotelRooms)) {
      kost.hotelRooms = hotelRooms;
      kost.markModified("hotelRooms");
    }
    if (Array.isArray(wisataTickets)) {
      kost.wisataTickets = wisataTickets;
      kost.markModified("wisataTickets");
    }

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
      message: "Data rekening pembayaran, lokasi GPS & properti homestay berhasil diperbarui di database!",
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

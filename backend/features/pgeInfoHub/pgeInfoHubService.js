/**
 * PGE Info Hub Content Service (CMS & Content Repository)
 * Dikelola oleh Tim Humas & CSR PGE Kamojang untuk publikasi resmi.
 */

const mongoose = require("mongoose");
const PgeInfoHubItem = require("../../models/PgeInfoHubItem");

const INITIAL_PGE_INFO_HUB_ITEMS = [
  {
    id: "pge-cp-001",
    itemId: "pge-cp-001",
    title: "Profil Resmi PT Pertamina Geothermal Energy Tbk (PGE) Area Kamojang",
    category: "Company Profile",
    description:
      "PGE Area Kamojang merupakan pelopor pemanfaatan energi panas bumi ramah lingkungan di Indonesia. Bersama masyarakat sekitar Kamojang, PGE menggerakkan inovasi ekonomi sirkular dan digitalisasi desa berkelanjutan melalui GEOVERSE.",
    imageUrl:
      "https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?auto=format&fit=crop&w=1200&q=80",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    posterUrl:
      "https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?auto=format&fit=crop&w=1200&q=80",
    authorOrDept: "Corporate Communication & CSR PGE Kamojang",
    location: "Kamojang, Samarang, Kabupaten Garut",
    publishedAt: "2026-03-01T08:00:00.000Z",
    isPublished: true,
    status: "PUBLISHED",
    tags: ["Energi Bersih", "Geotermal", "Kamojang"],
  },
  {
    id: "pge-csr-001",
    itemId: "pge-csr-001",
    title: "Program Kanyaah Waste to Energy & Ekonomi Sirkular Kamojang",
    category: "CSR",
    description:
      "Inisiatif pemberdayaan bank sampah terpadu warga Kamojang. Setiap kilogram sampah anorganik yang disetor ditimbang secara transparan dan dikonversi menjadi saldo Geoverse Point untuk kebutuhan harian warga.",
    imageUrl:
      "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=1200&q=80",
    posterUrl:
      "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=1200&q=80",
    authorOrDept: "Tim Community Development PGE Kamojang",
    location: "Desa Laksana & Ibun, Kamojang",
    publishedAt: "2026-03-10T09:30:00.000Z",
    isPublished: true,
    status: "PUBLISHED",
    tags: ["Kanyaah", "Recycle", "CSR"],
  },
  {
    id: "pge-event-001",
    itemId: "pge-event-001",
    title: "Festival Geothermal & Pameran UMKM Desa Kamojang 2026",
    category: "Acara",
    description:
      "Pameran tahunan produk lokal binaan PGE Kamojang: kopi Kamojang, kriya ramah lingkungan, madu hutan, dan pengenalan layanan digital ojek lokal GEOVERSE.",
    imageUrl:
      "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80",
    videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    posterUrl:
      "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1200&q=80",
    authorOrDept: "Panitia Bersama PGE & Komunitas Kamojang",
    location: "Pusat Edukasi Geotermal PGE Kamojang",
    eventDate: "25–27 April 2026",
    publishedAt: "2026-03-15T10:00:00.000Z",
    isPublished: true,
    status: "PUBLISHED",
    tags: ["Festival", "UMKM", "Kamojang"],
  },
  {
    id: "pge-comm-001",
    itemId: "pge-comm-001",
    title: "Pelatihan Standar Layanan & Keselamatan Mitra Driver GEOVERSE",
    category: "Kegiatan Komunitas",
    description:
      "Program penguatan kompetensi keselamatan berkendara, tata cara verifikasi dokumen mitra, serta sosialisasi skema komisi khusus 100% untuk mitra driver perintis Kedai Terpadu.",
    imageUrl:
      "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=1200&q=80",
    posterUrl:
      "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&w=1200&q=80",
    authorOrDept: "Divisi Operasional Mitra GEOVERSE",
    location: "Kedai Terpadu PGE Kamojang",
    publishedAt: "2026-03-18T14:00:00.000Z",
    isPublished: true,
    status: "PUBLISHED",
    tags: ["Driver", "Safety", "Komunitas"],
  },
];

/**
 * Get published items for public view (Customer App)
 * Reads from MongoDB if available, otherwise falls back to INITIAL_PGE_INFO_HUB_ITEMS
 */
const getPublishedInfoHubItems = async (category = null) => {
  try {
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      const query = { isPublished: true, status: "PUBLISHED" };
      if (category && category !== "Semua") {
        query.category = new RegExp(`^${category}$`, "i");
      }
      const dbItems = await PgeInfoHubItem.find(query)
        .sort({ publishedAt: -1, createdAt: -1 })
        .lean();

      if (dbItems && dbItems.length > 0) {
        return dbItems.map((item) => ({
          ...item,
          id: item.itemId || String(item._id),
        }));
      }
    }
  } catch (err) {
    console.warn("⚠️ PgeInfoHub DB query fallback to memory:", err.message);
  }

  let items = INITIAL_PGE_INFO_HUB_ITEMS.filter((i) => i.isPublished);
  if (category && category !== "Semua") {
    items = items.filter((i) => i.category.toLowerCase() === category.toLowerCase());
  }
  return items;
};

/**
 * Admin CMS: Get all items with status filtering
 */
const getAllInfoHubItems = async (filter = {}) => {
  try {
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      const query = {};
      if (filter.status) query.status = filter.status;
      if (filter.category && filter.category !== "Semua") query.category = filter.category;

      const items = await PgeInfoHubItem.find(query).sort({ updatedAt: -1, createdAt: -1 }).lean();
      return items.map((i) => ({ ...i, id: i.itemId || String(i._id) }));
    }
  } catch (err) {
    console.warn("⚠️ PgeInfoHub getAll fallback to initial items:", err.message);
  }

  let items = [...INITIAL_PGE_INFO_HUB_ITEMS];
  if (filter.status) items = items.filter((i) => i.status === filter.status);
  if (filter.category && filter.category !== "Semua") {
    items = items.filter((i) => i.category.toLowerCase() === filter.category.toLowerCase());
  }
  return items;
};

/**
 * Admin CMS: Create new draft/item
 */
const createInfoHubItem = async (data = {}, actorId = "admin") => {
  const itemId = `PGE-${Date.now().toString().slice(-6)}`;
  const itemData = {
    itemId,
    title: data.title || "Pengumuman PGE Kamojang",
    category: data.category || "Company Profile",
    description: data.description || "",
    body: data.body || "",
    imageUrl: data.imageUrl || "",
    videoUrl: data.videoUrl || "",
    posterUrl: data.posterUrl || "",
    authorOrDept: data.authorOrDept || "Corporate Communication & CSR PGE Kamojang",
    location: data.location || "Kamojang, Samarang, Kabupaten Garut",
    eventDate: data.eventDate || "",
    tags: Array.isArray(data.tags) ? data.tags : [],
    status: data.status || "DRAFT",
    isPublished: data.status === "PUBLISHED",
    publishedAt: data.status === "PUBLISHED" ? new Date() : null,
    createdBy: actorId,
    auditTrail: [
      {
        action: "CREATED",
        actorId,
        note: `Konten dibuat dengan status ${data.status || "DRAFT"}.`,
        timestamp: new Date(),
      },
    ],
  };

  if (mongoose.connection && mongoose.connection.readyState === 1) {
    const created = await PgeInfoHubItem.create(itemData);
    return { ...created.toObject(), id: itemId };
  }

  INITIAL_PGE_INFO_HUB_ITEMS.unshift({ ...itemData, id: itemId });
  return { ...itemData, id: itemId };
};

/**
 * Admin CMS: Review & Update item status (Submit, Approve, Publish, Reject, Unpublish)
 */
const updateInfoHubItemStatus = async (id, { status, rejectionReason = "", approvedBy = "", actorId = "admin", note = "" }) => {
  const validStatuses = [
    "DRAFT",
    "PENDING_APPROVAL",
    "APPROVED",
    "PUBLISHED",
    "UNPUBLISHED",
    "ARCHIVED",
  ];
  if (!validStatuses.includes(status)) {
    throw new Error(`Status ${status} tidak valid.`);
  }

  const isPublished = status === "PUBLISHED";
  const updatePayload = {
    status,
    isPublished,
    ...(status === "PUBLISHED" ? { publishedAt: new Date() } : {}),
    ...(status === "APPROVED" ? { approvedBy: approvedBy || "Humas PGE Kamojang" } : {}),
    ...(status === "REJECTED" || rejectionReason ? { rejectionReason } : {}),
    $push: {
      auditTrail: {
        action: `STATUS_CHANGE_TO_${status}`,
        actorId,
        note: note || rejectionReason || `Status diubah menjadi ${status}`,
        timestamp: new Date(),
      },
    },
  };

  if (mongoose.connection && mongoose.connection.readyState === 1) {
    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { itemId: id };
    const updated = await PgeInfoHubItem.findOneAndUpdate(query, updatePayload, { new: true }).lean();
    if (updated) return { ...updated, id: updated.itemId || String(updated._id) };
  }

  const idx = INITIAL_PGE_INFO_HUB_ITEMS.findIndex((i) => i.id === id || i.itemId === id);
  if (idx !== -1) {
    INITIAL_PGE_INFO_HUB_ITEMS[idx] = {
      ...INITIAL_PGE_INFO_HUB_ITEMS[idx],
      status,
      isPublished,
      rejectionReason,
    };
    return INITIAL_PGE_INFO_HUB_ITEMS[idx];
  }

  throw new Error("Konten PGE Info Hub tidak ditemukan.");
};

/**
 * Admin CMS: Update existing item content and settings
 */
const updateInfoHubItem = async (id, data = {}, actorId = "admin") => {
  const isPublished = data.status ? data.status === "PUBLISHED" : undefined;
  const updatePayload = {
    ...(data.title !== undefined ? { title: data.title } : {}),
    ...(data.category !== undefined ? { category: data.category } : {}),
    ...(data.description !== undefined ? { description: data.description } : {}),
    ...(data.body !== undefined ? { body: data.body } : {}),
    ...(data.imageUrl !== undefined ? { imageUrl: data.imageUrl } : {}),
    ...(data.posterUrl !== undefined ? { posterUrl: data.posterUrl } : {}),
    ...(data.videoUrl !== undefined ? { videoUrl: data.videoUrl } : {}),
    ...(data.authorOrDept !== undefined ? { authorOrDept: data.authorOrDept } : {}),
    ...(data.location !== undefined ? { location: data.location } : {}),
    ...(data.eventDate !== undefined ? { eventDate: data.eventDate } : {}),
    ...(data.tags !== undefined ? { tags: Array.isArray(data.tags) ? data.tags : [] } : {}),
    ...(data.status !== undefined ? { status: data.status, isPublished } : {}),
    ...(isPublished ? { publishedAt: new Date() } : {}),
    $push: {
      auditTrail: {
        action: "UPDATED",
        actorId,
        note: `Konten diperbarui oleh ${actorId}.`,
        timestamp: new Date(),
      },
    },
  };

  if (mongoose.connection && mongoose.connection.readyState === 1) {
    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { itemId: id };
    const updated = await PgeInfoHubItem.findOneAndUpdate(query, updatePayload, { new: true }).lean();
    if (updated) return { ...updated, id: updated.itemId || String(updated._id) };
  }

  const idx = INITIAL_PGE_INFO_HUB_ITEMS.findIndex((i) => i.id === id || i.itemId === id);
  if (idx !== -1) {
    INITIAL_PGE_INFO_HUB_ITEMS[idx] = {
      ...INITIAL_PGE_INFO_HUB_ITEMS[idx],
      ...data,
      ...(isPublished !== undefined ? { isPublished } : {}),
    };
    return INITIAL_PGE_INFO_HUB_ITEMS[idx];
  }

  throw new Error("Konten PGE Info Hub tidak ditemukan.");
};

/**
 * Admin CMS: Delete an item
 */
const deleteInfoHubItem = async (id, actorId = "admin") => {
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    const query = mongoose.Types.ObjectId.isValid(id) ? { _id: id } : { itemId: id };
    const deleted = await PgeInfoHubItem.findOneAndDelete(query).lean();
    if (deleted) return { success: true, id };
  }

  const idx = INITIAL_PGE_INFO_HUB_ITEMS.findIndex((i) => i.id === id || i.itemId === id);
  if (idx !== -1) {
    INITIAL_PGE_INFO_HUB_ITEMS.splice(idx, 1);
    return { success: true, id };
  }

  throw new Error("Konten PGE Info Hub tidak ditemukan untuk dihapus.");
};

module.exports = {
  INITIAL_PGE_INFO_HUB_ITEMS,
  getPublishedInfoHubItems,
  getAllInfoHubItems,
  createInfoHubItem,
  updateInfoHubItem,
  updateInfoHubItemStatus,
  deleteInfoHubItem,
};

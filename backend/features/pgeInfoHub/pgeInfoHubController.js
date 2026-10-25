const {
  getPublishedInfoHubItems,
  getAllInfoHubItems,
  createInfoHubItem,
  updateInfoHubItem,
  updateInfoHubItemStatus,
  deleteInfoHubItem,
} = require("./pgeInfoHubService");

/**
 * Public: Get published PGE Info Hub items
 * GET /api/pge-info-hub?category=Acara
 */
const getPublished = async (req, res) => {
  try {
    const items = await getPublishedInfoHubItems(req.query.category);
    return res.status(200).json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (error) {
    console.error("pgeInfoHub getPublished error:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal memuat konten PGE Info Hub.",
    });
  }
};

/**
 * Admin: Get all items for CMS management
 * GET /api/pge-info-hub/admin?status=DRAFT
 */
const getAdminAll = async (req, res) => {
  try {
    const items = await getAllInfoHubItems(req.query);
    return res.status(200).json({
      success: true,
      count: items.length,
      data: items,
    });
  } catch (error) {
    console.error("pgeInfoHub getAdminAll error:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal memuat daftar konten admin PGE Info Hub.",
    });
  }
};

/**
 * Admin: Create new content item
 * POST /api/pge-info-hub
 */
const createItem = async (req, res) => {
  try {
    const actorId = String(req.authUser?._id || req.user?._id || "admin");
    const item = await createInfoHubItem(req.body, actorId);
    return res.status(201).json({
      success: true,
      message: "Konten PGE Info Hub berhasil dibuat.",
      data: item,
    });
  } catch (error) {
    console.error("pgeInfoHub createItem error:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Gagal membuat konten PGE Info Hub.",
    });
  }
};

/**
 * Admin / PGE Approver: Update item status (Approve, Reject, Publish, Unpublish)
 * PUT /api/pge-info-hub/:id/status
 */
const updateStatus = async (req, res) => {
  try {
    const actorId = String(req.authUser?._id || req.user?._id || "admin");
    const { status, rejectionReason, approvedBy, note } = req.body;
    const item = await updateInfoHubItemStatus(req.params.id, {
      status,
      rejectionReason,
      approvedBy,
      actorId,
      note,
    });

    return res.status(200).json({
      success: true,
      message: `Status konten berhasil diperbarui menjadi ${status}.`,
      data: item,
    });
  } catch (error) {
    console.error("pgeInfoHub updateStatus error:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Gagal memperbarui status konten.",
    });
  }
};

/**
 * Admin: Update full content item
 * PUT /api/pge-info-hub/:id
 */
const updateItem = async (req, res) => {
  try {
    const actorId = String(req.authUser?._id || req.user?._id || "admin");
    const item = await updateInfoHubItem(req.params.id, req.body, actorId);
    return res.status(200).json({
      success: true,
      message: "Konten PGE Info Hub berhasil diperbarui.",
      data: item,
    });
  } catch (error) {
    console.error("pgeInfoHub updateItem error:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Gagal memperbarui konten PGE Info Hub.",
    });
  }
};

/**
 * Admin: Delete content item
 * DELETE /api/pge-info-hub/:id
 */
const deleteItem = async (req, res) => {
  try {
    const actorId = String(req.authUser?._id || req.user?._id || "admin");
    const result = await deleteInfoHubItem(req.params.id, actorId);
    return res.status(200).json({
      success: true,
      message: "Konten PGE Info Hub berhasil dihapus.",
      data: result,
    });
  } catch (error) {
    console.error("pgeInfoHub deleteItem error:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Gagal menghapus konten PGE Info Hub.",
    });
  }
};

/**
 * Admin: Upload poster or media for PGE Info Hub
 * POST /api/pge-info-hub/upload
 */
const path = require("path");
const fs = require("fs");
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const uploadMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "File media wajib diunggah.",
      });
    }

    const { mimetype, size, path: tempFilePath, originalname } = req.file;
    const isVideo = mimetype && mimetype.startsWith("video/");
    const cleanBaseName = (originalname || "pge_media").replace(/[^a-zA-Z0-9._-]/g, "_");
    const publicId = `pge_${Date.now()}_${path.parse(cleanBaseName).name}`;

    try {
      const uploadResult = await cloudinary.uploader.upload(tempFilePath, {
        folder: "geoverse/pge-info-hub",
        public_id: publicId,
        resource_type: isVideo ? "video" : "image",
      });

      return res.status(200).json({
        success: true,
        message: "File berhasil diunggah ke Cloudinary.",
        data: {
          url: uploadResult.secure_url,
          mediaType: isVideo ? "VIDEO" : "IMAGE",
          publicId: uploadResult.public_id,
        },
      });
    } catch (cldErr) {
      console.warn("Cloudinary upload failed, falling back to local storage:", cldErr.message);
      const uploadsDir = path.join(__dirname, "../../uploads");
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      const destFilename = `${publicId}${path.extname(originalname || ".jpg")}`;
      const destPath = path.join(uploadsDir, destFilename);
      fs.copyFileSync(tempFilePath, destPath);

      const host = req.get("host") || "localhost:5000";
      const protocol = req.protocol || "http";
      const fileUrl = `${protocol}://${host}/uploads/${destFilename}`;

      return res.status(200).json({
        success: true,
        message: "File berhasil disimpan di penyimpanan lokal.",
        data: {
          url: fileUrl,
          mediaType: isVideo ? "VIDEO" : "IMAGE",
        },
      });
    }
  } catch (error) {
    console.error("pgeInfoHub uploadMedia error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Gagal mengunggah file media.",
    });
  }
};

module.exports = {
  getPublished,
  getAdminAll,
  createItem,
  updateItem,
  updateStatus,
  deleteItem,
  uploadMedia,
};

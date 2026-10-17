const {
  getPublishedInfoHubItems,
  getAllInfoHubItems,
  createInfoHubItem,
  updateInfoHubItemStatus,
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

module.exports = {
  getPublished,
  getAdminAll,
  createItem,
  updateStatus,
};

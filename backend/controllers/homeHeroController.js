/**
 * homeHeroController.js
 * Controller for Homepage Hero Banner (Customer & Admin CMS)
 */

const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const cloudinary = require("cloudinary").v2;
const HomeHeroBanner = require("../models/HomeHeroBanner");
const { getBearerToken, verifyAccessToken } = require("../middleware/authMiddleware");

const uploadLargeVideo = (filePath, options) =>
  new Promise((resolve, reject) => {
    cloudinary.uploader.upload_large(filePath, options, (error, result) => {
      if (error) return reject(error);
      return resolve(result);
    });
  });

// Ensure Cloudinary is configured
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "hdlw3v3n",
  api_key: process.env.CLOUDINARY_API_KEY || "644169682494749",
  api_secret: process.env.CLOUDINARY_API_SECRET || "IWYyiIt5Ro8CgAbw8BSsyIIo8tk",
  secure: true,
});

/**
 * Strict Admin Auth Guard (Does not allow x-user-id fallback for security)
 */
async function authenticateAdmin(req) {
  const token = getBearerToken(req);
  if (!token) {
    const error = new Error("Akses ditolak: Token autentikasi Bearer wajib disertakan.");
    error.statusCode = 401;
    throw error;
  }
  const user = await verifyAccessToken(token);
  if (!user) {
    const error = new Error("Sesi login tidak valid atau sudah berakhir.");
    error.statusCode = 401;
    throw error;
  }
  if (user.role !== "admin" && user.role !== "superadmin") {
    const error = new Error("Akses ditolak: Hanya admin atau superadmin yang dapat mengakses fitur ini.");
    error.statusCode = 403;
    throw error;
  }
  return user;
}

/**
 * 1. GET /api/home-hero/active
 * Customer endpoint: returns active, non-expired hero banners for customer home
 */
async function getActiveHeroes(req, res) {
  try {
    const placement = req.query.placement || "CUSTOMER_HOME_HERO";
    const now = new Date();

    const query = {
      placement,
      isActive: true,
      $and: [
        {
          $or: [
            { startAt: null },
            { startAt: { $exists: false } },
            { startAt: { $lte: now } },
          ],
        },
        {
          $or: [
            { endAt: null },
            { endAt: { $exists: false } },
            { endAt: { $gte: now } },
          ],
        },
      ],
    };

    const banners = await HomeHeroBanner.find(query)
      .sort({ sortOrder: 1, createdAt: -1 })
      .select(
        "_id title subtitle badgeText mediaType mediaUrl thumbnailUrl ctaLabel ctaAction ctaTarget placement isActive sortOrder startAt endAt overlayEnabled overlayColor overlayOpacity textColor contentAlignment"
      )
      .lean();

    return res.status(200).json({
      success: true,
      data: banners,
    });
  } catch (error) {
    console.error("getActiveHeroes error:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal memuat hero banner beranda.",
      error: error.message,
    });
  }
}

/**
 * 2. GET /api/admin/home-hero
 * Admin endpoint: lists all hero banners (active and inactive)
 */
async function getAdminHeroes(req, res) {
  try {
    const admin = await authenticateAdmin(req);
    const { placement, isActive, search } = req.query;

    const query = {};
    if (placement) query.placement = placement;
    if (isActive !== undefined && isActive !== "") {
      query.isActive = isActive === "true";
    }
    if (search && search.trim()) {
      query.$or = [
        { title: { $regex: search.trim(), $options: "i" } },
        { subtitle: { $regex: search.trim(), $options: "i" } },
        { badgeText: { $regex: search.trim(), $options: "i" } },
      ];
    }

    const banners = await HomeHeroBanner.find(query)
      .sort({ sortOrder: 1, createdAt: -1 })
      .populate("createdBy", "name email role")
      .populate("updatedBy", "name email role")
      .lean();

    return res.status(200).json({
      success: true,
      data: banners,
    });
  } catch (error) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Gagal memuat daftar hero banner admin.",
    });
  }
}

/**
 * 3. POST /api/admin/home-hero
 * Admin endpoint: creates a new hero banner
 */
async function createHero(req, res) {
  try {
    const admin = await authenticateAdmin(req);
    const {
      title,
      subtitle,
      badgeText,
      mediaType,
      mediaUrl,
      thumbnailUrl,
      ctaLabel,
      ctaAction,
      ctaTarget,
      placement,
      isActive,
      sortOrder,
      startAt,
      endAt,
      overlayEnabled,
      overlayColor,
      overlayOpacity,
      textColor,
      contentAlignment,
      singleActive,
    } = req.body;

    const bannerPlacement = placement || "CUSTOMER_HOME_HERO";

    // If banner is created as active and singleActive is set, deactivate existing active banners
    if (isActive && singleActive) {
      await HomeHeroBanner.updateMany(
        { placement: bannerPlacement, isActive: true },
        { $set: { isActive: false, updatedBy: admin._id } }
      );
    }

    const banner = new HomeHeroBanner({
      title,
      subtitle: subtitle || "",
      badgeText: badgeText || "",
      mediaType,
      mediaUrl,
      thumbnailUrl: thumbnailUrl || "",
      ctaLabel: ctaLabel || "",
      ctaAction: ctaAction || "NONE",
      ctaTarget: ctaTarget || "",
      placement: bannerPlacement,
      isActive: Boolean(isActive),
      sortOrder: Number(sortOrder) || 0,
      startAt: startAt ? new Date(startAt) : null,
      endAt: endAt ? new Date(endAt) : null,
      overlayEnabled: overlayEnabled !== undefined ? Boolean(overlayEnabled) : true,
      overlayColor: overlayColor || "#064E3B",
      overlayOpacity: overlayOpacity !== undefined ? Number(overlayOpacity) : 0.35,
      textColor: textColor || "#FFFFFF",
      contentAlignment: contentAlignment || "LEFT",
      createdBy: admin._id,
      updatedBy: admin._id,
    });

    await banner.save();

    return res.status(201).json({
      success: true,
      message: "Hero banner berhasil dibuat.",
      data: banner,
    });
  } catch (error) {
    console.error("createHero error:", error);
    const statusCode = error.name === "ValidationError" ? 400 : error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Gagal membuat hero banner.",
    });
  }
}

/**
 * 4. PUT /api/admin/home-hero/:id
 * Admin endpoint: updates an existing hero banner
 */
async function updateHero(req, res) {
  try {
    const admin = await authenticateAdmin(req);
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "ID banner tidak valid.",
      });
    }

    const banner = await HomeHeroBanner.findById(id);
    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Hero banner tidak ditemukan.",
      });
    }

    const {
      title,
      subtitle,
      badgeText,
      mediaType,
      mediaUrl,
      thumbnailUrl,
      ctaLabel,
      ctaAction,
      ctaTarget,
      placement,
      isActive,
      sortOrder,
      startAt,
      endAt,
      overlayEnabled,
      overlayColor,
      overlayOpacity,
      textColor,
      contentAlignment,
      singleActive,
    } = req.body;

    const targetPlacement = placement !== undefined ? placement : banner.placement;

    // If activating and singleActive is true, deactivate others
    if (isActive === true && singleActive) {
      await HomeHeroBanner.updateMany(
        { _id: { $ne: id }, placement: targetPlacement, isActive: true },
        { $set: { isActive: false, updatedBy: admin._id } }
      );
    }

    if (title !== undefined) banner.title = title;
    if (subtitle !== undefined) banner.subtitle = subtitle;
    if (badgeText !== undefined) banner.badgeText = badgeText;
    if (mediaType !== undefined) banner.mediaType = mediaType;
    if (mediaUrl !== undefined) banner.mediaUrl = mediaUrl;
    if (thumbnailUrl !== undefined) banner.thumbnailUrl = thumbnailUrl;
    if (ctaLabel !== undefined) banner.ctaLabel = ctaLabel;
    if (ctaAction !== undefined) banner.ctaAction = ctaAction;
    if (ctaTarget !== undefined) banner.ctaTarget = ctaTarget;
    if (placement !== undefined) banner.placement = placement;
    if (isActive !== undefined) banner.isActive = Boolean(isActive);
    if (sortOrder !== undefined) banner.sortOrder = Number(sortOrder) || 0;
    if (startAt !== undefined) banner.startAt = startAt ? new Date(startAt) : null;
    if (endAt !== undefined) banner.endAt = endAt ? new Date(endAt) : null;
    if (overlayEnabled !== undefined) banner.overlayEnabled = Boolean(overlayEnabled);
    if (overlayColor !== undefined) banner.overlayColor = overlayColor;
    if (overlayOpacity !== undefined) banner.overlayOpacity = Number(overlayOpacity);
    if (textColor !== undefined) banner.textColor = textColor;
    if (contentAlignment !== undefined) banner.contentAlignment = contentAlignment;
    banner.updatedBy = admin._id;

    await banner.save();

    return res.status(200).json({
      success: true,
      message: "Hero banner berhasil diperbarui.",
      data: banner,
    });
  } catch (error) {
    console.error("updateHero error:", error);
    const statusCode = error.name === "ValidationError" ? 400 : error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Gagal memperbarui hero banner.",
    });
  }
}

/**
 * 5. PATCH /api/admin/home-hero/:id/status
 * Admin endpoint: updates banner active status
 */
async function updateHeroStatus(req, res) {
  try {
    const admin = await authenticateAdmin(req);
    const { id } = req.params;
    const { isActive, singleActive } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "ID banner tidak valid.",
      });
    }

    const banner = await HomeHeroBanner.findById(id);
    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Hero banner tidak ditemukan.",
      });
    }

    const newActiveState = Boolean(isActive);

    // If activating and singleActive is true (or single hero rule), deactivate other banners
    if (newActiveState && singleActive) {
      await HomeHeroBanner.updateMany(
        { _id: { $ne: id }, placement: banner.placement, isActive: true },
        { $set: { isActive: false, updatedBy: admin._id } }
      );
    }

    banner.isActive = newActiveState;
    banner.updatedBy = admin._id;
    await banner.save();

    return res.status(200).json({
      success: true,
      message: `Hero banner berhasil ${newActiveState ? "diaktifkan" : "dinonaktifkan"}.`,
      data: banner,
    });
  } catch (error) {
    console.error("updateHeroStatus error:", error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Gagal mengubah status hero banner.",
    });
  }
}

/**
 * 6. DELETE /api/admin/home-hero/:id
 * Admin endpoint: deletes a hero banner
 */
async function deleteHero(req, res) {
  try {
    const admin = await authenticateAdmin(req);
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "ID banner tidak valid.",
      });
    }

    const banner = await HomeHeroBanner.findByIdAndDelete(id);
    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Hero banner tidak ditemukan.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Hero banner berhasil dihapus.",
      data: { id: banner._id },
    });
  } catch (error) {
    console.error("deleteHero error:", error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Gagal menghapus hero banner.",
    });
  }
}

/**
 * 7. POST /api/admin/home-hero/upload
 * Admin endpoint: uploads image or video to Cloudinary under 'geoverse/home-hero'
 */
async function uploadHeroMedia(req, res) {
  try {
    const admin = await authenticateAdmin(req);

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "File media wajib diunggah.",
      });
    }

    const { mimetype, size, path: tempFilePath, originalname } = req.file;

    // MIME type validation
    const allowedImageMimes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const allowedVideoMimes = ["video/mp4", "video/quicktime", "video/webm", "video/m4v"];

    const isImage = allowedImageMimes.includes(mimetype);
    const isVideo = allowedVideoMimes.includes(mimetype);

    if (!isImage && !isVideo) {
      return res.status(400).json({
        success: false,
        message:
          "Format file tidak didukung. Harap unggah gambar (JPG, PNG, WEBP) atau video (MP4, MOV, WEBM).",
      });
    }

    // Size limit validation: Image <= 10MB, Video <= 600MB
    const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
    const MAX_VIDEO_SIZE = 600 * 1024 * 1024;

    if (isImage && size > MAX_IMAGE_SIZE) {
      return res.status(400).json({
        success: false,
        message: "Ukuran file gambar maksimal 10 MB.",
      });
    }

    if (isVideo && size > MAX_VIDEO_SIZE) {
      return res.status(400).json({
        success: false,
        message: "Ukuran file video maksimal 30 MB.",
      });
    }

    const cleanBaseName = (originalname || "hero_media").replace(/[^a-zA-Z0-9._-]/g, "_");
    const fileName = `hero_${Date.now()}_${cleanBaseName}`;
    const resourceType = isVideo ? "video" : "image";

    console.log(`📤 [AdminHeroUpload] Uploading ${resourceType} '${fileName}' (${mimetype}, ${Math.round(size / 1024)} KB) to Cloudinary...`);

    const uploadResult = isVideo
      ? await uploadLargeVideo(tempFilePath, {
          folder: "geoverse/home-hero",
          public_id: path.parse(fileName).name,
          resource_type: resourceType,
          chunk_size: 20 * 1024 * 1024,
        })
      : await cloudinary.uploader.upload(tempFilePath, {
          folder: "geoverse/home-hero",
          public_id: path.parse(fileName).name,
          resource_type: resourceType,
        });

    // Check video duration limit (max 5 minutes)
    if (isVideo && uploadResult.duration && uploadResult.duration > 300.5) {
      // Cleanup uploaded video
      await cloudinary.uploader.destroy(uploadResult.public_id, { resource_type: "video" }).catch(() => {});
      return res.status(400).json({
        success: false,
        message: `Durasi video ${Math.round(uploadResult.duration)} detik melebihi batas maksimal 5 menit.`,
      });
    }

    // Derive thumbnail URL
    let thumbnailUrl = uploadResult.secure_url;
    if (isVideo) {
      // Cloudinary delivers high-res video poster frame by changing extension to .jpg
      thumbnailUrl = uploadResult.secure_url.replace(/\.[^/.]+$/, ".jpg");
    }

    console.log(`✅ [AdminHeroUpload] Success: ${uploadResult.secure_url}`);

    return res.status(200).json({
      success: true,
      message: "Media hero berhasil diunggah.",
      data: {
        url: uploadResult.secure_url,
        secureUrl: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        mediaType: isVideo ? "VIDEO" : "IMAGE",
        thumbnailUrl,
        width: uploadResult.width || null,
        height: uploadResult.height || null,
        duration: uploadResult.duration || null,
      },
    });
  } catch (error) {
    console.error("uploadHeroMedia error:", error);
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Gagal mengunggah media hero banner.",
    });
  } finally {
    if (req.file?.path) {
      await fs.promises.unlink(req.file.path).catch(() => {});
    }
  }
}

module.exports = {
  authenticateAdmin,
  getActiveHeroes,
  getAdminHeroes,
  createHero,
  updateHero,
  updateHeroStatus,
  deleteHero,
  uploadHeroMedia,
};

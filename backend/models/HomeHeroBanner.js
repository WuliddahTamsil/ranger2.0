/**
 * HomeHeroBanner.js
 * Model for Dynamic Homepage Hero Banners on Customer Beranda
 */

const mongoose = require("mongoose");

const homeHeroBannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Judul banner wajib diisi"],
      trim: true,
      maxlength: [120, "Judul banner maksimal 120 karakter"],
    },

    subtitle: {
      type: String,
      default: "",
      trim: true,
      maxlength: [240, "Subjudul banner maksimal 240 karakter"],
    },

    badgeText: {
      type: String,
      default: "",
      trim: true,
      maxlength: [40, "Teks badge maksimal 40 karakter"],
    },

    mediaType: {
      type: String,
      enum: {
        values: ["IMAGE", "VIDEO"],
        message: "Tipe media harus IMAGE atau VIDEO",
      },
      required: [true, "Tipe media wajib dipilih"],
    },

    mediaUrl: {
      type: String,
      required: [true, "URL media wajib diisi"],
      trim: true,
    },

    thumbnailUrl: {
      type: String,
      default: "",
      trim: true,
    },

    ctaLabel: {
      type: String,
      default: "",
      trim: true,
      maxlength: [40, "Label tombol CTA maksimal 40 karakter"],
    },

    ctaAction: {
      type: String,
      enum: {
        values: ["NONE", "NAVIGATE", "OPEN_URL"],
        message: "Aksi CTA harus NONE, NAVIGATE, atau OPEN_URL",
      },
      default: "NONE",
    },

    ctaTarget: {
      type: String,
      default: "",
      trim: true,
    },

    placement: {
      type: String,
      enum: ["CUSTOMER_HOME_HERO"],
      default: "CUSTOMER_HOME_HERO",
      index: true,
    },

    isActive: {
      type: Boolean,
      default: false,
      index: true,
    },

    sortOrder: {
      type: Number,
      default: 0,
      index: true,
    },

    startAt: {
      type: Date,
      default: null,
    },

    endAt: {
      type: Date,
      default: null,
    },

    overlayEnabled: {
      type: Boolean,
      default: false,
    },

    overlayColor: {
      type: String,
      default: "transparent",
      trim: true,
    },

    overlayOpacity: {
      type: Number,
      default: 0,
      min: [0, "Overlay opacity minimal 0"],
      max: [1, "Overlay opacity maksimal 1"],
    },

    textColor: {
      type: String,
      default: "#FFFFFF",
      trim: true,
    },

    contentAlignment: {
      type: String,
      enum: {
        values: ["LEFT", "CENTER", "RIGHT"],
        message: "Posisi konten harus LEFT, CENTER, atau RIGHT",
      },
      default: "LEFT",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Pembuat banner wajib tercatat"],
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Validasi URL dan integritas data
homeHeroBannerSchema.pre("validate", function (next) {
  // Validasi URL
  if (this.mediaUrl) {
    const urlPattern = /^https?:\/\/.+/i;
    if (!urlPattern.test(this.mediaUrl)) {
      this.invalidate("mediaUrl", "URL media harus berupa URL HTTP/HTTPS yang valid");
    }
  }

  // Validasi format file untuk IMAGE vs VIDEO
  if (this.mediaUrl && this.mediaType) {
    const cleanUrl = this.mediaUrl.toLowerCase().split("?")[0];
    const imageExtensions = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"];
    const videoExtensions = [".mp4", ".mov", ".webm", ".m4v", ".avi", ".mkv"];

    const isCloudinaryImage = this.mediaUrl.includes("/image/upload/");
    const isCloudinaryVideo = this.mediaUrl.includes("/video/upload/");

    if (this.mediaType === "IMAGE") {
      const hasImageExt = imageExtensions.some((ext) => cleanUrl.endsWith(ext));
      if (!hasImageExt && !isCloudinaryImage && videoExtensions.some((ext) => cleanUrl.endsWith(ext))) {
        this.invalidate("mediaUrl", "URL media harus berupa file gambar untuk tipe IMAGE");
      }
    } else if (this.mediaType === "VIDEO") {
      const hasVideoExt = videoExtensions.some((ext) => cleanUrl.endsWith(ext));
      if (!hasVideoExt && !isCloudinaryVideo && imageExtensions.some((ext) => cleanUrl.endsWith(ext))) {
        this.invalidate("mediaUrl", "URL media harus berupa file video untuk tipe VIDEO");
      }
    }
  }

  // ctaTarget wajib diisi jika ctaAction bukan NONE
  if (this.ctaAction && this.ctaAction !== "NONE") {
    if (!this.ctaTarget || !this.ctaTarget.trim()) {
      this.invalidate("ctaTarget", "Target CTA wajib diisi jika tombol CTA diaktifkan");
    }
  }

  // endAt tidak boleh lebih kecil daripada startAt
  if (this.startAt && this.endAt) {
    if (new Date(this.endAt) < new Date(this.startAt)) {
      this.invalidate("endAt", "Waktu selesai tayang tidak boleh lebih awal daripada waktu mulai");
    }
  }

  next();
});

const HomeHeroBanner = mongoose.models.HomeHeroBanner || mongoose.model("HomeHeroBanner", homeHeroBannerSchema);

module.exports = HomeHeroBanner;

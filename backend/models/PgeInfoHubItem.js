const mongoose = require("mongoose");

const pgeInfoHubItemSchema = new mongoose.Schema(
  {
    itemId: {
      type: String,
      unique: true,
      sparse: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
      enum: [
        "Company Profile",
        "CSR",
        "Acara",
        "Kegiatan Komunitas",
        "Pengumuman",
        "Safety Alert",
      ],
      default: "Company Profile",
    },
    description: {
      type: String,
      required: true,
    },
    body: {
      type: String,
      default: "",
    },
    imageUrl: {
      type: String,
      default: "",
    },
    videoUrl: {
      type: String,
      default: "",
    },
    posterUrl: {
      type: String,
      default: "",
    },
    authorOrDept: {
      type: String,
      default: "Corporate Communication & CSR PGE Kamojang",
    },
    location: {
      type: String,
      default: "Kamojang, Samarang, Kabupaten Garut",
    },
    eventDate: {
      type: String,
      default: "",
    },
    eventStartAt: {
      type: Date,
      default: null,
    },
    eventEndAt: {
      type: Date,
      default: null,
    },
    tags: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: [
        "DRAFT",
        "PENDING_APPROVAL",
        "APPROVED",
        "PUBLISHED",
        "UNPUBLISHED",
        "ARCHIVED",
      ],
      default: "PUBLISHED",
    },
    isPublished: {
      type: Boolean,
      default: true,
    },
    publishedAt: {
      type: Date,
      default: Date.now,
    },
    scheduledPublishAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: "",
    },
    createdBy: {
      type: String,
      default: "admin",
    },
    approvedBy: {
      type: String,
      default: "Humas & CSR PGE Area Kamojang",
    },
    auditTrail: [
      {
        action: { type: String, required: true },
        actorId: { type: String, default: "system" },
        note: { type: String, default: "" },
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

pgeInfoHubItemSchema.index({ isPublished: 1, category: 1, publishedAt: -1 });

module.exports = mongoose.model("PgeInfoHubItem", pgeInfoHubItemSchema);

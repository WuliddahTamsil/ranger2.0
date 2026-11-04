const mongoose = require("mongoose");

const geoDirectAuditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      index: true,
    }, // e.g. "BOOKING_CREATED", "PAYMENT_UPLOADED", "PAYMENT_VERIFIED", "PAYMENT_REJECTED", "BOOKING_APPROVED", "BOOKING_REJECTED", "DP_CREDITED", "INVOICE_GENERATED"
    bookingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GeoDirectBooking",
      index: true,
    },
    bookingCode: {
      type: String,
      index: true,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    actorRole: {
      type: String,
      default: "customer",
    },
    actorName: {
      type: String,
      default: "",
    },
    previousStatus: {
      bookingStatus: String,
      paymentStatus: String,
    },
    newStatus: {
      bookingStatus: String,
      paymentStatus: String,
    },
    notes: {
      type: String,
      default: "",
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

geoDirectAuditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("GeoDirectAuditLog", geoDirectAuditLogSchema);


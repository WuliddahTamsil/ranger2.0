const mongoose = require("mongoose");
const User = require("../models/User");
const MarketplaceOrder = require("../models/MarketplaceOrder");
const CateringOrder = require("../models/CateringOrder");
const LaundryOrder = require("../models/LaundryOrder");
const Booking = require("../models/Booking");
const RideOrder = require("../models/RideOrder");
const SendOrder = require("../models/SendOrder");
const Kost = require("../models/Kost");

const ownerRoles = new Set([
  "pemilik_marketplace",
  "pemilik_shop",
  "pemilik_catering",
  "pemilik_laundry",
  "pemilik_kos",
  "bank_sampah",
]);

const findOrderByIdentifier = async (identifier) => {
  if (!identifier) return null;
  const value = String(identifier).trim();
  const cleanValue = value.replace(/^#/, "").trim();

  const models = [
    [MarketplaceOrder, "marketplace", "orderCode"],
    [CateringOrder, "catering", "orderCode"],
    [LaundryOrder, "laundry", "orderCode"],
    [Booking, "kos", "bookingCode"],
    [RideOrder, "ride", "orderCode"],
    [SendOrder, "send", "orderCode"],
  ];

  for (const [Model, orderType, codeField] of models) {
    let order = null;
    if (mongoose.Types.ObjectId.isValid(value)) {
      order = await Model.findById(value).lean().catch(() => null);
    }
    if (!order && mongoose.Types.ObjectId.isValid(cleanValue)) {
      order = await Model.findById(cleanValue).lean().catch(() => null);
    }
    if (!order) order = await Model.findOne({ [codeField]: value }).lean().catch(() => null);
    if (!order) order = await Model.findOne({ [codeField]: cleanValue }).lean().catch(() => null);
    if (!order && cleanValue.length >= 6) {
      const escaped = cleanValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      order = await Model.findOne({ [codeField]: new RegExp(escaped + "$", "i") }).lean().catch(() => null);
      if (!order && /^[0-9a-fA-F]+$/.test(cleanValue)) {
        order = await Model.findOne({
          $expr: {
            $regexMatch: {
              input: { $toString: "$_id" },
              regex: `${cleanValue}$`,
              options: "i",
            },
          },
        }).lean().catch(() => null);
      }
    }
    if (order) return { order, orderType, codeField };
  }

  // Fallback: Check Kost / Lodging inquiry by Kost ID, name, or inquiry token
  let kost = null;
  if (mongoose.Types.ObjectId.isValid(value)) {
    kost = await Kost.findById(value).lean().catch(() => null);
  }
  if (!kost) kost = await Kost.findOne({ name: new RegExp(value.replace(/[-_]/g, " "), "i") }).lean().catch(() => null);
  if (!kost && (value.includes("unit-") || value.includes("kost") || value.includes("homestay") || value.includes("hotel") || value.includes("wisata") || value === "kost_chat_inquiry")) {
    kost = await Kost.findOne().lean().catch(() => null);
  }
  if (kost) {
    return { order: kost, orderType: "kos", codeField: "name", isPropertyInquiry: true };
  }

  return null;
};

const idToString = (val) => {
  if (!val) return "";
  if (typeof val === "object" && val._id) return String(val._id);
  return String(val);
};

const normalizeRole = (role) => {
  const r = String(role || "").toLowerCase().trim();
  if (
    [
      "pemilik_marketplace",
      "pemilik_shop",
      "pemilik_catering",
      "pemilik_laundry",
      "pemilik_kos",
      "bank_sampah",
      "store",
      "merchant",
    ].includes(r)
  ) {
    return "owner";
  }
  return r;
};

const resolveChatChannel = (sender, target) => {
  const s = normalizeRole(sender);
  const t = normalizeRole(target);
  if ((s === "customer" && t === "driver") || (s === "driver" && t === "customer")) {
    return "customer_driver";
  }
  if ((s === "driver" && t === "owner") || (s === "owner" && t === "driver")) {
    return "driver_owner";
  }
  if ((s === "customer" && t === "owner") || (s === "owner" && t === "customer")) {
    return "customer_owner";
  }
  return "general";
};

const getOrderParticipants = (record) => {
  const order = record.order;
  if (record.isPropertyInquiry) {
    return {
      customerId: "",
      ownerId: idToString(order.ownerId),
      driverId: "",
      driverIds: [],
      storeId: "",
      orderCode: String(order.name || "Kost & Homestay"),
      status: "inquiry",
    };
  }

  const driverIds = [
    idToString(order.driverId),
    idToString(order.driverPickupId),
    idToString(order.driverDeliveryId),
  ]
    .filter(Boolean)
    .filter((value, index, list) => list.indexOf(value) === index);

  return {
    customerId: idToString(order.customerId),
    ownerId: idToString(order.ownerId),
    driverId: driverIds[0] || "",
    driverIds,
    storeId: idToString(order.storeId),
    orderCode: String(order.orderCode || order.bookingCode || ""),
    status: String(order.status || order.paymentStatus || ""),
  };
};

const resolveParticipant = async (userId, record) => {
  const user = await User.findById(userId).lean().catch(() => null);
  if (!user) return null;
  const participants = getOrderParticipants(record);
  const id = String(user._id);

  if (record.isPropertyInquiry) {
    if (user.role === "customer" || user.role === "admin") {
      let ownerId = participants.ownerId;
      if (!ownerId || !mongoose.Types.ObjectId.isValid(ownerId)) {
        const ownerUser = await User.findOne({ role: "pemilik_kos" }).lean().catch(() => null);
        if (ownerUser) ownerId = String(ownerUser._id);
      }
      return { role: "customer", user, ...participants, customerId: String(user._id), ownerId: ownerId || String(user._id) };
    }
    if (ownerRoles.has(user.role)) {
      let customerId = participants.customerId;
      if (!customerId || !mongoose.Types.ObjectId.isValid(customerId)) {
        const custUser = await User.findOne({ role: "customer" }).lean().catch(() => null);
        if (custUser) customerId = String(custUser._id);
      }
      return { role: "owner", user, ...participants, ownerId: String(user._id), customerId: customerId || String(user._id) };
    }
  }

  if (user.role === "admin") {
    return { role: "admin", user, ...participants, isAdmin: true };
  }

  if (user.role === "customer") {
    if (!participants.customerId || id === participants.customerId) {
      return { role: "customer", user, ...participants };
    }
  }

  if (user.role === "driver") {
    if (participants.driverIds.length === 0 || participants.driverIds.includes(id)) {
      return { role: "driver", user, ...participants };
    }
  }

  if (ownerRoles.has(user.role)) {
    if (!participants.ownerId || id === participants.ownerId) {
      return { role: "owner", user, ...participants };
    }
  }

  return null;
};

const resolveReceiverId = (participant, target) => {
  let normalizedTarget = normalizeRole(target);
  if (!normalizedTarget) {
    if (participant.role === "driver") {
      normalizedTarget = participant.customerId ? "customer" : "owner";
    } else if (participant.role === "customer") {
      normalizedTarget = participant.driverId ? "driver" : "owner";
    } else {
      normalizedTarget = participant.customerId ? "customer" : "driver";
    }
  }

  if (participant.role === "customer") {
    if (normalizedTarget === "driver") return participant.driverId || participant.ownerId || null;
    if (normalizedTarget === "owner") return participant.ownerId || participant.driverId || null;
  }
  if (participant.role === "owner") {
    if (normalizedTarget === "driver") return participant.driverId || participant.customerId || null;
    if (normalizedTarget === "customer") return participant.customerId || participant.driverId || null;
  }
  if (participant.role === "driver") {
    if (normalizedTarget === "owner") return participant.ownerId || participant.customerId || null;
    if (normalizedTarget === "customer") return participant.customerId || participant.ownerId || null;
  }

  return participant.customerId || participant.driverId || participant.ownerId || null;
};

const isArchivedStatus = (status) => [
  "dibatalkan",
  "cancelled",
  "batal",
].includes(String(status || "").toLowerCase());

module.exports = {
  findOrderByIdentifier,
  getOrderParticipants,
  resolveParticipant,
  resolveReceiverId,
  resolveChatChannel,
  normalizeRole,
  isArchivedStatus,
};

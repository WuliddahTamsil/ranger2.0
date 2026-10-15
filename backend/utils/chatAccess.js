const mongoose = require("mongoose");
const User = require("../models/User");
const ShopOrder = require("../models/ShopOrder");
const MarketplaceOrder = require("../models/MarketplaceOrder");
const CateringOrder = require("../models/CateringOrder");
const LaundryOrder = require("../models/LaundryOrder");
const Booking = require("../models/Booking");
const RideOrder = require("../models/RideOrder");
const SendOrder = require("../models/SendOrder");
const WasteDeposit = require("../models/WasteDeposit");
const Kost = require("../models/Kost");
const Conversation = require("../models/Conversation");

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
    [ShopOrder, "shop", "orderCode"],
    [MarketplaceOrder, "marketplace", "orderCode"],
    [CateringOrder, "catering", "orderCode"],
    [LaundryOrder, "laundry", "orderCode"],
    [Booking, "kos", "bookingCode"],
    [RideOrder, "ride", "orderCode"],
    [SendOrder, "send", "orderCode"],
    [WasteDeposit, "waste", "depositCode"],
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

  // Fallback 1: Existing Conversation check
  const existingConv = await Conversation.findOne({
    $or: [{ orderId: value }, { orderId: cleanValue }, { orderCode: value }, { orderCode: cleanValue }],
  }).lean().catch(() => null);
  if (existingConv) {
    return {
      order: {
        _id: existingConv.orderId,
        orderCode: existingConv.orderCode || existingConv.orderId,
        customerId: existingConv.customerId,
        ownerId: existingConv.ownerId,
        storeId: existingConv.storeId,
        driverId: existingConv.driverId,
        driverIds: existingConv.driverIds || [],
        status: existingConv.status || "active",
      },
      orderType: existingConv.orderType || "general",
      codeField: "orderCode",
      isInquiry:
        existingConv.status === "inquiry" ||
        !existingConv.customerId ||
        !existingConv.ownerId ||
        String(existingConv.orderId).includes("_chat"),
    };
  }

  // Fallback 2: Check Kost / Lodging inquiry by Kost ID, name, or inquiry token
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

  // Fallback 3: Generic inquiry or direct chat room token
  const knownPrefixes = [
    "laundry",
    "send",
    "shop",
    "catering",
    "ride",
    "market",
    "marketplace",
    "kost",
    "homestay",
    "waste",
    "chat",
  ];
  const matchedPrefix = knownPrefixes.find(
    (p) => value.toLowerCase().startsWith(`${p}_`) || value.toLowerCase().startsWith(p)
  );
  if (
    matchedPrefix ||
    value.includes("_chat") ||
    value.includes("chat_") ||
    value.includes("inquiry") ||
    value.includes("test")
  ) {
    const inferredType =
      matchedPrefix === "market" || matchedPrefix === "marketplace"
        ? "marketplace"
        : matchedPrefix === "homestay"
        ? "kos"
        : matchedPrefix || "general";
    return {
      order: {
        _id: value,
        orderCode: value,
        status: "inquiry",
      },
      orderType: inferredType,
      codeField: "orderCode",
      isInquiry: true,
    };
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

  if (record.isInquiry) {
    return {
      customerId: idToString(order.customerId),
      ownerId: idToString(order.ownerId),
      driverId: idToString(order.driverId),
      driverIds: order.driverId ? [idToString(order.driverId)] : [],
      storeId: idToString(order.storeId),
      orderCode: String(order.orderCode || record.order._id),
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
    ownerId: idToString(order.ownerId || order.storeOwnerId || order.bankSampahId || (typeof order.storeId === "object" ? order.storeId?.ownerId : "")),
    driverId: driverIds[0] || "",
    driverIds,
    storeId: idToString(order.storeId || order.bankSampahId),
    orderCode: String(order.orderCode || order.bookingCode || order.depositCode || ""),
    status: String(order.orderStatus || order.status || order.paymentStatus || ""),
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

  if (record.isInquiry) {
    if (user.role === "customer" || user.role === "admin") {
      let ownerId = participants.ownerId;
      if (!ownerId || !mongoose.Types.ObjectId.isValid(ownerId)) {
        const ownerRole =
          record.orderType === "laundry" ? "pemilik_laundry" :
          record.orderType === "shop" ? "pemilik_shop" :
          record.orderType === "catering" ? "pemilik_catering" :
          record.orderType === "waste" ? "bank_sampah" : null;
        if (ownerRole) {
          const ownerUser = await User.findOne({ role: ownerRole }).lean().catch(() => null);
          if (ownerUser) ownerId = String(ownerUser._id);
        }
        if (!ownerId) {
          const anyOwner = await User.findOne({ role: { $in: Array.from(ownerRoles) } }).lean().catch(() => null);
          if (anyOwner) ownerId = String(anyOwner._id);
        }
      }
      let driverId = participants.driverId;
      if (!driverId || !mongoose.Types.ObjectId.isValid(driverId)) {
        const existing = await Conversation.findOne({ orderId: String(record.order._id) }).lean().catch(() => null);
        if (existing?.driverId) driverId = String(existing.driverId);
      }
      if (!driverId || !mongoose.Types.ObjectId.isValid(driverId)) {
        const driverUser = await User.findOne({ role: "driver" }).lean().catch(() => null);
        if (driverUser) driverId = String(driverUser._id);
      }
      return {
        role: "customer",
        user,
        ...participants,
        customerId: String(user._id),
        ownerId: ownerId || String(user._id),
        driverId: driverId || "",
        driverIds: driverId ? [driverId] : [],
      };
    }
    if (ownerRoles.has(user.role)) {
      let customerId = participants.customerId;
      if (!customerId || !mongoose.Types.ObjectId.isValid(customerId)) {
        const existing = await Conversation.findOne({ orderId: String(record.order._id) }).lean().catch(() => null);
        if (existing?.customerId) customerId = String(existing.customerId);
      }
      if (!customerId || !mongoose.Types.ObjectId.isValid(customerId)) {
        const custUser = await User.findOne({ role: "customer" }).lean().catch(() => null);
        if (custUser) customerId = String(custUser._id);
      }
      let driverId = participants.driverId;
      if (!driverId || !mongoose.Types.ObjectId.isValid(driverId)) {
        const driverUser = await User.findOne({ role: "driver" }).lean().catch(() => null);
        if (driverUser) driverId = String(driverUser._id);
      }
      return {
        role: "owner",
        user,
        ...participants,
        ownerId: String(user._id),
        customerId: customerId || String(user._id),
        driverId: driverId || "",
        driverIds: driverId ? [driverId] : [],
      };
    }
    if (user.role === "driver") {
      let customerId = participants.customerId;
      if (!customerId || !mongoose.Types.ObjectId.isValid(customerId)) {
        const existing = await Conversation.findOne({ orderId: String(record.order._id) }).lean().catch(() => null);
        if (existing?.customerId) customerId = String(existing.customerId);
      }
      if (!customerId || !mongoose.Types.ObjectId.isValid(customerId)) {
        const custUser = await User.findOne({ role: "customer" }).lean().catch(() => null);
        if (custUser) customerId = String(custUser._id);
      }
      let ownerId = participants.ownerId;
      if (!ownerId || !mongoose.Types.ObjectId.isValid(ownerId)) {
        const anyOwner = await User.findOne({ role: { $in: Array.from(ownerRoles) } }).lean().catch(() => null);
        if (anyOwner) ownerId = String(anyOwner._id);
      }
      return {
        role: "driver",
        user,
        ...participants,
        driverId: String(user._id),
        driverIds: [String(user._id)],
        customerId: customerId || "",
        ownerId: ownerId || "",
      };
    }
  }

  if (user.role === "admin") {
    return { role: "admin", user, ...participants, isAdmin: true };
  }

  if (user.role === "customer") {
    if (!participants.customerId || id === participants.customerId) {
      let driverId = participants.driverId;
      if (!driverId) {
        const drv = await User.findOne({ role: "driver" }).lean().catch(() => null);
        if (drv) driverId = String(drv._id);
      }
      let ownerId = participants.ownerId;
      if (!ownerId) {
        const own = await User.findOne({ role: { $in: Array.from(ownerRoles) } }).lean().catch(() => null);
        if (own) ownerId = String(own._id);
      }
      return {
        role: "customer",
        user,
        ...participants,
        customerId: String(user._id),
        driverId: driverId || "",
        ownerId: ownerId || "",
      };
    }
  }

  if (user.role === "driver") {
    if (participants.driverIds.length === 0 || participants.driverIds.includes(id)) {
      let customerId = participants.customerId;
      if (!customerId) {
        const cust = await User.findOne({ role: "customer" }).lean().catch(() => null);
        if (cust) customerId = String(cust._id);
      }
      let ownerId = participants.ownerId;
      if (!ownerId) {
        const own = await User.findOne({ role: { $in: Array.from(ownerRoles) } }).lean().catch(() => null);
        if (own) ownerId = String(own._id);
      }
      return {
        role: "driver",
        user,
        ...participants,
        driverId: String(user._id),
        driverIds: [String(user._id)],
        customerId: customerId || "",
        ownerId: ownerId || "",
      };
    }
  }

  if (ownerRoles.has(user.role)) {
    if (!participants.ownerId || id === participants.ownerId) {
      let customerId = participants.customerId;
      if (!customerId) {
        const cust = await User.findOne({ role: "customer" }).lean().catch(() => null);
        if (cust) customerId = String(cust._id);
      }
      let driverId = participants.driverId;
      if (!driverId) {
        const drv = await User.findOne({ role: "driver" }).lean().catch(() => null);
        if (drv) driverId = String(drv._id);
      }
      return {
        role: "owner",
        user,
        ...participants,
        ownerId: String(user._id),
        customerId: customerId || "",
        driverId: driverId || "",
      };
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

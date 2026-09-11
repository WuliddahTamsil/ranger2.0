const mongoose = require("mongoose");
const User = require("../models/User");
const MarketplaceOrder = require("../models/MarketplaceOrder");
const CateringOrder = require("../models/CateringOrder");
const LaundryOrder = require("../models/LaundryOrder");
const Booking = require("../models/Booking");

const ownerRoles = new Set([
  "pemilik_marketplace",
  "pemilik_catering",
  "pemilik_laundry",
  "pemilik_kos",
]);

const findOrderByIdentifier = async (identifier) => {
  if (!identifier) return null;
  const value = String(identifier);
  const models = [
    [MarketplaceOrder, "marketplace", "orderCode"],
    [CateringOrder, "catering", "orderCode"],
    [LaundryOrder, "laundry", "orderCode"],
    [Booking, "kos", "bookingCode"],
  ];

  for (const [Model, orderType, codeField] of models) {
    let order = null;
    if (mongoose.Types.ObjectId.isValid(value)) {
      order = await Model.findById(value).lean().catch(() => null);
    }
    if (!order) order = await Model.findOne({ [codeField]: value }).lean().catch(() => null);
    if (order) return { order, orderType, codeField };
  }
  return null;
};

const getOrderParticipants = (record) => {
  const order = record.order;
  const driverIds = [order.driverId, order.driverPickupId, order.driverDeliveryId]
    .filter(Boolean)
    .map(String)
    .filter((value, index, list) => list.indexOf(value) === index);

  return {
    customerId: String(order.customerId || ""),
    ownerId: String(order.ownerId || ""),
    driverId: driverIds[0] || "",
    driverIds,
    storeId: String(order.storeId || ""),
    orderCode: String(order.orderCode || order.bookingCode || ""),
    status: String(order.status || order.paymentStatus || ""),
  };
};

const resolveParticipant = async (userId, record) => {
  const user = await User.findById(userId).lean().catch(() => null);
  if (!user) return null;
  const participants = getOrderParticipants(record);
  const id = String(user._id);

  if (user.role === "customer" && id === participants.customerId) {
    return { role: "customer", user, ...participants };
  }
  if (user.role === "driver" && participants.driverIds.includes(id)) {
    return { role: "driver", user, ...participants };
  }
  if (ownerRoles.has(user.role) && id === participants.ownerId) {
    return { role: "owner", user, ...participants };
  }
  return null;
};

const resolveReceiverId = (participant, target) => {
  const normalizedTarget = target || (participant.role === "driver" ? "customer" : "owner");
  if (normalizedTarget === participant.role) return null;

  if (participant.role === "customer") {
    if (normalizedTarget === "driver") return participant.driverId || null;
    if (normalizedTarget === "owner") return participant.ownerId || null;
  }
  if (participant.role === "owner") {
    if (normalizedTarget === "driver") return participant.driverId || null;
    if (normalizedTarget === "customer") return participant.customerId || null;
  }
  if (participant.role === "driver") {
    if (normalizedTarget === "owner") return participant.ownerId || null;
    if (normalizedTarget === "customer") return participant.customerId || null;
  }
  return null;
};

const isArchivedStatus = (status) => [
  "selesai",
  "dibatalkan",
  "completed",
  "cancelled",
  "batal",
].includes(String(status || "").toLowerCase());

module.exports = {
  findOrderByIdentifier,
  getOrderParticipants,
  resolveParticipant,
  resolveReceiverId,
  isArchivedStatus,
};

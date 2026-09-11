const Conversation = require("../models/Conversation");

const syncConversationForOrder = async (order, orderType) => {
  const driverIds = [order.driverId, order.driverPickupId, order.driverDeliveryId]
    .filter(Boolean)
    .map(String)
    .filter((value, index, list) => list.indexOf(value) === index);

  return Conversation.findOneAndUpdate(
    { orderId: String(order._id) },
    {
      $set: {
        orderType,
        orderCode: String(order.orderCode || order.bookingCode || ""),
        customerId: String(order.customerId || ""),
        ownerId: String(order.ownerId || ""),
        storeId: String(order.storeId || ""),
        driverId: driverIds[0] || "",
        driverIds,
        status: String(order.status || order.paymentStatus || ""),
        archived: ["selesai", "dibatalkan", "completed", "cancelled", "batal"].includes(
          String(order.status || order.paymentStatus || "").toLowerCase()
        ),
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
};

module.exports = { syncConversationForOrder };

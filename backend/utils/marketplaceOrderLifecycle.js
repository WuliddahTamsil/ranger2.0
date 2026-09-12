const DRIVER_TRANSITIONS = Object.freeze({
  "Menuju Pickup": "Sampai Pickup",
  "Sampai Pickup": "Mengantar",
  "Mengantar": "Selesai",
});

const OWNER_TRANSITIONS = Object.freeze({
  Menunggu: ["Diproses", "Dibatalkan"],
  Diproses: ["Siap", "Dibatalkan"],
});

const getMarketplaceTransition = (role, currentStatus, nextStatus) => {
  if (role === "driver") return DRIVER_TRANSITIONS[currentStatus] === nextStatus;
  if (role === "pemilik_marketplace") return (OWNER_TRANSITIONS[currentStatus] || []).includes(nextStatus);
  return false;
};

const getMarketplaceStatusNotification = (status, orderCode, driverName = "Driver") => {
  const code = orderCode || "pesanan Marketplace";
  const notifications = {
    "Menuju Pickup": {
      title: "Driver Menuju Toko",
      message: `${driverName} sedang menuju toko untuk mengambil ${code}.`,
      recipients: ["owner", "customer"],
    },
    "Sampai Pickup": {
      title: "Driver Telah Tiba di Toko",
      message: `${driverName} telah tiba untuk mengambil ${code}.`,
      recipients: ["owner"],
    },
    Mengantar: {
      title: "Pesanan Sedang Diantar",
      message: `${code} telah diambil driver dan sedang diantar kepada pelanggan.`,
      recipients: ["owner", "customer"],
    },
    Selesai: {
      title: "Pesanan Selesai Diantar",
      message: `${code} telah sampai kepada pelanggan.`,
      recipients: ["owner", "customer"],
    },
  };
  return notifications[status] || null;
};

module.exports = { DRIVER_TRANSITIONS, OWNER_TRANSITIONS, getMarketplaceTransition, getMarketplaceStatusNotification };

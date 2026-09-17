const cateringMonths = new Map([
  ["januari", 1], ["februari", 2], ["maret", 3], ["april", 4],
  ["mei", 5], ["juni", 6], ["juli", 7], ["agustus", 8],
  ["september", 9], ["oktober", 10], ["november", 11], ["desember", 12],
]);

const OWNER_TRANSITIONS = Object.freeze({
  Menunggu: ["Diproses", "Dibatalkan"],
  Diproses: ["Siap", "Dibatalkan"],
});

const DRIVER_TRANSITIONS = Object.freeze({
  "Menuju Pickup": "Sampai Pickup",
  "Sampai Pickup": "Mengantar",
  Mengantar: "Selesai",
});

const isCateringPaymentComplete = (order) =>
  Number(order?.remainingAmount || 0) <= 0 && String(order?.paymentStatus || "").toLowerCase() === "lunas";

const getPaymentPlan = (totalAmount, paymentOption) => {
  const total = Math.max(0, Math.round(Number(totalAmount) || 0));
  const percent = paymentOption === "dp30" ? 30 : paymentOption === "dp50" ? 50 : 100;
  const depositAmount = percent === 100 ? total : Math.round(total * percent / 100);
  return {
    percent,
    depositAmount,
    remainingAfterDeposit: Math.max(0, total - depositAmount),
  };
};

const getCateringDueAt = (dateText) => {
  const match = String(dateText || "").match(/^\s*(?:[A-Za-z]+,\s*)?(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})\s*$/);
  if (!match) return null;
  const month = cateringMonths.get(match[2].toLowerCase());
  if (!month) return null;
  const due = new Date(Date.UTC(Number(match[3]), month - 1, Number(match[1]), 10, 0, 0));
  due.setUTCDate(due.getUTCDate() - 1);
  return due;
};

const getPaymentStatusLabel = (order, paidAmount = order?.paidAmount) => {
  const paid = Math.max(0, Math.round(Number(paidAmount) || 0));
  const total = Math.max(0, Math.round(Number(order?.totalAmount) || 0));
  if (String(order?.status || "") === "Dibatalkan") return "Dibatalkan";
  if (total > 0 && paid >= total) return "Lunas";
  if (paid > 0) return "Menunggu Pelunasan";
  return "Menunggu Pembayaran";
};

const getPaymentReminder = (order) => {
  const remaining = Math.max(0, Math.round(Number(order?.remainingAmount) || 0));
  if (!remaining) return "Pembayaran sudah lunas. Driver dapat mengantar pesanan.";
  const dueAt = order?.paymentDueAt ? new Date(order.paymentDueAt) : null;
  const dueText = dueAt && !Number.isNaN(dueAt.getTime())
    ? dueAt.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric", timeZone: "Asia/Jakarta" })
    : "H-1 sebelum pengiriman";
  return `Sisa ${remaining.toLocaleString("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 })}. Lunasi paling lambat ${dueText}.`;
};

module.exports = {
  DRIVER_TRANSITIONS,
  OWNER_TRANSITIONS,
  isCateringPaymentComplete,
  getPaymentPlan,
  getCateringDueAt,
  getPaymentStatusLabel,
  getPaymentReminder,
};

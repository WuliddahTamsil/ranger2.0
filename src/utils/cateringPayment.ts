import { CateringPaymentOption, OrderItem } from "../types";

export interface CateringPaymentBreakdown {
  paidAmount: number;
  remainingAmount: number;
  dpPercent: 30 | 50 | 100;
  optionLabel: string;
}

export const getCateringPaymentBreakdown = (
  totalPrice: number,
  paymentOption: CateringPaymentOption,
): CateringPaymentBreakdown => {
  const total = Math.max(0, Math.round(totalPrice));
  const dpPercent = paymentOption === "dp30" ? 30 : paymentOption === "dp50" ? 50 : 100;
  const paidAmount = dpPercent === 100 ? total : Math.round(total * (dpPercent / 100));

  return {
    paidAmount,
    remainingAmount: total - paidAmount,
    dpPercent,
    optionLabel: dpPercent === 100 ? "Lunas" : `DP ${dpPercent}%`,
  };
};

export const createCateringOrder = ({
  cateringPO,
  paymentOption,
  paymentMethod,
  paymentReference,
}: {
  cateringPO: any;
  paymentOption: CateringPaymentOption;
  paymentMethod: string;
  paymentReference?: string;
}): OrderItem => {
  const totalPrice = Number(cateringPO.totalPrice) || 0;
  const deliveryFee = Number(cateringPO.shippingFee) || 0;
  const tip = Number(cateringPO.tip) || 0;
  const discount = Number(cateringPO.discount) || 0;
  const breakdown = getCateringPaymentBreakdown(totalPrice, paymentOption);
  const isTumpeng = cateringPO.package.cat === "Tumpeng";
  const unitLabel = isTumpeng ? "Unit" : "Pax";
  const orderId = `PO-${Math.floor(1000 + Math.random() * 9000)}`;
  const bookingDate = cateringPO.bookingDate || "Hari Ini";
  const paymentReminder = breakdown.remainingAmount > 0
    ? `Selesaikan pelunasan ${formatRupiah(breakdown.remainingAmount)} paling lambat H-1 sebelum pengiriman (${bookingDate}).`
    : undefined;

  return {
    id: orderId,
    type: "Catering",
    iconName: "Coffee",
    color: "#FF7043",
    item: `${cateringPO.package.name} (${cateringPO.paxCount} ${unitLabel})`,
    detail: cateringPO.merchant.name,
    status: "Diproses",
    statusColor: "orange",
    date: bookingDate,
    total: totalPrice,
    deliveryFee,
    serviceFee: tip,
    discount,
    paymentMethod,
    paymentStatus: breakdown.remainingAmount > 0 ? "Menunggu Pelunasan" : "Lunas",
    paymentOption,
    paidAmount: breakdown.paidAmount,
    remainingAmount: breakdown.remainingAmount,
    paymentDueDate: breakdown.remainingAmount > 0 ? bookingDate : undefined,
    paymentReminder,
    paymentReference,
    paymentHistory: [
      {
        label: breakdown.remainingAmount > 0 ? breakdown.optionLabel : "Pembayaran Lunas",
        amount: breakdown.paidAmount,
        date: "Hari Ini",
        method: paymentMethod,
        reference: paymentReference,
      },
    ],
    cateringDate: bookingDate,
    cateringPortions: cateringPO.paxCount,
    cateringTime: "08:00 - 10:00 WIB",
    notes: cateringPO.note,
    address: cateringPO.address || {
      id: "addr-po",
      label: "Rumah Utama",
      receiverName: "Customer Rangers",
      phoneNumber: "081234567890",
      fullAddress: "Jl. Aster No. 7, Kamojang, Kab. Garut",
      isMain: true,
    },
    items: [
      {
        id: cateringPO.package.id.toString(),
        name: cateringPO.package.name,
        price: cateringPO.package.price,
        qty: cateringPO.paxCount,
        img: cateringPO.package.img,
        store: cateringPO.merchant.name,
      },
    ],
  };
};

const formatRupiah = (amount: number) =>
  `Rp ${amount.toLocaleString("id-ID")}`;

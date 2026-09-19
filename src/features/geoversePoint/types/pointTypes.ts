export type LedgerType =
  | "EARN"
  | "REDEEM_VOUCHER"
  | "REDEEM_CASH"
  | "PAYMENT"
  | "REVERSAL"
  | "ADJUSTMENT";

export type LedgerSourceType =
  | "WASTE_DEPOSIT"
  | "VOUCHER"
  | "CASH_REDEMPTION"
  | "KANYAAH_SHOP"
  | "KANYAAH_RIDE"
  | "KANYAAH_SEND"
  | "CATERING"
  | "LAUNDRY"
  | "ADMIN"
  | "REVERSAL";

export type LedgerStatus = "PENDING" | "CONFIRMED" | "REVERSED";

export interface PointWalletUI {
  _id: string;
  userId: string;
  balancePoint: number;
  lifetimeEarned: number;
  lifetimeRedeemed: number;
  totalKgDeposited: number;
  depositCount: number;
  totalCo2ReductionKg: number;
  updatedAt?: string;
}

export interface PointLedgerUI {
  _id: string;
  ledgerId: string;
  userId: string;
  type: LedgerType;
  sourceType: LedgerSourceType;
  sourceId: string;
  points: number;
  balanceBefore: number;
  balanceAfter: number;
  status: LedgerStatus;
  notes?: string;
  createdAt: string;
}

export type RedemptionType = "VOUCHER" | "CASH" | "BANK_TRANSFER" | "E_WALLET";

export type RedemptionStatus =
  | "REQUESTED"
  | "REVIEWING"
  | "APPROVED"
  | "PAID"
  | "REJECTED"
  | "CANCELLED";

export interface PointRedemptionUI {
  _id: string;
  redemptionCode: string;
  userId: string;
  bankSampahId?: any;
  type: RedemptionType;
  points: number;
  rupiahValue: number;
  fee: number;
  payoutDestination?: {
    channel: string;
    accountNumber: string;
    accountName: string;
  };
  voucherId?: any;
  voucherCode?: string;
  voucherDetails?: {
    title: string;
    service: string;
    discountValue: number;
  };
  status: RedemptionStatus;
  rejectionReason?: string;
  paidAt?: string | null;
  createdAt: string;
}

export interface PointVoucherUI {
  _id: string;
  voucherCode: string;
  title: string;
  description?: string;
  service: string;
  discountType: "FIXED" | "PERCENTAGE";
  discountValue: number;
  minTransaction: number;
  maxDiscount?: number | null;
  pointsCost: number;
  validFrom?: string;
  validUntil: string;
  usageLimit?: number;
  usedCount?: number;
  userUsageLimit?: number;
  isClaimedByUser?: boolean;
}

export interface PointConfigUI {
  pointToRupiahRate: number;
  minCashRedemptionPoints: number;
  features: {
    allowCashRedemption: boolean;
    allowVoucherRedemption: boolean;
    allowServicePayment: boolean;
  };
}

export interface CreateRedemptionPayload {
  type: RedemptionType;
  points: number;
  bankSampahId?: string;
  voucherId?: string;
  payoutDestination?: {
    channel: string;
    accountNumber: string;
    accountName: string;
  };
}

export interface PointLedgerQueryParams {
  type?: string;
  sourceType?: string;
  page?: number;
  limit?: number;
}

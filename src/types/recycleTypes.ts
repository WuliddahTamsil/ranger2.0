export type WasteCategory =
  | "Plastik"
  | "Kertas & Kardus"
  | "Logam & Besi"
  | "Kaca & Botol"
  | "Elektronik"
  | "Minyak Jelantah"
  | "Organik"
  | "Lainnya";

export interface WasteCategoryPriceUI {
  _id: string;
  bankSampahId: string;
  category: WasteCategory;
  subCategory: string;
  pricePerKg: number;
  minWeightKg: number;
  unit: string;
  isActive: boolean;
  description?: string;
}

export interface WasteBankUI {
  _id: string;
  name: string;
  ownerId: string;
  address: string;
  latitude: number;
  longitude: number;
  phone: string;
  photoUrl?: string;
  rating: number;
  ratingCount: number;
  openingHours: string;
  acceptsPickup: boolean;
  status: "PENDING" | "ACTIVE" | "SUSPENDED";
  distanceKm?: number | null;
  maxPrice?: number;
  prices?: WasteCategoryPriceUI[];
  acceptedCategories?: WasteCategory[];
}

export interface DepositCategoryItem {
  _id?: string;
  category: WasteCategory;
  subCategory: string;
  estimatedWeightKg: number;
  actualWeightKg: number;
  pricePerKg: number;
  totalRupiah: number;
  totalPoint: number;
}

export interface EnvironmentalImpact {
  co2ReductionKg: number;
  treesEquivalent: number;
  landfillDivertedKg: number;
}

export type WasteDepositStatus =
  | "REQUESTED"
  | "ACCEPTED"
  | "DRIVER_ASSIGNED"
  | "PICKUP_ON_THE_WAY"
  | "PICKED_UP"
  | "AT_BANK"
  | "WEIGHING"
  | "WAITING_CUSTOMER_CONFIRMATION"
  | "POINT_ISSUED"
  | "COMPLETED"
  | "DISPUTED"
  | "RESOLVED"
  | "CANCELLED"
  | "REJECTED";

export interface WasteDepositUI {
  _id: string;
  depositCode: string;
  customerId: any;
  bankSampahId: any;
  driverId?: any;
  method: "DROP_OFF" | "PICKUP";
  pickupAddress?: string;
  pickupLatitude?: number | null;
  pickupLongitude?: number | null;
  pickupSchedule?: string | null;
  pickupNotes?: string;
  categories: DepositCategoryItem[];
  estimatedTotalWeightKg: number;
  actualTotalWeightKg: number;
  estimatedPoint: number;
  finalPoint: number;
  estimatedRupiah: number;
  finalRupiah: number;
  customerPhotos?: string[];
  weighingProofPhotos?: string[];
  weighingNotes?: string;
  weighedBy?: any;
  customerConfirmedAt?: string | null;
  disputeReason?: string;
  status: WasteDepositStatus;
  statusHistory?: Array<{
    status: string;
    actorId?: string;
    actorRole?: string;
    note?: string;
    createdAt: string;
  }>;
  environmentalImpact?: EnvironmentalImpact;
  createdAt: string;
  updatedAt: string;
}

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
  type: "EARN" | "REDEEM_VOUCHER" | "REDEEM_CASH" | "REVERSAL" | "ADJUSTMENT";
  sourceType: "WASTE_DEPOSIT" | "VOUCHER" | "CASH_REDEMPTION" | "ADMIN";
  sourceId: string;
  points: number;
  balanceBefore: number;
  balanceAfter: number;
  status: "PENDING" | "CONFIRMED" | "REVERSED";
  notes?: string;
  createdAt: string;
}

export interface PointRedemptionUI {
  _id: string;
  redemptionCode: string;
  userId: string;
  bankSampahId?: any;
  type: "VOUCHER" | "CASH" | "BANK_TRANSFER" | "E_WALLET";
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
  status: "REQUESTED" | "REVIEWING" | "APPROVED" | "PAID" | "REJECTED" | "CANCELLED";
  rejectionReason?: string;
  paidAt?: string | null;
  createdAt: string;
}

export interface VoucherUI {
  _id: string;
  voucherCode: string;
  title: string;
  description: string;
  service: "ALL" | "MARKETPLACE" | "RIDE" | "SEND" | "LAUNDRY" | "CATERING";
  discountType: "FIXED" | "PERCENTAGE";
  discountValue: number;
  minTransaction: number;
  pointsCost: number;
  validUntil: string;
  status: "ACTIVE" | "INACTIVE" | "EXPIRED";
  isUsed?: boolean;
}

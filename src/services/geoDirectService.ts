/**
 * geoDirectService.ts
 * Frontend API Service and Types for Geo Direct Use (PGE Kamojang)
 */

import { getApiUrl, getStoredAuthToken } from "./api";

export interface GeoProductionParameter {
  _id?: string;
  paramKey: string;
  paramLabel: string;
  paramType: "select" | "number" | "text";
  options?: string[];
  unit?: string;
  required?: boolean;
  ratePerUnit?: number;
  helperText?: string;
}

export interface GeoDirectEquipment {
  _id: string;
  code: string;
  name: string;
  description: string;
  specification: string;
  function: string;
  capacity: string;
  rentalTerms: string;
  imageUrl?: string;
  isAvailable: boolean;
  isActive: boolean;
  basePrice: number;
  pricingUnit: "per_hari" | "per_minggu" | "per_bulan" | "per_ton" | "per_batch" | string;
  dpPercentage: number;
  pricingFormulaType: "STANDARD_DAILY" | "DAILY_PLUS_CAPACITY" | "FIXED" | string;
  productionParameters?: GeoProductionParameter[];
  updatedAt?: string;
}

export interface GeoDirectPricingCalculation {
  isConfigured: boolean;
  basePrice: number;
  pricingUnit: string;
  durationDays: number;
  subtotalBase: number;
  productionAddonRate: number;
  productionAddonTotal: number;
  totalRentalCost: number;
  dpPercentage: number;
  requiredDpAmount: number;
  customerDpBalance: number;
  dpCreditApplied: number;
  netDpDue: number;
  remainingBalance: number;
  formulaApplied: string;
}

export interface GeoBankAccount {
  _id?: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  branch?: string;
  isActive: boolean;
}

export interface GeoPaymentMethodsConfig {
  _id?: string;
  qrisEnabled: boolean;
  qrisImageUrl?: string;
  qrisMerchantName?: string;
  qrisNmid?: string;
  bankAccounts: GeoBankAccount[];
  paymentInstructions: string;
  paymentDeadlineHours: number;
}

export interface GeoDirectBooking {
  _id: string;
  bookingCode: string;
  customer: string;
  customerSnapshot: {
    name: string;
    email?: string;
    phone: string;
    company?: string;
    address?: string;
  };
  equipment: GeoDirectEquipment | string;
  equipmentSnapshot: {
    code: string;
    name: string;
    description?: string;
    imageUrl?: string;
    basePrice: number;
    pricingUnit: string;
  };
  rentalSchedule: {
    startDate: string;
    endDate: string;
    durationDays: number;
  };
  usagePurpose: string;
  usageLocation: string;
  notes?: string;
  productionNeeds?: {
    productType?: string;
    rawMaterialTons?: number;
    processRequirements?: string;
    customParameters?: Record<string, any>;
  };
  pricingSnapshot: {
    basePrice: number;
    durationDays: number;
    subtotalBase: number;
    productionAddonRate: number;
    productionAddonTotal: number;
    totalRentalCost: number;
    dpPercentage: number;
    requiredDpAmount: number;
    dpCreditApplied: number;
    netDpDue: number;
    remainingBalance: number;
    formulaApplied: string;
  };
  bookingStatus:
    | "DRAFT"
    | "WAITING_PAYMENT"
    | "PAYMENT_REVIEW"
    | "WAITING_APPROVAL"
    | "APPROVED"
    | "REJECTED"
    | "COMPLETED"
    | "CANCELLED";
  paymentStatus: "UNPAID" | "WAITING_VERIFICATION" | "VERIFIED" | "REJECTED";
  paymentProof?: {
    fileUrl?: string;
    fileName?: string;
    fileType?: string;
    uploadedAt?: string;
    paymentMethodType?: "QRIS" | "BANK_TRANSFER" | "DP_BALANCE" | "NONE";
    transferToBank?: string;
  };
  verificationDetails?: {
    verifiedByName?: string;
    verifiedAt?: string;
    rejectionReason?: string;
  };
  approvalDetails?: {
    approvedByName?: string;
    approvedAt?: string;
    approvalNotes?: string;
    rejectionReason?: string;
  };
  invoice?: {
    invoiceNumber?: string;
    status: "NOT_ISSUED" | "ISSUED" | "REVISED";
    issuedAt?: string;
    pdfUrl?: string;
    revisionCount?: number;
  };
  revisionHistory?: any[];
  createdAt: string;
  updatedAt: string;
}

export interface GeoDirectDpLedgerItem {
  _id: string;
  customer: string;
  transactionType: "CREDIT_FROM_REJECTION" | "DEBIT_APPLIED_TO_BOOKING" | "MANUAL_ADJUSTMENT";
  amount: number;
  sourceBooking?: any;
  targetBooking?: any;
  balanceAfter: number;
  notes: string;
  createdAt: string;
}

export interface GeoDirectDashboardStats {
  totalEquipments: number;
  totalBookings: number;
  waitingPaymentCount: number;
  paymentReviewCount: number;
  waitingApprovalCount: number;
  approvedCount: number;
  rejectedCount: number;
  totalGmv: number;
  totalVerifiedDp: number;
}

// ==========================================
// API HELPER WITH AUTH
// ==========================================
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = await getStoredAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const url = getApiUrl(endpoint);
  const response = await fetch(url, { ...options, headers });
  const result = await response.json();

  if (!response.ok || result.success === false) {
    throw new Error(result.message || `Request failed with status ${response.status}`);
  }

  return result.data as T;
}

// ==========================================
// 1. CUSTOMER & PUBLIC SERVICES
// ==========================================

export async function fetchEquipments(): Promise<GeoDirectEquipment[]> {
  return await apiRequest<GeoDirectEquipment[]>("/geo-direct/catalog");
}

export async function fetchEquipmentDetail(idOrCode: string): Promise<GeoDirectEquipment> {
  return await apiRequest<GeoDirectEquipment>(`/geo-direct/catalog/${idOrCode}`);
}

export async function calculateRentalPrice(payload: {
  equipmentId: string;
  durationDays: number;
  productionNeeds?: Record<string, any>;
}): Promise<{ equipment: Partial<GeoDirectEquipment>; calculation: GeoDirectPricingCalculation }> {
  return await apiRequest<{ equipment: Partial<GeoDirectEquipment>; calculation: GeoDirectPricingCalculation }>(
    "/geo-direct/calculate",
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  );
}

export async function fetchPaymentMethods(): Promise<GeoPaymentMethodsConfig> {
  return await apiRequest<GeoPaymentMethodsConfig>("/geo-direct/payment-methods");
}

export async function createBooking(payload: {
  equipmentId: string;
  customerSnapshot?: {
    name?: string;
    email?: string;
    phone: string;
    company?: string;
    address?: string;
  };
  rentalSchedule: {
    startDate: string;
    endDate: string;
  };
  usagePurpose: string;
  usageLocation: string;
  notes?: string;
  productionNeeds?: Record<string, any>;
  applyDpCredit?: boolean;
}): Promise<GeoDirectBooking> {
  return await apiRequest<GeoDirectBooking>("/geo-direct/bookings", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchMyBookings(): Promise<GeoDirectBooking[]> {
  return await apiRequest<GeoDirectBooking[]>("/geo-direct/bookings/my");
}

export async function fetchBookingDetail(idOrCode: string): Promise<GeoDirectBooking> {
  return await apiRequest<GeoDirectBooking>(`/geo-direct/bookings/${idOrCode}`);
}

export async function uploadPaymentProof(
  bookingId: string,
  payload: {
    fileUrl: string;
    fileName?: string;
    fileType?: string;
    paymentMethodType?: "QRIS" | "BANK_TRANSFER" | "DP_BALANCE";
    transferToBank?: string;
  }
): Promise<GeoDirectBooking> {
  return await apiRequest<GeoDirectBooking>(`/geo-direct/bookings/${bookingId}/payment-proof`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function resubmitBooking(
  bookingId: string,
  payload: {
    rentalSchedule?: {
      startDate: string;
      endDate: string;
    };
    usagePurpose?: string;
    usageLocation?: string;
    notes?: string;
    productionNeeds?: Record<string, any>;
  }
): Promise<GeoDirectBooking> {
  return await apiRequest<GeoDirectBooking>(`/geo-direct/bookings/${bookingId}/resubmit`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fetchCustomerDpBalance(): Promise<{
  balance: number;
  history: GeoDirectDpLedgerItem[];
}> {
  return await apiRequest<{ balance: number; history: GeoDirectDpLedgerItem[] }>("/geo-direct/dp-balance");
}

// ==========================================
// 2. ADMIN SERVICES
// ==========================================

export async function fetchAdminGeoStats(): Promise<GeoDirectDashboardStats> {
  return await apiRequest<GeoDirectDashboardStats>("/geo-direct/admin/stats");
}

export async function fetchAdminGeoBookings(params: {
  status?: string;
  paymentStatus?: string;
  search?: string;
  equipmentId?: string;
  page?: number;
  limit?: number;
}): Promise<{ bookings: GeoDirectBooking[]; totalCount: number; currentPage: number; totalPages: number }> {
  const query = new URLSearchParams();
  if (params.status) query.append("status", params.status);
  if (params.paymentStatus) query.append("paymentStatus", params.paymentStatus);
  if (params.search) query.append("search", params.search);
  if (params.equipmentId) query.append("equipmentId", params.equipmentId);
  if (params.page) query.append("page", String(params.page));
  if (params.limit) query.append("limit", String(params.limit));

  return await apiRequest<{ bookings: GeoDirectBooking[]; totalCount: number; currentPage: number; totalPages: number }>(
    `/geo-direct/admin/bookings?${query.toString()}`
  );
}

export async function adminCreateEquipment(payload: Partial<GeoDirectEquipment>): Promise<GeoDirectEquipment> {
  return await apiRequest<GeoDirectEquipment>("/geo-direct/admin/equipments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function adminUpdateEquipment(
  id: string,
  payload: Partial<GeoDirectEquipment>
): Promise<GeoDirectEquipment> {
  return await apiRequest<GeoDirectEquipment>(`/geo-direct/admin/equipments/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function adminDeleteEquipment(id: string): Promise<void> {
  await apiRequest<void>(`/geo-direct/admin/equipments/${id}`, {
    method: "DELETE",
  });
}

export async function adminUpdatePaymentMethods(
  payload: Partial<GeoPaymentMethodsConfig>
): Promise<GeoPaymentMethodsConfig> {
  return await apiRequest<GeoPaymentMethodsConfig>("/geo-direct/admin/payment-methods", {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function adminVerifyPayment(bookingId: string): Promise<GeoDirectBooking> {
  return await apiRequest<GeoDirectBooking>(`/geo-direct/admin/bookings/${bookingId}/verify-payment`, {
    method: "POST",
  });
}

export async function adminRejectPayment(bookingId: string, reason: string): Promise<GeoDirectBooking> {
  return await apiRequest<GeoDirectBooking>(`/geo-direct/admin/bookings/${bookingId}/reject-payment`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function adminApproveBooking(bookingId: string, notes?: string): Promise<GeoDirectBooking> {
  return await apiRequest<GeoDirectBooking>(`/geo-direct/admin/bookings/${bookingId}/approve`, {
    method: "POST",
    body: JSON.stringify({ notes }),
  });
}

export async function adminRejectBooking(bookingId: string, reason: string): Promise<GeoDirectBooking> {
  return await apiRequest<GeoDirectBooking>(`/geo-direct/admin/bookings/${bookingId}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

export async function fetchAdminDpLedgers(customerId?: string): Promise<GeoDirectDpLedgerItem[]> {
  const query = customerId ? `?customerId=${customerId}` : "";
  return await apiRequest<GeoDirectDpLedgerItem[]>(`/geo-direct/admin/dp-ledgers${query}`);
}


import { getApiUrl } from "./api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  WasteBankUI,
  WasteCategoryPriceUI,
  WasteDepositUI,
  PointWalletUI,
  PointLedgerUI,
  PointRedemptionUI,
  VoucherUI,
} from "../types/recycleTypes";

const AUTH_ACCOUNTS_KEY = "rangers.auth.accounts.v1";
const AUTH_SESSION_KEY = "rangers.auth.session.v1";

const getAuthHeaders = async (accountId?: string): Promise<Record<string, string>> => {
  try {
    const [accountsRaw, sessionRaw] = await Promise.all([
      AsyncStorage.getItem(AUTH_ACCOUNTS_KEY),
      AsyncStorage.getItem(AUTH_SESSION_KEY),
    ]);
    const session = sessionRaw ? JSON.parse(sessionRaw) : null;
    const accounts = accountsRaw ? JSON.parse(accountsRaw) : [];
    const requestedAccountId = accountId || session?.accountId;
    const account = Array.isArray(accounts)
      ? accounts.find((item: any) => String(item.id) === String(requestedAccountId))
      : null;
    return account?.token ? { Authorization: `Bearer ${account.token}` } : {};
  } catch {
    return {};
  }
};

const readApiJson = async (response: Response) => {
  const body = await response.text();
  if (!response.ok) {
    let message = "";
    try {
      message = JSON.parse(body)?.message || "";
    } catch {
      // fallback
    }
    throw new Error(message || `Permintaan gagal (HTTP ${response.status}).`);
  }
  try {
    return JSON.parse(body);
  } catch {
    throw new Error("Server API mengembalikan respons tidak valid.");
  }
};

// ==================== WASTE BANKS ====================
export const getWasteBanks = async (
  lat?: number,
  lng?: number,
  filter?: string
): Promise<{ success: boolean; data: WasteBankUI[]; message?: string }> => {
  try {
    const query = new URLSearchParams();
    if (lat !== undefined && lat !== null) query.append("lat", String(lat));
    if (lng !== undefined && lng !== null) query.append("lng", String(lng));
    if (filter) query.append("filter", filter);

    const url = getApiUrl(`/waste-banks${query.toString() ? `?${query.toString()}` : ""}`);
    const res = await fetch(url);
    return await readApiJson(res);
  } catch (err: any) {
    console.error("getWasteBanks error:", err);
    return { success: false, data: [], message: err?.message || "Gagal memuat bank sampah" };
  }
};

export const getWasteBankById = async (
  id: string,
  lat?: number,
  lng?: number
): Promise<{ success: boolean; data?: WasteBankUI; message?: string }> => {
  try {
    const query = new URLSearchParams();
    if (lat !== undefined && lat !== null) query.append("lat", String(lat));
    if (lng !== undefined && lng !== null) query.append("lng", String(lng));

    const url = getApiUrl(`/waste-banks/${id}${query.toString() ? `?${query.toString()}` : ""}`);
    const res = await fetch(url);
    return await readApiJson(res);
  } catch (err: any) {
    console.error("getWasteBankById error:", err);
    return { success: false, message: err?.message || "Gagal memuat detail bank sampah" };
  }
};

export const getWasteBankPrices = async (
  bankSampahId: string
): Promise<{ success: boolean; data: WasteCategoryPriceUI[]; message?: string }> => {
  try {
    const res = await fetch(getApiUrl(`/waste-banks/${bankSampahId}/prices`));
    return await readApiJson(res);
  } catch (err: any) {
    console.error("getWasteBankPrices error:", err);
    return { success: false, data: [], message: err?.message || "Gagal memuat katalog harga" };
  }
};

export const updateWasteBankOperational = async (
  bankSampahId: string,
  payload: { openingHours?: string; acceptsPickup?: boolean; phone?: string; status?: string }
): Promise<{ success: boolean; data?: WasteBankUI; message?: string }> => {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(getApiUrl(`/waste-banks/${bankSampahId}/operational`), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify(payload),
    });
    return await readApiJson(res);
  } catch (err: any) {
    console.error("updateWasteBankOperational error:", err);
    return { success: false, message: err?.message || "Gagal memperbarui jam operasional bank sampah" };
  }
};

// ==================== WASTE DEPOSITS ====================
export const createWasteDeposit = async (
  payload: {
    bankSampahId: string;
    method: "DROP_OFF" | "PICKUP";
    categories: Array<{ category: string; estimatedWeightKg: number }>;
    pickupAddress?: string;
    pickupLatitude?: number;
    pickupLongitude?: number;
    pickupSchedule?: string;
    pickupNotes?: string;
    customerPhotos?: string[];
  },
  idempotencyKey?: string
): Promise<{ success: boolean; data?: WasteDepositUI; message?: string }> => {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(getApiUrl("/waste/deposits"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      body: JSON.stringify(payload),
    });
    return await readApiJson(res);
  } catch (err: any) {
    console.error("createWasteDeposit error:", err);
    return { success: false, message: err?.message || "Gagal membuat permohonan setor sampah" };
  }
};

export const getCustomerDeposits = async (
  customerId: string
): Promise<{ success: boolean; data: WasteDepositUI[]; message?: string }> => {
  try {
    const authHeaders = await getAuthHeaders(customerId);
    const res = await fetch(getApiUrl(`/waste/deposits/customer/${customerId}?t=${Date.now()}`), {
      headers: authHeaders,
    });
    return await readApiJson(res);
  } catch (err: any) {
    console.error("getCustomerDeposits error:", err);
    return { success: false, data: [], message: err?.message || "Gagal memuat riwayat setoran" };
  }
};

export const getWasteDepositById = async (
  id: string
): Promise<{ success: boolean; data?: WasteDepositUI; message?: string }> => {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(getApiUrl(`/waste/deposits/${id}?t=${Date.now()}`), {
      headers: authHeaders,
    });
    return await readApiJson(res);
  } catch (err: any) {
    console.error("getWasteDepositById error:", err);
    return { success: false, message: err?.message || "Gagal memuat data setoran" };
  }
};

export const getBankDeposits = async (
  bankSampahId: string
): Promise<{ success: boolean; data: WasteDepositUI[]; message?: string }> => {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(getApiUrl(`/waste/deposits/bank/${bankSampahId}?t=${Date.now()}`), {
      headers: authHeaders,
    });
    return await readApiJson(res);
  } catch (err: any) {
    console.error("getBankDeposits error:", err);
    return { success: false, data: [], message: err?.message || "Gagal memuat antrean setoran" };
  }
};

export const acceptWasteDeposit = async (
  id: string,
  notes?: string
): Promise<{ success: boolean; data?: WasteDepositUI; message?: string }> => {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(getApiUrl(`/waste/deposits/${id}/accept`), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ notes }),
    });
    return await readApiJson(res);
  } catch (err: any) {
    console.error("acceptWasteDeposit error:", err);
    return { success: false, message: err?.message || "Gagal menerima setoran" };
  }
};

export const assignWasteDepositDriver = async (
  id: string,
  driverId: string
): Promise<{ success: boolean; data?: WasteDepositUI; message?: string }> => {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(getApiUrl(`/waste/deposits/${id}/assign-driver`), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ driverId }),
    });
    return await readApiJson(res);
  } catch (err: any) {
    console.error("assignWasteDepositDriver error:", err);
    return { success: false, message: err?.message || "Gagal menugaskan driver" };
  }
};

export const weighWasteDeposit = async (
  id: string,
  payload: {
    categories: Array<{ category: string; actualWeightKg: number }>;
    weighingProofPhotos?: string[];
    weighingNotes?: string;
  }
): Promise<{ success: boolean; data?: WasteDepositUI; message?: string }> => {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(getApiUrl(`/waste/deposits/${id}/weigh`), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify(payload),
    });
    return await readApiJson(res);
  } catch (err: any) {
    console.error("weighWasteDeposit error:", err);
    return { success: false, message: err?.message || "Gagal menyimpan hasil timbang" };
  }
};

export const confirmWasteDeposit = async (
  id: string
): Promise<{ success: boolean; data?: WasteDepositUI; message?: string }> => {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(getApiUrl(`/waste/deposits/${id}/confirm`), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
    });
    return await readApiJson(res);
  } catch (err: any) {
    console.error("confirmWasteDeposit error:", err);
    return { success: false, message: err?.message || "Gagal mengonfirmasi hasil timbang" };
  }
};

export const cancelWasteDeposit = async (
  id: string,
  reason?: string
): Promise<{ success: boolean; data?: WasteDepositUI; message?: string }> => {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(getApiUrl(`/waste/deposits/${id}/cancel`), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ reason }),
    });
    return await readApiJson(res);
  } catch (err: any) {
    console.error("cancelWasteDeposit error:", err);
    return { success: false, message: err?.message || "Gagal membatalkan setoran" };
  }
};

export const disputeWasteDeposit = async (
  id: string,
  reason: string
): Promise<{ success: boolean; data?: WasteDepositUI; message?: string }> => {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(getApiUrl(`/waste/deposits/${id}/complaint`), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ reason }),
    });
    return await readApiJson(res);
  } catch (err: any) {
    console.error("disputeWasteDeposit error:", err);
    return { success: false, message: err?.message || "Gagal mengajukan komplain" };
  }
};

// ==================== POINT DELEGATIONS TO geoversePointService ====================
export {
  fetchPointWallet as getPointWallet,
  fetchPointLedger as getPointLedger,
  createRedemption as createPointRedemption,
  fetchMyRedemptions as getCustomerRedemptions,
  fetchAvailableVouchers as getAvailableVouchers,
} from "../features/geoversePoint/services/geoversePointService";


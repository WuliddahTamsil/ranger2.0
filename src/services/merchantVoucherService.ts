import { getApiUrl } from "./api";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type VoucherDiscountType = "FIXED" | "PERCENTAGE" | "FREE_SHIPPING";

export interface MerchantVoucher {
  _id: string;
  voucherCode: string;
  title: string;
  description?: string;
  service: string;
  merchantId?: string;
  merchantName?: string;
  discountType: VoucherDiscountType;
  discountValue: number;
  minTransaction: number;
  maxDiscount?: number | null;
  pointsCost: number;
  validFrom?: string;
  validUntil: string;
  usageLimit: number;
  usedCount: number;
  claimedCount?: number;
  status: "ACTIVE" | "INACTIVE" | "EXPIRED";
  isExpired?: boolean;
  createdAt?: string;
}

export interface CreateMerchantVoucherPayload {
  voucherCode: string;
  title: string;
  description?: string;
  service?: string;
  discountType: VoucherDiscountType;
  discountValue: number;
  minTransaction?: number;
  maxDiscount?: number | null;
  pointsCost?: number;
  validUntil: string;
  usageLimit?: number;
}

export interface VoucherValidationResult {
  voucherCode: string;
  title: string;
  discountType: VoucherDiscountType;
  discountAmount: number;
  discountValue: number;
  minTransaction?: number;
}

const AUTH_ACCOUNTS_KEY = "rangers.auth.accounts.v1";
const AUTH_SESSION_KEY = "rangers.auth.session.v1";
const LOCAL_MERCHANT_VOUCHERS_KEY = "rangers.merchant_vouchers.v1";

const getAuthHeaders = async (): Promise<Record<string, string>> => {
  try {
    const [accountsRaw, sessionRaw] = await Promise.all([
      AsyncStorage.getItem(AUTH_ACCOUNTS_KEY),
      AsyncStorage.getItem(AUTH_SESSION_KEY),
    ]);
    const session = sessionRaw ? JSON.parse(sessionRaw) : null;
    const accounts = accountsRaw ? JSON.parse(accountsRaw) : [];
    const requestedAccountId = session?.accountId || session?.id || session?.userId || session?.currentAccount?.id;
    let account = Array.isArray(accounts) && requestedAccountId
      ? accounts.find((item: any) => String(item.id) === String(requestedAccountId) || String(item._id) === String(requestedAccountId))
      : null;
    const target = account || session?.currentAccount;
    const resolvedId = requestedAccountId || target?.id || target?._id;
    if (!resolvedId) {
      return {
        "Content-Type": "application/json",
      };
    }
    const token = target?.token;
    if (!token) {
      return {
        "Content-Type": "application/json",
      };
    }
    return {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  } catch {
    return {
      "Content-Type": "application/json",
    };
  }
};

export const fetchMerchantVouchers = async (): Promise<{
  success: boolean;
  data?: MerchantVoucher[];
  message?: string;
}> => {
  try {
    const headers = await getAuthHeaders();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(getApiUrl("/vouchers/merchant/my-vouchers"), {
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        await AsyncStorage.setItem(LOCAL_MERCHANT_VOUCHERS_KEY, JSON.stringify(json.data));
        return json;
      }
    }
  } catch (e) {
    // fallback to cached data if previously fetched
  }

  try {
    const saved = await AsyncStorage.getItem(LOCAL_MERCHANT_VOUCHERS_KEY);
    if (saved) {
      return { success: true, data: JSON.parse(saved) };
    }
  } catch {}

  return { success: true, data: [] };
};

export const createMerchantVoucher = async (
  payload: CreateMerchantVoucherPayload
): Promise<{
  success: boolean;
  data?: MerchantVoucher;
  message?: string;
}> => {
  try {
    const headers = await getAuthHeaders();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(getApiUrl("/vouchers/merchant/create"), {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      const json = await res.json();
      if (json.success) {
        // update local cache with server data
        const current = await fetchMerchantVouchers();
        const updated = [json.data, ...(current.data || [])];
        await AsyncStorage.setItem(LOCAL_MERCHANT_VOUCHERS_KEY, JSON.stringify(updated));
        return json;
      }
      return { success: false, message: json.message || "Gagal membuat voucher" };
    }
    const errJson = await res.json().catch(() => ({}));
    return { success: false, message: errJson.message || "Gagal membuat voucher di server" };
  } catch (e: any) {
    return { success: false, message: e?.message || "Koneksi ke server gagal" };
  }
};

export const toggleMerchantVoucherStatus = async (
  id: string
): Promise<{
  success: boolean;
  data?: MerchantVoucher;
  message?: string;
}> => {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(getApiUrl(`/vouchers/merchant/${id}/status`), {
      method: "PATCH",
      headers,
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success) {
        // update cache
        try {
          const current = await fetchMerchantVouchers();
          const updated = (current.data || []).map((v) => (v._id === id ? json.data : v));
          await AsyncStorage.setItem(LOCAL_MERCHANT_VOUCHERS_KEY, JSON.stringify(updated));
        } catch {}
        return json;
      }
      return { success: false, message: json.message || "Gagal memperbarui status voucher" };
    }
  } catch {}

  return { success: false, message: "Gagal memperbarui status voucher di server" };
};

export const deleteMerchantVoucher = async (
  id: string
): Promise<{
  success: boolean;
  message?: string;
}> => {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(getApiUrl(`/vouchers/merchant/${id}`), {
      method: "DELETE",
      headers,
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success) {
        try {
          const current = await fetchMerchantVouchers();
          const updated = (current.data || []).filter((v) => v._id !== id);
          await AsyncStorage.setItem(LOCAL_MERCHANT_VOUCHERS_KEY, JSON.stringify(updated));
        } catch {}
        return json;
      }
      return { success: false, message: json.message || "Gagal menghapus voucher" };
    }
  } catch {}

  return { success: false, message: "Gagal menghapus voucher di server" };
};

export const validateVoucherForCheckout = async (params: {
  voucherCode: string;
  service?: string;
  transactionAmount?: number;
  deliveryFee?: number;
}): Promise<{
  success: boolean;
  data?: VoucherValidationResult;
  message?: string;
}> => {
  try {
    const headers = await getAuthHeaders();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(getApiUrl("/vouchers/validate"), {
      method: "POST",
      headers,
      body: JSON.stringify(params),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (res.ok) {
      return await res.json();
    } else {
      const errJson = await res.json().catch(() => ({}));
      return { success: false, message: errJson.message || "Voucher tidak valid atau kadaluarsa" };
    }
  } catch {
    return { success: false, message: "Gagal memverifikasi voucher ke server. Periksa koneksi internet Anda." };
  }
};

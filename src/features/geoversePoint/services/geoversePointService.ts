import { getApiUrl } from "../../../services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  PointWalletUI,
  PointLedgerUI,
  PointRedemptionUI,
  PointVoucherUI,
  PointConfigUI,
  CreateRedemptionPayload,
  PointLedgerQueryParams,
} from "../types/pointTypes";

const AUTH_ACCOUNTS_KEY = "rangers.auth.accounts.v1";
const AUTH_SESSION_KEY = "rangers.auth.session.v1";

export const getAuthHeaders = async (accountId?: string): Promise<Record<string, string>> => {
  try {
    const [accountsRaw, sessionRaw] = await Promise.all([
      AsyncStorage.getItem(AUTH_ACCOUNTS_KEY),
      AsyncStorage.getItem(AUTH_SESSION_KEY),
    ]);
    const session = sessionRaw ? JSON.parse(sessionRaw) : null;
    const accounts = accountsRaw ? JSON.parse(accountsRaw) : [];
    const requestedAccountId = accountId || session?.accountId || session?.id || session?.userId;
    let account = Array.isArray(accounts) && requestedAccountId
      ? accounts.find((item: any) => String(item.id) === String(requestedAccountId) || String(item._id) === String(requestedAccountId))
      : null;
    if (!account && Array.isArray(accounts) && accounts.length > 0) {
      account = accounts[0];
    }
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
      // ignore parse error
    }
    throw new Error(message || `Permintaan gagal (HTTP ${response.status}).`);
  }
  try {
    return JSON.parse(body);
  } catch {
    return { success: true };
  }
};

// ==================== WALLET & CONFIG ====================

export const fetchPointWallet = async (): Promise<{
  success: boolean;
  data?: PointWalletUI;
  message?: string;
}> => {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(getApiUrl(`/geoverse-points/wallet?t=${Date.now()}`), {
      headers: authHeaders,
    });
    return await readApiJson(res);
  } catch (err: any) {
    console.error("fetchPointWallet error:", err);
    return { success: false, message: err?.message || "Gagal memuat saldo point" };
  }
};

export const fetchPointConfig = async (): Promise<{
  success: boolean;
  data?: PointConfigUI;
  message?: string;
}> => {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(getApiUrl("/geoverse-points/config"), {
      headers: authHeaders,
    });
    return await readApiJson(res);
  } catch (err: any) {
    console.error("fetchPointConfig error:", err);
    return {
      success: true,
      data: {
        pointToRupiahRate: 1,
        minCashRedemptionPoints: 5000,
        features: {
          allowCashRedemption: true,
          allowVoucherRedemption: true,
          allowServicePayment: true,
        },
      },
    };
  }
};

// ==================== LEDGER / MUTASI ====================

export const fetchPointLedger = async (
  params?: PointLedgerQueryParams
): Promise<{
  success: boolean;
  data?: {
    ledger: PointLedgerUI[];
    pagination: { total: number; page: number; pages: number; limit: number };
  };
  message?: string;
}> => {
  try {
    const authHeaders = await getAuthHeaders();
    const query = new URLSearchParams();
    if (params?.type) query.append("type", params.type);
    if (params?.sourceType) query.append("sourceType", params.sourceType);
    if (params?.page) query.append("page", String(params.page));
    if (params?.limit) query.append("limit", String(params.limit));

    const url = getApiUrl(
      `/geoverse-points/ledger${query.toString() ? `?${query.toString()}` : ""}`
    );
    const res = await fetch(url, { headers: authHeaders });
    return await readApiJson(res);
  } catch (err: any) {
    console.error("fetchPointLedger error:", err);
    return { success: false, message: err?.message || "Gagal memuat mutasi point" };
  }
};

// ==================== VOUCHERS ====================

export const fetchAvailableVouchers = async (
  service?: string
): Promise<{
  success: boolean;
  data?: PointVoucherUI[];
  message?: string;
}> => {
  try {
    const authHeaders = await getAuthHeaders();
    const query = service ? `?service=${encodeURIComponent(service)}` : "";
    const res = await fetch(getApiUrl(`/geoverse-points/vouchers${query}`), {
      headers: authHeaders,
    });
    return await readApiJson(res);
  } catch (err: any) {
    console.error("fetchAvailableVouchers error:", err);
    return { success: false, message: err?.message || "Gagal memuat katalog voucher" };
  }
};

// ==================== REDEMPTIONS ====================

export const fetchMyRedemptions = async (): Promise<{
  success: boolean;
  data?: PointRedemptionUI[];
  message?: string;
}> => {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(getApiUrl(`/geoverse-points/redemptions?t=${Date.now()}`), {
      headers: authHeaders,
    });
    return await readApiJson(res);
  } catch (err: any) {
    console.error("fetchMyRedemptions error:", err);
    return { success: false, message: err?.message || "Gagal memuat riwayat penukaran" };
  }
};

export const fetchRedemptionDetail = async (
  id: string
): Promise<{
  success: boolean;
  data?: PointRedemptionUI;
  message?: string;
}> => {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(getApiUrl(`/geoverse-points/redemptions/${id}`), {
      headers: authHeaders,
    });
    return await readApiJson(res);
  } catch (err: any) {
    console.error("fetchRedemptionDetail error:", err);
    return { success: false, message: err?.message || "Gagal memuat detail penukaran" };
  }
};

export const createRedemption = async (
  payload: CreateRedemptionPayload,
  idempotencyKey?: string
): Promise<{
  success: boolean;
  data?: PointRedemptionUI;
  message?: string;
}> => {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(getApiUrl("/geoverse-points/redemptions"), {
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
    console.error("createRedemption error:", err);
    return { success: false, message: err?.message || "Gagal memproses penukaran" };
  }
};

export const cancelRedemption = async (
  id: string,
  reason?: string
): Promise<{
  success: boolean;
  data?: PointRedemptionUI;
  message?: string;
}> => {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(getApiUrl(`/geoverse-points/redemptions/${id}/cancel`), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify({ reason }),
    });
    return await readApiJson(res);
  } catch (err: any) {
    console.error("cancelRedemption error:", err);
    return { success: false, message: err?.message || "Gagal membatalkan penukaran" };
  }
};

import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_BASE_URL, getApiUrl } from "./api";
import {
  SendFareBreakdown,
  SendOrderUI,
  SendPackageData,
  SendPartyData,
} from "../types";

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

    const target =
      accounts.find((a: any) => a.id === accountId) ||
      accounts.find((a: any) => a.id === session?.currentAccountId) ||
      session?.currentAccount ||
      accounts[0];

    const token = target?.token || target?.accessToken;
    if (token) {
      return {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };
    }
  } catch (err) {
    console.warn("getAuthHeaders error in sendService:", err);
  }
  return { "Content-Type": "application/json" };
};

export interface EstimateFarePayload {
  pickup: SendPartyData;
  destination: SendPartyData;
  package?: Partial<SendPackageData>;
  discount?: number;
}

const parseJsonResponse = async (res: Response, fallbackErrMsg: string) => {
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    return json;
  } catch {
    return {
      success: false,
      message: res.ok ? "Format data tidak valid." : `${fallbackErrMsg} (HTTP ${res.status})`,
    };
  }
};

/**
 * 1. Request Fare Estimate from Backend Engine
 */
export const estimateSendFare = async (
  payload: EstimateFarePayload,
  accountId?: string
): Promise<{ success: boolean; data?: SendFareBreakdown; message?: string }> => {
  try {
    const headers = await getAuthHeaders(accountId);
    const res = await fetch(getApiUrl("/send/fare-estimate"), {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    return await parseJsonResponse(res, "Gagal menghitung tarif");
  } catch (error: any) {
    console.error("estimateSendFare error:", error);
    return { success: false, message: error.message || "Koneksi ke server gagal." };
  }
};

/**
 * 2. Create Send Order
 */
export const createSendOrder = async (
  payload: {
    sender: SendPartyData;
    recipient: SendPartyData;
    package: SendPackageData;
    paymentMethod: string;
    discount?: number;
    idempotencyKey?: string;
    customerId?: string;
  },
  accountId?: string
): Promise<{ success: boolean; data?: SendOrderUI; payment?: any; message?: string }> => {
  try {
    const headers = await getAuthHeaders(accountId);
    const res = await fetch(getApiUrl("/send/orders"), {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
    return await parseJsonResponse(res, "Gagal membuat pesanan");
  } catch (error: any) {
    console.error("createSendOrder error:", error);
    return { success: false, message: error.message || "Gagal membuat order pengiriman." };
  }
};

/**
 * 3. Fetch Customer Orders
 */
export const fetchCustomerSendOrders = async (
  customerId: string,
  accountId?: string
): Promise<{ success: boolean; data?: SendOrderUI[]; message?: string }> => {
  try {
    const headers = await getAuthHeaders(accountId);
    const res = await fetch(getApiUrl(`/send/orders/customer/${customerId}`), {
      headers,
    });
    return await parseJsonResponse(res, "Gagal memuat daftar pesanan");
  } catch (error: any) {
    console.error("fetchCustomerSendOrders error:", error);
    return { success: false, message: error.message || "Gagal memuat daftar pesanan pengiriman." };
  }
};

/**
 * 4. Fetch Send Order by ID
 */
export const fetchSendOrderById = async (
  orderId: string,
  accountId?: string
): Promise<{ success: boolean; data?: SendOrderUI; message?: string }> => {
  try {
    const headers = await getAuthHeaders(accountId);
    const res = await fetch(getApiUrl(`/send/orders/${orderId}`), {
      headers,
    });
    return await parseJsonResponse(res, "Gagal memuat pesanan");
  } catch (error: any) {
    console.error("fetchSendOrderById error:", error);
    return { success: false, message: error.message || "Gagal memuat detail pesanan." };
  }
};

/**
 * 5. Cancel Send Order
 */
export const cancelSendOrder = async (
  orderId: string,
  reason: string,
  accountId?: string
): Promise<{ success: boolean; data?: SendOrderUI; message?: string }> => {
  try {
    const headers = await getAuthHeaders(accountId);
    const res = await fetch(getApiUrl(`/send/orders/${orderId}/cancel`), {
      method: "POST",
      headers,
      body: JSON.stringify({ reason }),
    });
    return await parseJsonResponse(res, "Gagal membatalkan pesanan");
  } catch (error: any) {
    console.error("cancelSendOrder error:", error);
    return { success: false, message: error.message || "Gagal membatalkan pesanan." };
  }
};

/**
 * 6. Submit Rating & Review
 */
export const submitSendRating = async (
  orderId: string,
  score: number,
  review: string,
  accountId?: string
): Promise<{ success: boolean; data?: SendOrderUI; message?: string }> => {
  try {
    const headers = await getAuthHeaders(accountId);
    const res = await fetch(getApiUrl(`/send/orders/${orderId}/rating`), {
      method: "POST",
      headers,
      body: JSON.stringify({ score, review }),
    });
    return await parseJsonResponse(res, "Gagal mengirimkan rating");
  } catch (error: any) {
    console.error("submitSendRating error:", error);
    return { success: false, message: error.message || "Gagal mengirimkan rating." };
  }
};

/**
 * 7. Submit Complaint
 */
export const submitSendComplaint = async (
  orderId: string,
  complaint: { category: string; description: string; attachments?: string[] },
  accountId?: string
): Promise<{ success: boolean; data?: any; message?: string }> => {
  try {
    const headers = await getAuthHeaders(accountId);
    const res = await fetch(getApiUrl(`/send/orders/${orderId}/complaints`), {
      method: "POST",
      headers,
      body: JSON.stringify(complaint),
    });
    return await parseJsonResponse(res, "Gagal mengirimkan komplain");
  } catch (error: any) {
    console.error("submitSendComplaint error:", error);
    return { success: false, message: error.message || "Gagal mengirimkan komplain." };
  }
};

/**
 * 8. Driver: Fetch Available Send Orders
 */
export const fetchAvailableSendOrders = async (
  accountId?: string
): Promise<{ success: boolean; data?: SendOrderUI[]; message?: string }> => {
  try {
    const headers = await getAuthHeaders(accountId);
    const res = await fetch(getApiUrl("/send/orders/available"), {
      headers,
    });
    return await parseJsonResponse(res, "Gagal memuat order pengiriman");
  } catch (error: any) {
    console.error("fetchAvailableSendOrders error:", error);
    return { success: false, message: error.message || "Gagal memuat order pengiriman yang tersedia." };
  }
};

/**
 * 9. Driver: Accept Send Order (Atomic)
 */
export const acceptSendOrder = async (
  orderId: string,
  driverId: string,
  accountId?: string
): Promise<{ success: boolean; data?: SendOrderUI; message?: string }> => {
  try {
    const headers = await getAuthHeaders(accountId);
    const res = await fetch(getApiUrl(`/send/orders/${orderId}/accept`), {
      method: "POST",
      headers,
      body: JSON.stringify({ driverId }),
    });
    return await parseJsonResponse(res, "Gagal menerima pesanan");
  } catch (error: any) {
    console.error("acceptSendOrder error:", error);
    return { success: false, message: error.message || "Gagal menerima order pengiriman." };
  }
};

/**
 * 10. Driver: Verify Pickup Code
 */
export const verifySendPickupCode = async (
  orderId: string,
  pickupCode: string,
  proofPhotoUrl?: string,
  accountId?: string
): Promise<{ success: boolean; data?: SendOrderUI; message?: string }> => {
  try {
    const headers = await getAuthHeaders(accountId);
    const res = await fetch(getApiUrl(`/send/orders/${orderId}/verify-pickup`), {
      method: "POST",
      headers,
      body: JSON.stringify({ pickupCode, proofPhotoUrl }),
    });
    return await parseJsonResponse(res, "Gagal verifikasi kode pickup");
  } catch (error: any) {
    console.error("verifySendPickupCode error:", error);
    return { success: false, message: error.message || "Gagal memverifikasi kode pickup." };
  }
};

/**
 * 11. Driver: Verify Delivery OTP
 */
export const verifySendDeliveryOtp = async (
  orderId: string,
  deliveryOtp: string,
  deliveryProofUrl?: string,
  accountId?: string
): Promise<{ success: boolean; data?: SendOrderUI; message?: string }> => {
  try {
    const headers = await getAuthHeaders(accountId);
    const res = await fetch(getApiUrl(`/send/orders/${orderId}/verify-delivery`), {
      method: "POST",
      headers,
      body: JSON.stringify({ deliveryOtp, deliveryProofUrl }),
    });
    return await parseJsonResponse(res, "Gagal verifikasi OTP");
  } catch (error: any) {
    console.error("verifySendDeliveryOtp error:", error);
    return { success: false, message: error.message || "Gagal memverifikasi OTP delivery." };
  }
};

/**
 * 12. Driver: Update Live Location
 */
export const updateSendDriverLocation = async (
  orderId: string,
  coords: { latitude: number; longitude: number; heading?: number; speed?: number },
  accountId?: string
): Promise<{ success: boolean; message?: string }> => {
  try {
    const headers = await getAuthHeaders(accountId);
    const res = await fetch(getApiUrl(`/send/orders/${orderId}/location`), {
      method: "PUT",
      headers,
      body: JSON.stringify(coords),
    });
    return await parseJsonResponse(res, "Gagal update lokasi driver");
  } catch (error: any) {
    console.error("updateSendDriverLocation error:", error);
    return { success: false, message: error.message || "Gagal memperbarui koordinat driver." };
  }
};

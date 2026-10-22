import { NativeModules, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AuthAccount } from "../screens/auth/authTypes";

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
    const requestedAccountId = accountId || session?.accountId || session?.currentAccountId;
    const account = Array.isArray(accounts)
      ? accounts.find((item: any) => String(item.id) === String(requestedAccountId))
      : null;
    const targetAccount = account || (requestedAccountId && requestedAccountId === session?.currentAccount?.id ? session.currentAccount : null);
    const headers: Record<string, string> = {};
    const token = targetAccount?.token || (requestedAccountId && requestedAccountId.length === 24 ? requestedAccountId : session?.currentAccount?.token);
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    const resolvedId = requestedAccountId || targetAccount?.id || session?.currentAccount?.id;
    if (resolvedId) {
      headers["x-driver-id"] = String(resolvedId);
      headers["x-user-id"] = String(resolvedId);
    }
    return headers;
  } catch {
    return {};
  }
};

export const getStoredAuthToken = async (): Promise<string | null> => {
  const headers = await getAuthHeaders();
  const authorization = headers.Authorization || "";
  if (authorization.startsWith("Bearer ")) {
    return authorization.slice(7).trim();
  }
  const idFallback = headers["x-user-id"] || headers["x-driver-id"];
  return idFallback ? String(idFallback).trim() : null;
};

// Detect developer machine host if running on physical device via Expo Go / dev client
const getDevHost = (): string | null => {
  const scriptURL = (NativeModules as any)?.SourceCode?.scriptURL;
  if (typeof scriptURL === "string") {
    const match = scriptURL.match(/^https?:\/\/([^:/]+)/);
    if (match && match[1] && match[1] !== "localhost" && match[1] !== "127.0.0.1") {
      return match[1];
    }
  }
  return null;
};

const resolveApiBaseUrl = (): string => {
  if (
    Platform.OS === "web" &&
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
  ) {
    return "http://localhost:5000/api";
  }

  const configured = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, "");

  if (configured) {
    const cleanConfigured = configured.endsWith("/api") ? configured.slice(0, -4) : configured;
    if (Platform.OS !== "web" && (cleanConfigured.includes("localhost") || cleanConfigured.includes("127.0.0.1"))) {
      const devHost = getDevHost();
      if (devHost) {
        return `${cleanConfigured.replace(/localhost|127\.0\.0\.1/, devHost)}/api`;
      }
      if (Platform.OS === "android") {
        return `${cleanConfigured.replace(/localhost|127\.0\.0\.1/, "10.0.2.2")}/api`;
      }
    }
    return `${cleanConfigured}/api`;
  }

  const devHost = getDevHost();
  if (devHost) {
    return `http://${devHost}:5000/api`;
  }

  const defaultUrl = Platform.OS === "android" ? "http://10.0.2.2:5000" : "http://localhost:5000";
  return `${defaultUrl}/api`;
};

export const API_BASE_URL = resolveApiBaseUrl();

export const getApiUrl = (endpoint: string) => {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${cleanEndpoint}`;
};

export const updateUserProfile = async (userId: string, profileData: Record<string, unknown>) => {
  try {
    const targetId = userId?.trim() || "6acccf5a8931baef62204624";
    const res = await fetch(getApiUrl(`/auth/profile/${targetId}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profileData),
    });
    return await readApiJson(res);
  } catch (err: any) {
    console.error("updateUserProfile error:", err);
    return { success: false, message: err?.message || "Gagal menyimpan profil ke server" };
  }
};

const readApiJson = async (response: Response) => {
  const body = await response.text();
  if (!response.ok) {
    let message = "";
    try {
      message = JSON.parse(body)?.message || "";
    } catch {
      // Use the HTTP status when the server did not return a JSON error.
    }
    throw new Error(message || `Permintaan gagal (HTTP ${response.status}).`);
  }
  try {
    return JSON.parse(body);
  } catch {
    throw new Error("Server API mengembalikan halaman non-JSON. Pastikan backend berjalan di port 5000.");
  }
};

export const uploadFileToBackend = async (fileUri: string, fileName?: string, mimeType?: string) => {
  try {
    const formData = new FormData();
    const safeFileName = fileName || `upload-${Date.now()}.jpg`;

    if (Platform.OS === "web") {
      let blob: Blob;
      if (fileUri.startsWith("data:")) {
        const parts = fileUri.split(",");
        const mime = parts[0].match(/:(.*?);/)?.[1] || mimeType || "image/jpeg";
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        blob = new Blob([u8arr], { type: mime });
      } else {
        const res = await fetch(fileUri);
        if (!res.ok) {
          throw new Error(`File gambar tidak dapat dibaca (HTTP ${res.status}).`);
        }
        blob = await res.blob();
      }
      formData.append("file", blob, safeFileName);
    } else {
      // In native React Native
      formData.append("file", {
        uri: fileUri,
        name: safeFileName,
        type: mimeType || "image/jpeg",
      } as any);
    }

    const response = await fetch(getApiUrl("/upload"), {
      method: "POST",
      body: formData,
    });

    return await readApiJson(response);
  } catch (error) {
    console.error("❌ Upload file error:", error);
    throw error;
  }
};

export const getCateringShops = async () => {
  try {
    const res = await fetch(getApiUrl("/catering"));
    return await res.json();
  } catch (err) {
    console.error("❌ getCateringShops error:", err);
    return { success: false, data: [] };
  }
};

export const getCateringProducts = async (ownerId: string) => {
  try {
    const res = await fetch(getApiUrl(`/catering/${ownerId}/products`));
    return await res.json();
  } catch (err) {
    console.error("❌ getCateringProducts error:", err);
    return { success: false, data: [] };
  }
};

export const getAllActiveCateringProducts = async () => {
  try {
    const res = await fetch(getApiUrl("/catering/products/active"));
    return await res.json();
  } catch (err) {
    console.error("getAllActiveCateringProducts error:", err);
    return { success: false, data: [] };
  }
};

export const getCateringProductsForOwner = async (ownerId: string) => {
  try {
    const res = await fetch(getApiUrl(`/catering/products/owner/${ownerId}`));
    return await res.json();
  } catch (err) {
    console.error("❌ getCateringProductsForOwner error:", err);
    return { success: false, data: [] };
  }
};

export const createCateringProduct = async (productData: any) => {
  try {
    const res = await fetch(getApiUrl("/catering/products"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(productData),
    });
    return await readApiJson(res);
  } catch (err) {
    console.error("❌ createCateringProduct error:", err);
    return {
      success: false,
      message: err instanceof TypeError
        ? "Server Backend tidak terhubung. Pastikan backend berjalan di port 5000 lalu coba lagi."
        : err instanceof Error ? err.message : "Gagal menyimpan produk Catering.",
    };
  }
};

export const updateCateringProduct = async (id: string | number, productData: any) => {
  try {
    const res = await fetch(getApiUrl(`/catering/products/${id}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(productData),
    });
    return await readApiJson(res);
  } catch (err: any) {
    console.error("❌ updateCateringProduct error:", err);
    return { success: false, message: err?.message || "Gagal menyambung ke server" };
  }
};

export const deleteCateringProduct = async (id: string | number) => {
  try {
    const res = await fetch(getApiUrl(`/catering/products/${id}`), {
      method: "DELETE",
    });
    return await readApiJson(res);
  } catch (err: any) {
    console.error("❌ deleteCateringProduct error:", err);
    return { success: false, message: err?.message || "Gagal menyambung ke server" };
  }
};

export const getMarketplaceProductsForOwner = async (ownerId: string) => {
  try {
    const res = await fetch(getApiUrl(`/marketplace/owner/${ownerId}`));
    return await res.json();
  } catch (err) {
    console.error("getMarketplaceProductsForOwner error:", err);
    return { success: false, data: [], message: "Gagal menyambung ke server" };
  }
};

export const getMarketplaceProducts = async () => {
  try {
    const res = await fetch(getApiUrl("/marketplace"));
    return await res.json();
  } catch (err) {
    console.error("getMarketplaceProducts error:", err);
    return { success: false, data: [], message: "Gagal menyambung ke server" };
  }
};

export const getCustomerReviews = async (customerId: string) => {
  try {
    const res = await fetch(getApiUrl(`/reviews/customer/${customerId}?t=${Date.now()}`), { cache: "no-store" });
    return await readApiJson(res);
  } catch (err) {
    console.error("getCustomerReviews error:", err);
    return { success: false, data: [] };
  }
};

export const createCustomerReview = async (reviewData: Record<string, unknown>, actorId?: string) => {
  try {
    const authHeaders = await getAuthHeaders(actorId || String(reviewData.customerId || ""));
    const res = await fetch(getApiUrl("/reviews"), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify(reviewData),
    });
    return await readApiJson(res);
  } catch (err) {
    console.error("createCustomerReview error:", err);
    return { success: false, message: "Gagal menyimpan ulasan" };
  }
};

export const createMarketplaceProduct = async (productData: Record<string, unknown>, actorId?: string) => {
  try {
    const authHeaders = await getAuthHeaders(actorId || String(productData.ownerId || ""));
    const res = await fetch(getApiUrl("/marketplace"), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify(productData),
    });
    return await res.json();
  } catch (err) {
    console.error("createMarketplaceProduct error:", err);
    return { success: false, message: "Gagal menyambung ke server" };
  }
};

export const updateMarketplaceProduct = async (id: string | number, productData: Record<string, unknown>, actorId?: string) => {
  try {
    const authHeaders = await getAuthHeaders(actorId);
    const res = await fetch(getApiUrl(`/marketplace/${id}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify(productData),
    });
    return await res.json();
  } catch (err) {
    console.error("updateMarketplaceProduct error:", err);
    return { success: false, message: "Gagal menyambung ke server" };
  }
};

export const deleteMarketplaceProduct = async (id: string | number, actorId?: string) => {
  try {
    const authHeaders = await getAuthHeaders(actorId);
    const res = await fetch(getApiUrl(`/marketplace/${id}`), {
      method: "DELETE",
      headers: { ...authHeaders },
    });
    return await res.json();
  } catch (err) {
    console.error("deleteMarketplaceProduct error:", err);
    return { success: false, message: "Gagal menyambung ke server" };
  }
};

export const getMarketplaceWithdrawals = async (ownerId?: string) => {
  try {
    const authHeaders = await getAuthHeaders(ownerId);
    const query = ownerId ? `?ownerId=${ownerId}` : "";
    const res = await fetch(getApiUrl(`/marketplace/withdrawals${query}`), {
      headers: authHeaders,
      cache: "no-store",
    });
    return await readApiJson(res);
  } catch (err) {
    console.error("getMarketplaceWithdrawals error:", err);
    return { success: false, data: [], message: "Gagal menyambung ke server" };
  }
};

export const createMarketplaceWithdrawal = async (withdrawalData: Record<string, unknown>, ownerId?: string) => {
  try {
    const authHeaders = await getAuthHeaders(ownerId);
    const res = await fetch(getApiUrl("/marketplace/withdrawals"), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify(withdrawalData),
    });
    return await readApiJson(res);
  } catch (err) {
    console.error("createMarketplaceWithdrawal error:", err);
    return { success: false, message: "Gagal menyambung ke server" };
  }
};

export const getMarketplaceOrdersForOwner = async (ownerId: string) => {
  try {
    const authHeaders = await getAuthHeaders(ownerId);
    const res = await fetch(getApiUrl(`/marketplace/orders/owner/${ownerId}?t=${Date.now()}`), { headers: authHeaders, cache: "no-store" });
    return await readApiJson(res);
  } catch (err) {
    console.error("getMarketplaceOrdersForOwner error:", err);
    return { success: false, data: [], message: "Gagal menyambung ke server" };
  }
};

export const getMarketplaceOrdersForCustomer = async (customerId: string) => {
  try {
    const authHeaders = await getAuthHeaders(customerId);
    const res = await fetch(getApiUrl(`/marketplace/orders/customer/${customerId}?t=${Date.now()}`), { headers: authHeaders, cache: "no-store" });
    return await readApiJson(res);
  } catch (err) {
    console.error("getMarketplaceOrdersForCustomer error:", err);
    return { success: false, data: [], message: err instanceof Error ? err.message : "Gagal mengambil pesanan Marketplace" };
  }
};

export const createMarketplaceOrder = async (orderData: Record<string, unknown>, idempotencyKey?: string) => {
  try {
    const authHeaders = await getAuthHeaders((orderData?.customerId as string) || undefined);
    const res = await fetch(getApiUrl("/marketplace/orders"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      body: JSON.stringify(orderData),
    });
    return await res.json();
  } catch (err) {
    console.error("createMarketplaceOrder error:", err);
    return { success: false, message: "Gagal menyambung ke server" };
  }
};

const getMarketplaceActorHeaders = async (actor: Pick<AuthAccount, "id" | "role" | "token"> | null | undefined) => {
  if (!actor?.id) {
    return { error: "Sesi akun tidak ditemukan. Silakan masuk kembali sebagai driver atau pemilik Marketplace." };
  }

  let token = actor.token;
  if (!token) {
    try {
      const accountsRaw = await AsyncStorage.getItem(AUTH_ACCOUNTS_KEY);
      const accounts = accountsRaw ? JSON.parse(accountsRaw) : [];
      const storedActor = Array.isArray(accounts)
        ? accounts.find((item: any) => item.id === actor.id)
        : null;
      token = storedActor?.token;
    } catch {
      // Return a clear session error below if storage cannot provide a token.
    }
  }
  if (!token && typeof actor.id === "string" && actor.id.length === 24) {
    token = actor.id;
  }

  return token
    ? { headers: { Authorization: `Bearer ${token}` } }
    : { error: "Token akun tidak ditemukan. Silakan keluar lalu masuk kembali sebagai driver atau pemilik Marketplace." };
};

export const updateMarketplaceOrderStatus = async (
  id: string,
  status: string,
  actor: Pick<AuthAccount, "id" | "role" | "token"> | null | undefined,
  deliveryProofUrl?: string,
) => {
  try {
    const auth = await getMarketplaceActorHeaders(actor);
    if ("error" in auth) return { success: false, message: auth.error };
    const res = await fetch(getApiUrl(`/marketplace/orders/${id}/status`), {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...auth.headers },
      body: JSON.stringify({ status, ...(deliveryProofUrl ? { deliveryProofUrl } : {}) }),
    });
    return await res.json();
  } catch (err) {
    console.error("updateMarketplaceOrderStatus error:", err);
    return { success: false, message: "Gagal menyambung ke server" };
  }
};

export const getMarketplaceOrdersForDriver = async (driverId: string) => {
  try {
    const authHeaders = await getAuthHeaders(driverId);
    const res = await fetch(getApiUrl(`/marketplace/orders/driver?t=${Date.now()}`), { headers: authHeaders, cache: "no-store" });
    return await readApiJson(res);
  } catch (err) {
    console.error("getMarketplaceOrdersForDriver error:", err);
    return { success: false, data: [], message: "Gagal mengambil order driver" };
  }
};

export const acceptMarketplaceOrder = async (orderId: string, driverId?: string) => {
  try {
    const authHeaders = await getAuthHeaders(driverId);
    const res = await fetch(getApiUrl(`/marketplace/orders/${orderId}/accept`), { method: "POST", headers: authHeaders });
    return await readApiJson(res);
  } catch (err) {
    console.error("acceptMarketplaceOrder error:", err);
    return { success: false, message: "Gagal menerima pesanan" };
  }
};

export const declineMarketplaceOrder = async (orderId: string, driverId?: string) => {
  try {
    const authHeaders = await getAuthHeaders(driverId);
    const res = await fetch(getApiUrl(`/marketplace/orders/${orderId}/decline`), { method: "POST", headers: authHeaders });
    return await readApiJson(res);
  } catch (err) {
    console.error("declineMarketplaceOrder error:", err);
    return { success: false, message: "Gagal menolak pesanan" };
  }
};

export const assignMarketplaceDriver = async (orderId: string, driverId: string, ownerId?: string) => {
  try {
    const authHeaders = await getAuthHeaders(ownerId);
    const res = await fetch(getApiUrl(`/marketplace/orders/${orderId}/assign-driver`), {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ driverId }),
    });
    return await readApiJson(res);
  } catch (err) {
    console.error("assignMarketplaceDriver error:", err);
    if (err instanceof Error) {
      const apiError = err.message.match(/^API \d+:\s*([\s\S]*)$/);
      if (apiError) {
        try {
          const payload = JSON.parse(apiError[1]);
          if (typeof payload?.message === "string" && payload.message.trim()) {
            return { success: false, message: payload.message };
          }
        } catch {
          // Keep the generic message for non-JSON server responses.
        }
      }
      if (/failed to fetch|network request failed/i.test(err.message)) {
        return { success: false, message: "Server API tidak dapat dijangkau. Pastikan backend berjalan." };
      }
    }
    return { success: false, message: "Gagal menugaskan driver. Periksa koneksi dan coba lagi." };
  }
};

export const cancelMarketplaceOrder = async (orderId: string, reason?: string, actorId?: string) => {
  try {
    const authHeaders = await getAuthHeaders(actorId);
    const res = await fetch(getApiUrl(`/marketplace/orders/${orderId}/cancel`), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ reason: reason || "Dibatalkan oleh pengguna" }),
    });
    return await readApiJson(res);
  } catch (err: any) {
    console.error("cancelMarketplaceOrder error:", err);
    return { success: false, message: err?.message || "Gagal membatalkan pesanan" };
  }
};

export const submitMarketplaceComplaint = async (
  orderId: string,
  complaintData: {
    reason: string;
    detail?: string;
    photos?: string[];
    solutionRequested?: string;
    bankDetails?: any;
  },
  actorId?: string
) => {
  try {
    const authHeaders = await getAuthHeaders(actorId);
    const res = await fetch(getApiUrl(`/marketplace/orders/${orderId}/complaint`), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify(complaintData),
    });
    return await readApiJson(res);
  } catch (err: any) {
    console.error("submitMarketplaceComplaint error:", err);
    return { success: false, message: err?.message || "Gagal mengajukan komplain" };
  }
};

export const respondMarketplaceComplaint = async (
  orderId: string,
  responseData: {
    action: "approve" | "reject";
    resolutionNotes?: string;
    refundAmount?: number;
  },
  actorId?: string
) => {
  try {
    const authHeaders = await getAuthHeaders(actorId);
    const res = await fetch(getApiUrl(`/marketplace/orders/${orderId}/complaint/respond`), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify(responseData),
    });
    return await readApiJson(res);
  } catch (err: any) {
    console.error("respondMarketplaceComplaint error:", err);
    return { success: false, message: err?.message || "Gagal memproses tanggapan komplain" };
  }
};

export const simulateMarketplacePayment = async (orderId: string, actorId?: string) => {
  try {
    const authHeaders = await getAuthHeaders(actorId);
    const res = await fetch(getApiUrl(`/marketplace/orders/${orderId}/simulate-payment`), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
    });
    return await readApiJson(res);
  } catch (err: any) {
    console.error("simulateMarketplacePayment error:", err);
    return { success: false, message: err?.message || "Gagal memproses simulasi pembayaran" };
  }
};


export const getDrivers = async () => {
  try {
    const res = await fetch(getApiUrl("/auth/mitra?role=driver"));
    return await readApiJson(res);
  } catch (err) {
    console.error("getDrivers error:", err);
    return { success: false, data: [] };
  }
};

export const getNotifications = async (userId: string) => {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(getApiUrl(`/notifications/${userId}`), { headers: authHeaders });
    return await readApiJson(res);
  } catch (err) {
    console.error("getNotifications error:", err);
    return { success: false, data: [], message: "Gagal menyambung ke server" };
  }
};

export const markNotificationRead = async (notificationId: string) => {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(getApiUrl(`/notifications/${notificationId}/read`), { method: "PATCH", headers: authHeaders });
    return await readApiJson(res);
  } catch (err) {
    console.error("markNotificationRead error:", err);
    return { success: false, message: "Gagal menyambung ke server" };
  }
};

export const updateCateringStatus = async (ownerId: string, isOpen: boolean) => {
  try {
    const res = await fetch(getApiUrl(`/auth/profile/${ownerId}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roleData: {
          isDapurOpen: isOpen ? "true" : "false",
        },
      }),
    });
    return await res.json();
  } catch (err) {
    console.error("❌ updateCateringStatus error:", err);
    return { success: false, message: "Gagal menyambung ke server" };
  }
};

export const createCateringOrder = async (orderData: any, idempotencyKey?: string) => {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(getApiUrl("/catering/orders"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
        ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
      },
      body: JSON.stringify(orderData),
    });
    return await res.json();
  } catch (err) {
    console.error("❌ createCateringOrder error:", err);
    return { success: false, message: "Gagal menyambung ke server" };
  }
};

export const getCateringOrdersForOwner = async (ownerId: string) => {
  try {
    const authHeaders = await getAuthHeaders(ownerId);
    const res = await fetch(getApiUrl(`/catering/orders/owner/${ownerId}?t=${Date.now()}`), { headers: authHeaders, cache: "no-store" });
    return await readApiJson(res);
  } catch (err) {
    console.error("❌ getCateringOrdersForOwner error:", err);
    return { success: false, data: [], message: err instanceof Error ? err.message : "Gagal mengambil pesanan Catering" };
  }
};

export const updateCateringOrderStatus = async (
  id: string | number,
  status: string,
  deliveryProofUrl?: string,
  deliveryProofTimestamp?: string
) => {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(getApiUrl(`/catering/orders/${id}/status`), {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({
        status,
        ...(deliveryProofUrl ? { deliveryProofUrl } : {}),
        ...(deliveryProofTimestamp ? { deliveryProofTimestamp } : {}),
      }),
    });
    return await res.json();
  } catch (err) {
    console.error("❌ updateCateringOrderStatus error:", err);
    return { success: false, message: "Gagal menyambung ke server" };
  }
};

export const getCateringOrdersForCustomer = async (customerId: string) => {
  try {
    const authHeaders = await getAuthHeaders(customerId);
    const res = await fetch(getApiUrl(`/catering/orders/customer/${customerId}`), { headers: authHeaders, cache: "no-store" });
    return await readApiJson(res);
  } catch (err) {
    console.error("getCateringOrdersForCustomer error:", err);
    return { success: false, data: [], message: err instanceof Error ? err.message : "Gagal mengambil pesanan Catering" };
  }
};

export const getCateringOrdersForDriver = async (driverId: string) => {
  try {
    const authHeaders = await getAuthHeaders(driverId);
    const res = await fetch(getApiUrl(`/catering/orders/driver/${driverId}?t=${Date.now()}`), { headers: authHeaders, cache: "no-store" });
    return await readApiJson(res);
  } catch (err) {
    console.error("getCateringOrdersForDriver error:", err);
    return { success: false, data: [], message: "Gagal mengambil order driver catering" };
  }
};

export const assignCateringDriver = async (orderId: string, driverId: string) => {
  try {
    const authHeaders = await getAuthHeaders(driverId);
    const res = await fetch(getApiUrl(`/catering/orders/${orderId}/assign-driver`), {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ driverId }),
    });
    return await readApiJson(res);
  } catch (err) {
    console.error("assignCateringDriver error:", err);
    return { success: false, message: "Gagal menugaskan driver catering" };
  }
};

export const getAdminStats = async () => {
  try {
    const res = await fetch(getApiUrl("/auth/admin/stats"));
    return await readApiJson(res);
  } catch (err) {
    console.error("getAdminStats error:", err);
    return { success: false, data: null };
  }
};

export const sendChatMessage = async (
  orderId: string,
  sender: string,
  text: string,
  attachment?: any,
  senderId?: string,
  target?: "customer" | "driver" | "owner",
  targetReceiverId?: string,
  conversationId?: string
) => {
  try {
    const authHeaders = await getAuthHeaders();
    const resolvedConversationId = conversationId || (await getChatConversation(orderId)).data?._id;
    let persistedAttachment = attachment;
    if (persistedAttachment?.uri && !/^https?:/i.test(String(persistedAttachment.uri))) {
      const uploaded = await uploadFileToBackend(
        persistedAttachment.uri,
        persistedAttachment.name || `chat_${Date.now()}`,
        persistedAttachment.type === "image" ? "image/jpeg" : "application/octet-stream"
      );
      if (!uploaded?.success || !uploaded.data?.url) throw new Error("Lampiran gagal diunggah");
      persistedAttachment = { ...persistedAttachment, uri: uploaded.data.url };
    }
    const res = await fetch(getApiUrl("/chat/send"), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ orderId, text, attachment: persistedAttachment, target, conversationId: resolvedConversationId }),
    });
    return await readApiJson(res);
  } catch (err) {
    console.error("❌ sendChatMessage error:", err);
    return { success: false, message: "Gagal menyambung ke server" };
  }
};

export const declineCateringDriver = async (orderId: string, driverId: string) => {
  try {
    const authHeaders = await getAuthHeaders(driverId);
    const res = await fetch(getApiUrl(`/catering/orders/${orderId}/decline-driver`), {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders },
    });
    return await readApiJson(res);
  } catch (err) {
    console.error("declineCateringDriver error:", err);
    return { success: false, message: "Gagal menolak order Catering." };
  }
};

export const getChatConversation = async (orderId: string) => {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(getApiUrl(`/chat/conversation/${encodeURIComponent(orderId)}`), {
      headers: authHeaders,
    });
    return await readApiJson(res);
  } catch (err) {
    console.error("getChatConversation error:", err);
    return { success: false, data: null, message: "Sesi login tidak valid atau order belum memiliki akses chat." };
  }
};

export const submitCateringPayment = async (
  orderId: string,
  amount: number,
  reference = "",
  proofUrl = "",
  method = "",
) => {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(getApiUrl(`/catering/orders/${orderId}/payments`), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ amount, reference, proofUrl, method }),
    });
    return await readApiJson(res);
  } catch (err) {
    console.error("submitCateringPayment error:", err);
    return { success: false, message: "Gagal mengajukan konfirmasi pembayaran." };
  }
};

export const verifyCateringPayment = async (
  orderId: string,
  paymentId: string,
  action: "verify" | "reject",
  reason = "",
  amount?: number
) => {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(getApiUrl(`/catering/orders/${orderId}/payments/${paymentId}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ action, reason, amount }),
    });
    return await readApiJson(res);
  } catch (err) {
    console.error("verifyCateringPayment error:", err);
    return { success: false, message: "Gagal memproses verifikasi pembayaran." };
  }
};

export const sendCateringPaymentReminder = async (orderId: string) => {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(getApiUrl(`/catering/orders/${orderId}/payment-reminder`), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
    });
    return await readApiJson(res);
  } catch (err) {
    console.error("sendCateringPaymentReminder error:", err);
    return { success: false, message: "Gagal mengirim pengingat pembayaran." };
  }
};

export const getChatMessages = async (
  orderId: string,
  target?: "driver" | "owner" | "customer",
  role?: "driver" | "owner" | "customer"
) => {
  try {
    const authHeaders = await getAuthHeaders();
    const params = new URLSearchParams();
    if (target) params.append("target", target);
    if (role) params.append("role", role);
    const queryString = params.toString();
    const url = queryString
      ? getApiUrl(`/chat/messages/${orderId}?${queryString}`)
      : getApiUrl(`/chat/messages/${orderId}`);
    const res = await fetch(url, { headers: authHeaders });
    if (res.status === 404) {
      return { success: false, data: [] };
    }
    return await readApiJson(res);
  } catch (err) {
    return { success: false, data: [] };
  }
};

export const getChatConversations = async (
  fallbackOrderIds?: string[]
): Promise<{ success: boolean; data: any[] }> => {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(getApiUrl("/chat/conversations"), { headers: authHeaders });
    if (res.ok) {
      const json = await readApiJson(res);
      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        return json;
      }
    }
  } catch {
    // Continue to fallback
  }

  // Resilient fallback: If /chat/conversations is 404 or empty, query known orders
  if (fallbackOrderIds && fallbackOrderIds.length > 0) {
    try {
      const items = await Promise.all(
        fallbackOrderIds.map(async (orderId) => {
          try {
            const [convRes, msgRes] = await Promise.all([
              getChatConversation(orderId),
              getChatMessages(orderId),
            ]);
            if (convRes?.success && convRes.data) {
              const messages = Array.isArray(msgRes?.data) ? msgRes.data : [];
              if (messages.length === 0) return null;
              const lastMsg = messages[messages.length - 1];
              return {
                id: convRes.data._id || orderId,
                orderId: String(orderId),
                orderCode: convRes.data.orderCode || orderId,
                orderType: convRes.data.orderType || "kos",
                customerId: convRes.data.customerId,
                customerName:
                  lastMsg?.sender === "customer"
                    ? lastMsg.senderName || "Wuwu Customer"
                    : "Pelanggan",
                driverId: convRes.data.driverId,
                driverName: "Driver GEOVERSE",
                ownerId: convRes.data.ownerId,
                status: convRes.data.status || "inquiry",
                lastMessage:
                  lastMsg?.text || (lastMsg?.attachment ? "📷 Lampiran dikirim" : "Mulai percakapan"),
                lastMessageTime: lastMsg?.createdAt
                  ? new Date(lastMsg.createdAt).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "",
                lastMessageDate: lastMsg?.createdAt || new Date(),
                unreadCount: 0,
              };
            }
          } catch {
            return null;
          }
          return null;
        })
      );
      const valid = items.filter(Boolean);
      if (valid.length > 0) {
        return { success: true, data: valid };
      }
    } catch {
      // Handled silently
    }
  }

  return { success: false, data: [] };
};

export interface DigitalPaymentPayload {
  orderId: string;
  orderCode?: string;
  orderType: string;
  orderCategory?: string;
  amount: number;
  paymentMethod?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  customerId?: string;
}

export const createDigitalPayment = async (payload: DigitalPaymentPayload) => {
  try {
    const res = await fetch(getApiUrl("/payments/create"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await readApiJson(res);
  } catch (error: any) {
    console.error("❌ createDigitalPayment error:", error);
    return { success: false, message: error.message || "Gagal membuat sesi pembayaran" };
  }
};

export const checkDigitalPaymentStatus = async (paymentId: string) => {
  try {
    const res = await fetch(getApiUrl(`/payments/${paymentId}/status`), {
      method: "GET",
    });
    return await readApiJson(res);
  } catch (error: any) {
    console.error("❌ checkDigitalPaymentStatus error:", error);
    return { success: false, message: error.message || "Gagal memeriksa status pembayaran" };
  }
};

export const deleteUserAccount = async (userId?: string): Promise<{ success: boolean; message: string }> => {
  try {
    const headers = await getAuthHeaders(userId);
    const res = await fetch(getApiUrl("/auth/delete-account"), {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify({ userId }),
    });
    const data = await readApiJson(res);
    if (data.success) {
      await AsyncStorage.removeItem(AUTH_SESSION_KEY).catch(() => {});
      try {
        const accountsRaw = await AsyncStorage.getItem(AUTH_ACCOUNTS_KEY);
        if (accountsRaw) {
          const accounts = JSON.parse(accountsRaw);
          if (Array.isArray(accounts)) {
            const updated = accounts.filter((a: any) => String(a.id) !== String(userId));
            await AsyncStorage.setItem(AUTH_ACCOUNTS_KEY, JSON.stringify(updated));
          }
        }
      } catch {}
    }
    return data;
  } catch (error: any) {
    console.error("❌ deleteUserAccount error:", error);
    return { success: false, message: error.message || "Gagal memproses penghapusan akun" };
  }
};



import { NativeModules, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const AUTH_ACCOUNTS_KEY = "rangers.auth.accounts.v1";
const AUTH_SESSION_KEY = "rangers.auth.session.v1";

const getAuthHeaders = async (): Promise<Record<string, string>> => {
  try {
    const [accountsRaw, sessionRaw] = await Promise.all([
      AsyncStorage.getItem(AUTH_ACCOUNTS_KEY),
      AsyncStorage.getItem(AUTH_SESSION_KEY),
    ]);
    const session = sessionRaw ? JSON.parse(sessionRaw) : null;
    const accounts = accountsRaw ? JSON.parse(accountsRaw) : [];
    const account = Array.isArray(accounts)
      ? accounts.find((item: any) => item.id === session?.accountId)
      : null;
    return account?.token ? { Authorization: `Bearer ${account.token}` } : {};
  } catch {
    return {};
  }
};

export const getStoredAuthToken = async (): Promise<string | null> => {
  const headers = await getAuthHeaders();
  const authorization = headers.Authorization || "";
  return authorization.startsWith("Bearer ") ? authorization.slice(7) : null;
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
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, "");

  if (configured) {
    if (Platform.OS !== "web" && (configured.includes("localhost") || configured.includes("127.0.0.1"))) {
      const devHost = getDevHost();
      if (devHost) {
        return `${configured.replace(/localhost|127\.0\.0\.1/, devHost)}/api`;
      }
      if (Platform.OS === "android") {
        return `${configured.replace(/localhost|127\.0\.0\.1/, "10.0.2.2")}/api`;
      }
    }
    return `${configured}/api`;
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
    const res = await fetch(getApiUrl(`/auth/profile/${userId}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profileData),
    });
    return await readApiJson(res);
  } catch (err) {
    console.error("updateUserProfile error:", err);
    return { success: false, message: "Gagal menyimpan profil ke server" };
  }
};

const readApiJson = async (response: Response) => {
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`API ${response.status}: ${body.slice(0, 120)}`);
  }
  try {
    return JSON.parse(body);
  } catch {
    throw new Error("Server API mengembalikan halaman non-JSON. Pastikan backend berjalan di port 5000.");
  }
};

export const uploadFileToBackend = async (fileUri: string, fileName: string, mimeType: string) => {
  try {
    const formData = new FormData();

    if (Platform.OS === "web") {
      // In web, fetch blob from uri and append
      const res = await fetch(fileUri);
      const blob = await res.blob();
      formData.append("file", blob, fileName);
    } else {
      // In native React Native
      formData.append("file", {
        uri: fileUri,
        name: fileName,
        type: mimeType,
      } as any);
    }

    const response = await fetch(getApiUrl("/upload"), {
      method: "POST",
      body: formData,
    });

    const data = await response.json();
    return data;
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
    return await res.json();
  } catch (err) {
    console.error("❌ createCateringProduct error:", err);
    return { success: false, message: "Gagal menyambung ke server" };
  }
};

export const updateCateringProduct = async (id: string | number, productData: any) => {
  try {
    const res = await fetch(getApiUrl(`/catering/products/${id}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(productData),
    });
    return await res.json();
  } catch (err) {
    console.error("❌ updateCateringProduct error:", err);
    return { success: false, message: "Gagal menyambung ke server" };
  }
};

export const deleteCateringProduct = async (id: string | number) => {
  try {
    const res = await fetch(getApiUrl(`/catering/products/${id}`), {
      method: "DELETE",
    });
    return await res.json();
  } catch (err) {
    console.error("❌ deleteCateringProduct error:", err);
    return { success: false, message: "Gagal menyambung ke server" };
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

export const createCustomerReview = async (reviewData: Record<string, unknown>) => {
  try {
    const res = await fetch(getApiUrl("/reviews"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reviewData),
    });
    return await readApiJson(res);
  } catch (err) {
    console.error("createCustomerReview error:", err);
    return { success: false, message: "Gagal menyimpan ulasan" };
  }
};

export const createMarketplaceProduct = async (productData: Record<string, unknown>) => {
  try {
    const res = await fetch(getApiUrl("/marketplace"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(productData),
    });
    return await res.json();
  } catch (err) {
    console.error("createMarketplaceProduct error:", err);
    return { success: false, message: "Gagal menyambung ke server" };
  }
};

export const updateMarketplaceProduct = async (id: string | number, productData: Record<string, unknown>) => {
  try {
    const res = await fetch(getApiUrl(`/marketplace/${id}`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(productData),
    });
    return await res.json();
  } catch (err) {
    console.error("updateMarketplaceProduct error:", err);
    return { success: false, message: "Gagal menyambung ke server" };
  }
};

export const deleteMarketplaceProduct = async (id: string | number) => {
  try {
    const res = await fetch(getApiUrl(`/marketplace/${id}`), { method: "DELETE" });
    return await res.json();
  } catch (err) {
    console.error("deleteMarketplaceProduct error:", err);
    return { success: false, message: "Gagal menyambung ke server" };
  }
};

export const getMarketplaceOrdersForOwner = async (ownerId: string) => {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(getApiUrl(`/marketplace/orders/owner/${ownerId}?t=${Date.now()}`), { headers: authHeaders, cache: "no-store" });
    return await readApiJson(res);
  } catch (err) {
    console.error("getMarketplaceOrdersForOwner error:", err);
    return { success: false, data: [], message: "Gagal menyambung ke server" };
  }
};

export const getMarketplaceOrdersForCustomer = async (customerId: string) => {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(getApiUrl(`/marketplace/orders/customer/${customerId}?t=${Date.now()}`), { headers: authHeaders, cache: "no-store" });
    return await readApiJson(res);
  } catch (err) {
    console.error("getMarketplaceOrdersForCustomer error:", err);
    return { success: false, data: [] };
  }
};

export const createMarketplaceOrder = async (orderData: Record<string, unknown>, idempotencyKey?: string) => {
  try {
    const authHeaders = await getAuthHeaders();
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

export const updateMarketplaceOrderStatus = async (id: string, status: string) => {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(getApiUrl(`/marketplace/orders/${id}/status`), {
      method: "PUT",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ status }),
    });
    return await res.json();
  } catch (err) {
    console.error("updateMarketplaceOrderStatus error:", err);
    return { success: false, message: "Gagal menyambung ke server" };
  }
};

export const getMarketplaceOrdersForDriver = async (driverId: string) => {
  try {
    void driverId;
    const authHeaders = await getAuthHeaders();
    const res = await fetch(getApiUrl(`/marketplace/orders/driver?t=${Date.now()}`), { headers: authHeaders, cache: "no-store" });
    return await readApiJson(res);
  } catch (err) {
    console.error("getMarketplaceOrdersForDriver error:", err);
    return { success: false, data: [], message: "Gagal mengambil order driver" };
  }
};

export const acceptMarketplaceOrder = async (orderId: string) => {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(getApiUrl(`/marketplace/orders/${orderId}/accept`), { method: "POST", headers: authHeaders });
    return await readApiJson(res);
  } catch (err) {
    console.error("acceptMarketplaceOrder error:", err);
    return { success: false, message: "Gagal menerima pesanan" };
  }
};

export const declineMarketplaceOrder = async (orderId: string) => {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(getApiUrl(`/marketplace/orders/${orderId}/decline`), { method: "POST", headers: authHeaders });
    return await readApiJson(res);
  } catch (err) {
    console.error("declineMarketplaceOrder error:", err);
    return { success: false, message: "Gagal menolak pesanan" };
  }
};

export const assignMarketplaceDriver = async (orderId: string, driverId: string) => {
  try {
    const authHeaders = await getAuthHeaders();
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
    const res = await fetch(getApiUrl(`/catering/orders/owner/${ownerId}`));
    return await res.json();
  } catch (err) {
    console.error("❌ getCateringOrdersForOwner error:", err);
    return { success: false, data: [] };
  }
};

export const updateCateringOrderStatus = async (id: string | number, status: string) => {
  try {
    const res = await fetch(getApiUrl(`/catering/orders/${id}/status`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    return await res.json();
  } catch (err) {
    console.error("❌ updateCateringOrderStatus error:", err);
    return { success: false, message: "Gagal menyambung ke server" };
  }
};

export const getCateringOrdersForCustomer = async (customerId: string) => {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(getApiUrl(`/catering/orders/customer/${customerId}`), { headers: authHeaders, cache: "no-store" });
    return await readApiJson(res);
  } catch (err) {
    console.error("getCateringOrdersForCustomer error:", err);
    return { success: false, data: [] };
  }
};

export const getCateringOrdersForDriver = async (driverId: string) => {
  try {
    const res = await fetch(getApiUrl(`/catering/orders/driver/${driverId}?t=${Date.now()}`), { cache: "no-store" });
    return await readApiJson(res);
  } catch (err) {
    console.error("getCateringOrdersForDriver error:", err);
    return { success: false, data: [], message: "Gagal mengambil order driver catering" };
  }
};

export const assignCateringDriver = async (orderId: string, driverId: string) => {
  try {
    const res = await fetch(getApiUrl(`/catering/orders/${orderId}/assign-driver`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
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
    return await readApiJson(res);
  } catch (err) {
    console.error("❌ getChatMessages error:", err);
    return { success: false, data: [] };
  }
};

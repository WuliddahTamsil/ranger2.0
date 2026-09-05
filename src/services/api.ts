import { Platform } from "react-native";

// Set EXPO_PUBLIC_API_URL to the computer's LAN address when using a physical device.
const configuredApiUrl = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, "");
const defaultApiUrl = Platform.OS === "android" ? "http://10.0.2.2:5000" : "http://localhost:5000";
export const API_BASE_URL = `${configuredApiUrl || defaultApiUrl}/api`;

export const getApiUrl = (endpoint: string) => {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${cleanEndpoint}`;
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
    const res = await fetch(getApiUrl(`/marketplace/orders/owner/${ownerId}?t=${Date.now()}`), { cache: "no-store" });
    return await res.json();
  } catch (err) {
    console.error("getMarketplaceOrdersForOwner error:", err);
    return { success: false, data: [], message: "Gagal menyambung ke server" };
  }
};

export const getMarketplaceOrdersForCustomer = async (customerId: string) => {
  try {
    const res = await fetch(getApiUrl(`/marketplace/orders/customer/${customerId}?t=${Date.now()}`), { cache: "no-store" });
    return await readApiJson(res);
  } catch (err) {
    console.error("getMarketplaceOrdersForCustomer error:", err);
    return { success: false, data: [] };
  }
};

export const createMarketplaceOrder = async (orderData: Record<string, unknown>) => {
  try {
    const res = await fetch(getApiUrl("/marketplace/orders"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    const res = await fetch(getApiUrl(`/marketplace/orders/${id}/status`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
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
    const res = await fetch(getApiUrl(`/marketplace/orders/driver/${driverId}?t=${Date.now()}`), { cache: "no-store" });
    return await readApiJson(res);
  } catch (err) {
    console.error("getMarketplaceOrdersForDriver error:", err);
    return { success: false, data: [], message: "Gagal mengambil order driver" };
  }
};

export const assignMarketplaceDriver = async (orderId: string, driverId: string) => {
  try {
    const res = await fetch(getApiUrl(`/marketplace/orders/${orderId}/assign-driver`), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ driverId }),
    });
    return await readApiJson(res);
  } catch (err) {
    console.error("assignMarketplaceDriver error:", err);
    return { success: false, message: "Gagal menugaskan driver" };
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
    const res = await fetch(getApiUrl(`/notifications/${userId}`));
    return await res.json();
  } catch (err) {
    console.error("getNotifications error:", err);
    return { success: false, data: [], message: "Gagal menyambung ke server" };
  }
};

export const markNotificationRead = async (notificationId: string) => {
  try {
    const res = await fetch(getApiUrl(`/notifications/${notificationId}/read`), { method: "PATCH" });
    return await res.json();
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

export const createCateringOrder = async (orderData: any) => {
  try {
    const res = await fetch(getApiUrl("/catering/orders"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
    const res = await fetch(getApiUrl(`/catering/orders/customer/${customerId}`));
    return await readApiJson(res);
  } catch (err) {
    console.error("getCateringOrdersForCustomer error:", err);
    return { success: false, data: [] };
  }
};

export const sendChatMessage = async (orderId: string, sender: string, text: string, attachment?: any, senderId?: string) => {
  try {
    const res = await fetch(getApiUrl("/chat/send"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, sender, senderId, text, attachment }),
    });
    return await readApiJson(res);
  } catch (err) {
    console.error("❌ sendChatMessage error:", err);
    return { success: false, message: "Gagal menyambung ke server" };
  }
};

export const getChatMessages = async (orderId: string) => {
  try {
    const res = await fetch(getApiUrl(`/chat/messages/${orderId}`));
    return await readApiJson(res);
  } catch (err) {
    console.error("❌ getChatMessages error:", err);
    return { success: false, data: [] };
  }
};

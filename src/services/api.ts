import { Platform } from "react-native";

// In Android emulator use 10.0.2.2, for web/iOS simulator use localhost
export const API_BASE_URL = Platform.OS === "android" ? "http://10.0.2.2:5000/api" : "http://localhost:5000/api";

export const getApiUrl = (endpoint: string) => {
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${cleanEndpoint}`;
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

export const sendChatMessage = async (orderId: string, sender: string, text: string, attachment?: any) => {
  try {
    const res = await fetch(getApiUrl("/chat/send"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, sender, text, attachment }),
    });
    return await res.json();
  } catch (err) {
    console.error("❌ sendChatMessage error:", err);
    return { success: false, message: "Gagal menyambung ke server" };
  }
};

export const getChatMessages = async (orderId: string) => {
  try {
    const res = await fetch(getApiUrl(`/chat/messages/${orderId}`));
    return await res.json();
  } catch (err) {
    console.error("❌ getChatMessages error:", err);
    return { success: false, data: [] };
  }
};

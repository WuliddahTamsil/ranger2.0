import { getApiUrl, getStoredAuthToken } from "./api";

const getHeaders = async () => {
  const token = await getStoredAuthToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

export interface ShopStore {
  _id: string;
  name: string;
  storeType: "SUPERMARKET" | "MINIMARKET" | "PHARMACY" | "HEALTH" | "BABY" | "BEAUTY" | "HOUSEHOLD" | "UMKM" | "OTHER";
  logo: string;
  coverImage: string;
  description?: string;
  address: string;
  latitude: number;
  longitude: number;
  rating: number;
  reviewCount: number;
  minimumOrder: number;
  deliveryRadiusKm: number;
  isOpen: boolean;
  estimatedDeliveryMinutes: number;
  deliveryFee: number;
  distanceKm?: number;
  isVerified?: boolean;
  isOfficialPharmacy?: boolean;
  pharmacistName?: string;
  pharmacistSipa?: string;
  openingHours?: {
    openTime: string;
    closeTime: string;
    daysOpen: string[];
    isOpenNow: boolean;
  };
}

export interface ShopProduct {
  _id: string;
  storeId: string;
  ownerId?: string;
  name: string;
  brand?: string;
  category: string;
  description?: string;
  price: number;
  promoPrice?: number | null;
  stock: number;
  unit: string;
  weight: number;
  isActive: boolean;
  requiresPrescription: boolean;
  isEcoProduct?: boolean;
  img: string;
  images?: string[];
  imageUrls?: string[];
  rating: number;
  sold: number;
}

export interface ShopOrderItem {
  productId: string;
  productNameSnapshot: string;
  productImageSnapshot?: string;
  priceSnapshot: number;
  quantity: number;
  subtotal: number;
  notes?: string;
  requestedSubstitution?: string;
  actualAvailability?: string;
  replacementProductId?: string;
  replacementProductName?: string;
}

export interface ShopOrder {
  _id: string;
  orderCode: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  storeId: ShopStore | string;
  storeName: string;
  storeAddress?: string;
  driverId?: any;
  driverName?: string;
  driverPhone?: string;
  driverPhoto?: string;
  driverPlateNumber?: string;
  items: ShopOrderItem[];
  deliveryAddress: string;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  deliveryNotes?: string;
  deliverySlot?: {
    type: "INSTANT" | "SCHEDULED";
    scheduledDate?: string;
    timeSlot?: string;
  };
  substitutionPolicy?: string;
  subtotal: number;
  discount: number;
  voucherCode?: string;
  voucherDiscount: number;
  pointDiscount: number;
  deliveryFee: number;
  serviceFee: number;
  driverTip?: number;
  totalAmount: number;
  paymentId?: string;
  paymentMethod: string;
  paymentStatus: string;
  orderStatus: string;
  statusHistory: Array<{
    status: string;
    actorId?: string;
    actorRole?: string;
    note?: string;
    timestamp: string;
  }>;
  prescriptionId?: any;
  substitutionProposal?: {
    items: Array<any>;
    customerApproved?: boolean | null;
    proposedAt?: string;
  };
  pickupProofUrl?: string;
  deliveryProofUrl?: string;
  driverLocation?: {
    latitude: number;
    longitude: number;
    updatedAt: string;
  };
  rating?: {
    stars: number;
    review: string;
    ratedAt: string;
  };
  createdAt: string;
  completedAt?: string;
}

export const fetchShopStores = async (params: {
  latitude?: number;
  longitude?: number;
  storeType?: string;
  query?: string;
  openNow?: boolean;
  sortBy?: "nearest" | "fastest" | "rating" | "cheapest_fee";
} = {}): Promise<{ success: boolean; data: ShopStore[]; message?: string }> => {
  try {
    const queryParts: string[] = [];
    if (params.latitude !== undefined) queryParts.push(`latitude=${params.latitude}`);
    if (params.longitude !== undefined) queryParts.push(`longitude=${params.longitude}`);
    if (params.storeType) queryParts.push(`storeType=${encodeURIComponent(params.storeType)}`);
    if (params.query) queryParts.push(`query=${encodeURIComponent(params.query)}`);
    if (params.openNow) queryParts.push(`openNow=true`);
    if (params.sortBy) queryParts.push(`sortBy=${params.sortBy}`);

    const url = getApiUrl(`/shop/stores${queryParts.length ? `?${queryParts.join("&")}` : ""}`);
    const res = await fetch(url, { headers: await getHeaders() });
    return await res.json();
  } catch (error: any) {
    console.error("fetchShopStores error:", error);
    return { success: false, data: [], message: error.message };
  }
};

export const fetchShopStoreDetail = async (
  storeId: string,
  coords?: { latitude: number; longitude: number }
): Promise<{ success: boolean; data?: ShopStore; message?: string }> => {
  try {
    const query = coords ? `?latitude=${coords.latitude}&longitude=${coords.longitude}` : "";
    const url = getApiUrl(`/shop/stores/${storeId}${query}`);
    const res = await fetch(url, { headers: await getHeaders() });
    return await res.json();
  } catch (error: any) {
    console.error("fetchShopStoreDetail error:", error);
    return { success: false, message: error.message };
  }
};

export const fetchStoreProducts = async (
  storeId: string,
  params: { category?: string; query?: string; page?: number; limit?: number } = {}
): Promise<{ success: boolean; data: ShopProduct[]; categories?: string[]; message?: string }> => {
  try {
    const queryParts: string[] = [];
    if (params.category) queryParts.push(`category=${encodeURIComponent(params.category)}`);
    if (params.query) queryParts.push(`query=${encodeURIComponent(params.query)}`);
    if (params.page) queryParts.push(`page=${params.page}`);
    if (params.limit) queryParts.push(`limit=${params.limit}`);

    const url = getApiUrl(`/shop/stores/${storeId}/products${queryParts.length ? `?${queryParts.join("&")}` : ""}`);
    const res = await fetch(url, { headers: await getHeaders() });
    return await res.json();
  } catch (error: any) {
    console.error("fetchStoreProducts error:", error);
    return { success: false, data: [], categories: [], message: error.message };
  }
};

export const fetchShopCategories = async () => {
  try {
    const url = getApiUrl(`/shop/categories`);
    const res = await fetch(url, { headers: await getHeaders() });
    return await res.json();
  } catch (error: any) {
    return { success: false, data: [] };
  }
};

export const searchShopCatalog = async (query: string, category = "") => {
  try {
    const url = getApiUrl(`/shop/search?q=${encodeURIComponent(query)}&category=${encodeURIComponent(category)}`);
    const res = await fetch(url, { headers: await getHeaders() });
    return await res.json();
  } catch (error: any) {
    return { success: false, products: [], stores: [] };
  }
};

export const fetchShopProductDetail = async (productId: string) => {
  try {
    const url = getApiUrl(`/shop/products/${productId}`);
    const res = await fetch(url, { headers: await getHeaders() });
    return await res.json();
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const createShopOrder = async (payload: any) => {
  try {
    const url = getApiUrl(`/shop/orders`);
    const res = await fetch(url, {
      method: "POST",
      headers: await getHeaders(),
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const fetchCustomerShopOrders = async (customerId: string) => {
  try {
    const url = getApiUrl(`/shop/orders/customer/${customerId}`);
    const res = await fetch(url, { headers: await getHeaders() });
    return await res.json();
  } catch (error: any) {
    return { success: false, data: [] };
  }
};

export const fetchShopOrderDetail = async (orderId: string) => {
  try {
    const url = getApiUrl(`/shop/orders/${orderId}`);
    const res = await fetch(url, { headers: await getHeaders() });
    return await res.json();
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const cancelShopOrder = async (orderId: string, reason: string) => {
  try {
    const url = getApiUrl(`/shop/orders/${orderId}/cancel`);
    const res = await fetch(url, {
      method: "POST",
      headers: await getHeaders(),
      body: JSON.stringify({ reason }),
    });
    return await res.json();
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const submitShopComplaint = async (orderId: string, payload: any) => {
  try {
    const url = getApiUrl(`/shop/orders/${orderId}/complaint`);
    const res = await fetch(url, {
      method: "POST",
      headers: await getHeaders(),
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const submitShopRating = async (orderId: string, stars: number, review: string) => {
  try {
    const url = getApiUrl(`/shop/orders/${orderId}/rating`);
    const res = await fetch(url, {
      method: "POST",
      headers: await getHeaders(),
      body: JSON.stringify({ stars, review }),
    });
    return await res.json();
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

export const submitPrescription = async (payload: {
  storeId: string;
  doctorName?: string;
  prescriptionDate?: string;
  imageUrls: string[];
  customerNotes?: string;
}) => {
  try {
    const url = getApiUrl(`/shop/prescriptions`);
    const res = await fetch(url, {
      method: "POST",
      headers: await getHeaders(),
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (error: any) {
    return { success: false, message: error.message };
  }
};

/**
 * Driver: Fetch Shop Orders (Available & Assigned)
 */
export const fetchDriverShopOrders = async (
  driverId?: string
): Promise<{ success: boolean; data?: any[]; message?: string }> => {
  try {
    const url = getApiUrl(`/shop/driver/orders`);
    const headers = await getHeaders();
    const res = await fetch(url, {
      headers: {
        ...headers,
        ...(driverId ? { "x-driver-id": driverId } : {}),
      },
    });
    const json = await res.json();
    if (json.success && json.data) {
      const list = Array.isArray(json.data)
        ? json.data
        : [
            ...(Array.isArray(json.data.availableOrders) ? json.data.availableOrders : []),
            ...(Array.isArray(json.data.driverOrders) ? json.data.driverOrders : []),
            ...(json.data.activeOrder ? [json.data.activeOrder] : []),
          ];
      // Deduplicate by _id
      const map = new Map<string, any>();
      for (const item of list) {
        const id = String(item?._id || item?.id || "");
        if (id && !map.has(id)) {
          map.set(id, item);
        }
      }
      return { success: true, data: Array.from(map.values()) };
    }
    return { success: false, data: [] };
  } catch (error: any) {
    return { success: false, data: [], message: error.message };
  }
};

/**
 * Driver: Accept a Shop Order
 */
export const acceptDriverShopOrder = async (
  orderId: string
): Promise<{ success: boolean; data?: any; message?: string }> => {
  try {
    const url = getApiUrl(`/shop/orders/${orderId}/accept-driver`);
    const headers = await getHeaders();
    const res = await fetch(url, {
      method: "POST",
      headers,
    });
    const json = await res.json();
    return json;
  } catch (error: any) {
    return { success: false, message: error.message || "Gagal mengambil pesanan belanja" };
  }
};

/**
 * Driver: Update Shop Order Delivery Status
 */
export const updateDriverShopStatus = async (
  orderId: string,
  status: string,
  note = ""
): Promise<{ success: boolean; data?: any; message?: string }> => {
  try {
    const url = getApiUrl(`/shop/orders/${orderId}/driver-status`);
    const headers = await getHeaders();
    const res = await fetch(url, {
      method: "PUT",
      headers,
      body: JSON.stringify({ status, note }),
    });
    const json = await res.json();
    return json;
  } catch (error: any) {
    return { success: false, message: error.message || "Gagal memperbarui status pengantaran belanja" };
  }
};


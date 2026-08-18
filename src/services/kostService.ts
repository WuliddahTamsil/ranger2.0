import { getApiUrl } from "./api";

export interface KostData {
  _id?: string;
  id?: string | number;
  ownerId: any;
  name: string;
  type: "Putra" | "Putri" | "Campur";
  address: string;
  city?: string;
  district?: string;
  price: number;
  dpAmount?: number;
  description?: string;
  facilities: string[];
  rules: string[];
  images: string[];
  bankAccount?: {
    bankName: string;
    accountNumber: string;
    accountHolder: string;
    qrisImage?: string;
  };
  rooms?: Array<{
    _id?: string;
    roomNumber: string;
    roomType: string;
    floor: number;
    priceMonthly: number;
    priceYearly?: number;
    isAvailable: boolean;
    facilities?: string[];
  }>;
  rating?: number;
  reviewCount?: number;
}

export interface BookingData {
  _id?: string;
  bookingCode?: string;
  customerId: string;
  kostId: string;
  roomId?: string;
  roomNumber?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerKtpUrl?: string;
  entryDate: string;
  durationMonths: number;
  monthlyPrice: number;
  totalAmount: number;
  dpAmount: number;
  dpProofImage?: string;
  status?: "pending_dp" | "dp_submitted" | "dp_verified" | "rejected" | "active" | "completed" | "cancelled";
  rejectionReason?: string;
  createdAt?: string;
  kostIdDetails?: any;
}

export const fetchAllKosts = async (params?: { search?: string; type?: string; city?: string }) => {
  try {
    const query = new URLSearchParams();
    if (params?.search) query.append("search", params.search);
    if (params?.type && params.type !== "Semua") query.append("type", params.type);
    if (params?.city) query.append("city", params.city);

    const url = getApiUrl(`/kosts?${query.toString()}`);
    const response = await fetch(url);
    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error("❌ fetchAllKosts error:", error);
    return [];
  }
};

export const fetchKostById = async (id: string) => {
  try {
    const url = getApiUrl(`/kosts/${id}`);
    const response = await fetch(url);
    const result = await response.json();
    return result.data || null;
  } catch (error) {
    console.error("❌ fetchKostById error:", error);
    return null;
  }
};

export const fetchKostsByOwner = async (ownerId: string) => {
  try {
    const url = getApiUrl(`/kosts/owner/${ownerId}`);
    const response = await fetch(url);
    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error("❌ fetchKostsByOwner error:", error);
    return [];
  }
};

export const createNewKost = async (data: Partial<KostData>) => {
  try {
    const url = getApiUrl("/kosts");
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return await response.json();
  } catch (error) {
    console.error("❌ createNewKost error:", error);
    throw error;
  }
};

export const createKostBooking = async (data: BookingData) => {
  try {
    const url = getApiUrl("/bookings");
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return await response.json();
  } catch (error) {
    console.error("❌ createKostBooking error:", error);
    throw error;
  }
};

export const fetchOwnerBookings = async (ownerId: string, status?: string) => {
  try {
    const query = status ? `?status=${status}` : "";
    const url = getApiUrl(`/bookings/owner/${ownerId}${query}`);
    const response = await fetch(url);
    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error("❌ fetchOwnerBookings error:", error);
    return [];
  }
};

export const verifyDpBooking = async (bookingId: string, status: "dp_verified" | "rejected", rejectionReason?: string) => {
  try {
    const url = getApiUrl(`/bookings/${bookingId}/verify-dp`);
    const response = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, rejectionReason }),
    });
    return await response.json();
  } catch (error) {
    console.error("❌ verifyDpBooking error:", error);
    throw error;
  }
};

export const fetchCustomerBookings = async (customerId: string) => {
  try {
    const url = getApiUrl(`/bookings/customer/${customerId}`);
    const response = await fetch(url);
    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.error("❌ fetchCustomerBookings error:", error);
    return [];
  }
};

// =================== ROOMS API ===================
export const fetchRoomsByOwner = async (ownerId: string) => {
  try {
    const url = getApiUrl(`/kosts/rooms/${ownerId}`);
    const response = await fetch(url);
    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.warn("fetchRoomsByOwner offline fallback:", error);
    return [];
  }
};

export const addRoomToKost = async (ownerId: string, roomData: any) => {
  try {
    const url = getApiUrl(`/kosts/rooms/${ownerId}`);
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(roomData),
    });
    return await response.json();
  } catch (error) {
    console.error("❌ addRoomToKost error:", error);
    throw error;
  }
};

export const updateRoomInKost = async (ownerId: string, roomId: string, updateData: any) => {
  try {
    const url = getApiUrl(`/kosts/rooms/${ownerId}/${roomId}`);
    const response = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updateData),
    });
    return await response.json();
  } catch (error) {
    console.error("❌ updateRoomInKost error:", error);
    throw error;
  }
};

export const deleteRoomFromKost = async (ownerId: string, roomId: string) => {
  try {
    const url = getApiUrl(`/kosts/rooms/${ownerId}/${roomId}`);
    const response = await fetch(url, { method: "DELETE" });
    return await response.json();
  } catch (error) {
    console.error("❌ deleteRoomFromKost error:", error);
    throw error;
  }
};

// =================== TENANTS API ===================
export const fetchTenantsByOwner = async (ownerId: string) => {
  try {
    const url = getApiUrl(`/kosts/tenants/${ownerId}`);
    const response = await fetch(url);
    const result = await response.json();
    return result.data || [];
  } catch (error) {
    console.warn("fetchTenantsByOwner offline fallback:", error);
    return [];
  }
};

export const addTenantToKost = async (ownerId: string, tenantData: any) => {
  try {
    const url = getApiUrl(`/kosts/tenants/${ownerId}`);
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tenantData),
    });
    return await response.json();
  } catch (error) {
    console.error("❌ addTenantToKost error:", error);
    throw error;
  }
};

export const deleteTenantFromKost = async (ownerId: string, tenantId: string) => {
  try {
    const url = getApiUrl(`/kosts/tenants/${ownerId}/${tenantId}`);
    const response = await fetch(url, { method: "DELETE" });
    return await response.json();
  } catch (error) {
    console.error("❌ deleteTenantFromKost error:", error);
    throw error;
  }
};

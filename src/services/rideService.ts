import { API_BASE_URL, getApiUrl } from "./api";
import AsyncStorage from "@react-native-async-storage/async-storage";

const AUTH_ACCOUNTS_KEY = "rangers.auth.accounts.v1";
const AUTH_SESSION_KEY = "rangers.auth.session.v1";

export interface RideLocation {
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  placeName?: string;
}

export interface CreateRideParams {
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  pickup: RideLocation;
  destination: RideLocation;
  customerNote?: string;
  vehicleType?: "MOTOR" | "CAR";
  paymentMethod?: string;
  estimatedDistance?: number;
  estimatedDuration?: number;
  estimatedFare?: number;
}

export type RideStatus =
  | "SEARCHING_DRIVER"
  | "DRIVER_ASSIGNED"
  | "DRIVER_ON_THE_WAY"
  | "DRIVER_ARRIVED"
  | "TRIP_STARTED"
  | "COMPLETED"
  | "CANCELLED";

export interface RideOrderData {
  _id: string;
  id?: string;
  orderCode: string;
  orderType: string;
  serviceType: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  driverId?: string | null;
  driverName?: string;
  driverPhone?: string;
  driverPhoto?: string;
  driverRating?: number;
  driverVehicle?: string;
  driverPlate?: string;
  vehicleType: "MOTOR" | "CAR";
  pickup: RideLocation;
  destination: RideLocation;
  customerNote?: string;
  estimatedDistance: number;
  estimatedDuration: number;
  estimatedFare: number;
  totalAmount: number;
  driverEarnings: number;
  paymentMethod: string;
  paymentStatus: string;
  status: RideStatus;
  rating?: number | null;
  review?: string;
  cancelledBy?: string | null;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
}

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
      ? accounts.find((item: any) => String(item.id || item._id) === String(requestedAccountId))
      : null;
    const token = account?.token || session?.token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
};

const readJson = async (res: Response) => {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Permintaan gagal (HTTP ${res.status}): ${text.slice(0, 100)}`);
  }
};

// Distance calculation helper (Haversine in km)
export const calculateDistance = (
  lat1?: number | null,
  lon1?: number | null,
  lat2?: number | null,
  lon2?: number | null
): number => {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 0;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};

// Standard fare calculation formula:
// Base Rp 8.000 for first 2 km, + Rp 2.500 per subsequent km
export const calculateRideFare = (distanceKm: number): number => {
  const safeDist = Math.max(0.5, Number(distanceKm) || 2);
  const baseKm = 2;
  const baseFare = 8000;
  const ratePerKm = 2500;

  let fare = baseFare;
  if (safeDist > baseKm) {
    fare += Math.round((safeDist - baseKm) * ratePerKm);
  }
  return Math.ceil(fare / 1000) * 1000;
};

// Create a new Kanyaah Ride booking
export const createRideBooking = async (
  params: CreateRideParams
): Promise<{ success: boolean; data?: RideOrderData; message?: string }> => {
  try {
    const headers = await getAuthHeaders(params.customerId);
    const res = await fetch(getApiUrl("/rides"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(params),
    });
    return await readJson(res);
  } catch (err: any) {
    console.error("createRideBooking error:", err);
    return { success: false, message: err.message || "Gagal membuat pesanan Kanyaah Ride" };
  }
};

// Fetch customer ride order history
export const fetchCustomerRides = async (
  customerId: string
): Promise<{ success: boolean; data?: RideOrderData[]; message?: string }> => {
  try {
    const headers = await getAuthHeaders(customerId);
    const res = await fetch(getApiUrl(`/rides/customer/${customerId}?t=${Date.now()}`), {
      headers,
      cache: "no-store",
    });
    return await readJson(res);
  } catch (err: any) {
    console.error("fetchCustomerRides error:", err);
    return { success: false, data: [], message: err.message || "Gagal memuat riwayat Kanyaah Ride" };
  }
};

// Fetch currently active ride for customer (if any)
export const fetchActiveCustomerRide = async (
  customerId: string
): Promise<{ success: boolean; data?: RideOrderData | null; message?: string }> => {
  try {
    const headers = await getAuthHeaders(customerId);
    const res = await fetch(getApiUrl(`/rides/active/customer/${customerId}?t=${Date.now()}`), {
      headers,
      cache: "no-store",
    });
    return await readJson(res);
  } catch (err: any) {
    console.error("fetchActiveCustomerRide error:", err);
    return { success: false, data: null, message: err.message || "Gagal mengecek perjalanan aktif" };
  }
};

// Fetch available and assigned rides for driver
export const fetchDriverRides = async (
  driverId: string
): Promise<{ success: boolean; data?: RideOrderData[]; message?: string }> => {
  try {
    const headers = await getAuthHeaders(driverId);
    const res = await fetch(getApiUrl(`/rides/driver/${driverId}?t=${Date.now()}`), {
      headers,
      cache: "no-store",
    });
    return await readJson(res);
  } catch (err: any) {
    console.error("fetchDriverRides error:", err);
    return { success: false, data: [], message: err.message || "Gagal memuat order Kanyaah Ride driver" };
  }
};

// Fetch single ride details by order ID
export const fetchRideDetail = async (
  orderId: string
): Promise<{ success: boolean; data?: RideOrderData; message?: string }> => {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(getApiUrl(`/rides/${orderId}?t=${Date.now()}`), {
      headers,
      cache: "no-store",
    });
    return await readJson(res);
  } catch (err: any) {
    console.error("fetchRideDetail error:", err);
    return { success: false, message: err.message || "Gagal memuat detail perjalanan" };
  }
};

// Driver accepts a ride atomically
export const acceptRide = async (
  orderId: string,
  driverId?: string
): Promise<{ success: boolean; data?: RideOrderData; message?: string }> => {
  try {
    const headers = await getAuthHeaders(driverId);
    const res = await fetch(getApiUrl(`/rides/${orderId}/accept`), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    });
    return await readJson(res);
  } catch (err: any) {
    console.error("acceptRide error:", err);
    return { success: false, message: err.message || "Gagal menerima pesanan" };
  }
};

// Driver declines a ride
export const declineRide = async (
  orderId: string,
  driverId?: string
): Promise<{ success: boolean; data?: RideOrderData; message?: string }> => {
  try {
    const headers = await getAuthHeaders(driverId);
    const res = await fetch(getApiUrl(`/rides/${orderId}/decline`), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    });
    return await readJson(res);
  } catch (err: any) {
    console.error("declineRide error:", err);
    return { success: false, message: err.message || "Gagal menolak pesanan" };
  }
};

// Update ride status (Driver transitions & Cancel)
export const updateRideStatus = async (
  orderId: string,
  status: RideOrderData["status"],
  cancelReason?: string,
  actorId?: string
): Promise<{ success: boolean; data?: RideOrderData; message?: string }> => {
  try {
    const headers = await getAuthHeaders(actorId);
    const res = await fetch(getApiUrl(`/rides/${orderId}/status`), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify({ status, cancelReason }),
    });
    return await readJson(res);
  } catch (err: any) {
    console.error("updateRideStatus error:", err);
    return { success: false, message: err.message || "Gagal memperbarui status perjalanan" };
  }
};

// Rate a completed ride (Customer)
export const rateRide = async (
  orderId: string,
  rating: number,
  review?: string
): Promise<{ success: boolean; data?: RideOrderData; message?: string }> => {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(getApiUrl(`/rides/${orderId}/rating`), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify({ rating, review }),
    });
    return await readJson(res);
  } catch (err: any) {
    console.error("rateRide error:", err);
    return { success: false, message: err.message || "Gagal mengirim penilaian" };
  }
};

// Estimate fare from backend
export const estimateFare = async (
  pickup: RideLocation,
  destination: RideLocation
): Promise<{
  success: boolean;
  data?: {
    distanceKm: number;
    estimatedDuration: number;
    estimatedFare: number;
    formattedFare: string;
  };
  message?: string;
}> => {
  try {
    const res = await fetch(getApiUrl("/rides/fare-estimate"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pickup, destination }),
    });
    return await readJson(res);
  } catch (err: any) {
    console.error("estimateFare error:", err);
    return { success: false, message: err.message || "Gagal menghitung estimasi tarif" };
  }
};

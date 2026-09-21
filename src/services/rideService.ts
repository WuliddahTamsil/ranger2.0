import { API_BASE_URL, getApiUrl } from "./api";
import AsyncStorage from "@react-native-async-storage/async-storage";

const AUTH_ACCOUNTS_KEY = "rangers.auth.accounts.v1";
const AUTH_SESSION_KEY = "rangers.auth.session.v1";

export interface RideLocation {
  address: string;
  latitude?: number | null;
  longitude?: number | null;
  placeName?: string;
  notes?: string;
}

export interface CreateRideParams {
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  pickup: RideLocation;
  destination: RideLocation;
  customerNote?: string;
  vehicleType?: "MOTOR" | "MOBIL" | "CAR";
  paymentMethod?: string;
  discount?: number;
  estimatedDistance?: number;
  estimatedDuration?: number;
  routeDistanceKm?: number;
  routeDurationMinutes?: number;
  estimatedFare?: number;
}

export type RideStatus =
  | "SEARCHING_DRIVER"
  | "DRIVER_ASSIGNED"
  | "DRIVER_ON_THE_WAY"
  | "DRIVER_ARRIVED"
  | "TRIP_STARTED"
  | "COMPLETED"
  | "CANCELLED"
  | "DISPUTED";

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
  driverSnapshot?: {
    name: string;
    phone: string;
    photo: string;
    vehicleType: string;
    vehiclePlate: string;
    rating: number;
  };
  driverLocation?: {
    latitude: number;
    longitude: number;
    heading?: number | null;
    speed?: number | null;
    updatedAt?: string | Date;
  };
  vehicleType: "MOTOR" | "MOBIL" | "CAR";
  pickup: RideLocation;
  destination: RideLocation;
  customerNote?: string;
  estimatedDistance: number;
  estimatedDuration: number;
  estimatedDistanceKm?: number;
  estimatedDurationMinutes?: number;
  baseFare?: number;
  distanceFare?: number;
  timeFare?: number;
  serviceFee?: number;
  discount?: number;
  estimatedFare: number;
  totalAmount: number;
  finalFare?: number;
  actualDistanceKm?: number;
  actualDurationMinutes?: number;
  driverEarnings: number;
  paymentId?: string | null;
  paymentMethod: string;
  paymentStatus: string;
  status: RideStatus;
  rating?: {
    score: number;
    review?: string;
    createdAt?: string | Date;
  } | number | null;
  review?: string;
  cancellation?: {
    cancelledBy: string;
    reason: string;
    fee: number;
    refundAmount?: number;
    cancelledAt?: string | Date;
  };
  cancelledBy?: string | null;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
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

// Client-side quick fare fallback formula:
export const calculateRideFare = (distanceKm: number, vehicleType: string = "MOTOR"): number => {
  const safeDist = Math.max(0.5, Number(distanceKm) || 2);
  const isCar = vehicleType === "MOBIL" || vehicleType === "CAR";
  const baseKm = 2;
  const baseFare = isCar ? 15000 : 8000;
  const ratePerKm = isCar ? 4500 : 2500;
  const minFare = isCar ? 20000 : 10000;

  let fare = baseFare;
  if (safeDist > baseKm) {
    fare += Math.round((safeDist - baseKm) * ratePerKm);
  }
  return Math.max(minFare, Math.ceil(fare / 1000) * 1000);
};

export interface FareEstimateResult {
  distanceKm: number;
  estimatedDurationMinutes: number;
  estimatedDuration: number;
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  serviceFee: number;
  discount: number;
  minimumFare: number;
  estimatedFare: number;
  formattedFare: string;
  currency: string;
}

export interface FareEstimateOptions {
  pickup: RideLocation;
  destination: RideLocation;
  vehicleType?: "MOTOR" | "MOBIL" | "CAR";
  discount?: number;
  routeDistanceKm?: number;
  routeDurationMinutes?: number;
}

// 1. Estimate Fare Breakdown from backend
export const estimateRideFareBreakdown = async (
  pickupOrOptions: RideLocation | FareEstimateOptions,
  destArg?: RideLocation,
  vehicleTypeArg: "MOTOR" | "MOBIL" | "CAR" = "MOTOR",
  discountArg: number = 0
): Promise<{
  success: boolean;
  data?: FareEstimateResult;
  message?: string;
}> => {
  try {
    let pickup: RideLocation;
    let destination: RideLocation;
    let vehicleType: string = "MOTOR";
    let discount: number = 0;

    if (destArg !== undefined) {
      pickup = pickupOrOptions as RideLocation;
      destination = destArg;
      vehicleType = vehicleTypeArg;
      discount = discountArg;
    } else {
      const opts = pickupOrOptions as FareEstimateOptions;
      pickup = opts.pickup;
      destination = opts.destination;
      vehicleType = opts.vehicleType || "MOTOR";
      discount = opts.discount || 0;
    }

    const res = await fetch(getApiUrl("/rides/fare-estimate"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pickup,
        destination,
        vehicleType,
        discount,
        routeDistanceKm: destArg === undefined ? (pickupOrOptions as FareEstimateOptions).routeDistanceKm : undefined,
        routeDurationMinutes: destArg === undefined ? (pickupOrOptions as FareEstimateOptions).routeDurationMinutes : undefined,
      }),
    });
    return await readJson(res);
  } catch (err: any) {
    console.error("estimateRideFareBreakdown error:", err);
    return { success: false, message: err.message || "Gagal menghitung estimasi tarif" };
  }
};

// Backwards-compatible alias
export const estimateFare = async (
  pickup: RideLocation,
  destination: RideLocation
) => {
  const res = await estimateRideFareBreakdown(pickup, destination, "MOTOR");
  if (res.success && res.data) {
    return {
      success: true,
      data: {
        distanceKm: res.data.distanceKm,
        estimatedDuration: res.data.estimatedDurationMinutes,
        estimatedFare: res.data.estimatedFare,
        formattedFare: res.data.formattedFare,
      },
    };
  }
  return { success: false, message: res.message };
};

// 2. Create Ride Booking
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

// 3. Fetch Customer Rides History
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

// 4. Fetch Currently Active Customer Ride
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

// 5. Fetch Driver Available & Assigned Rides
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

// 6. Fetch Single Ride Detail
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

// 7. Accept Ride Order (Driver Atomic)
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

// 8. Decline Ride Order (Driver)
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

// 9. Update Ride Status (Operational Workflow)
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

// 10. Update Driver Live GPS Location
export const updateDriverLocation = async (
  orderId: string,
  coords: { latitude: number; longitude: number; heading?: number | null; speed?: number | null },
  driverId?: string
): Promise<{ success: boolean; data?: any; message?: string }> => {
  try {
    const headers = await getAuthHeaders(driverId);
    const res = await fetch(getApiUrl(`/rides/${orderId}/location`), {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(coords),
    });
    return await readJson(res);
  } catch (err: any) {
    console.error("updateDriverLocation error:", err);
    return { success: false, message: err.message || "Gagal memperbarui lokasi driver" };
  }
};

export interface CancelRideOptions {
  reason: string;
  reasonDetail?: string;
  cancelledBy?: string;
}

// 11. Cancel Ride Order
export const cancelRide = async (
  orderId: string,
  reasonOrOptions: string | CancelRideOptions,
  reasonDetail?: string,
  actorId?: string
): Promise<{ success: boolean; data?: RideOrderData; message?: string }> => {
  try {
    const headers = await getAuthHeaders(actorId);
    let reason = "Dibatalkan";
    let detail = reasonDetail;
    let cancelledBy = "CUSTOMER";

    if (typeof reasonOrOptions === "object") {
      reason = reasonOrOptions.reason || reason;
      detail = reasonOrOptions.reasonDetail || detail;
      cancelledBy = reasonOrOptions.cancelledBy || cancelledBy;
    } else {
      reason = reasonOrOptions;
    }

    const res = await fetch(getApiUrl(`/rides/${orderId}/cancel`), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify({ reason, reasonDetail: detail, cancelledBy }),
    });
    return await readJson(res);
  } catch (err: any) {
    console.error("cancelRide error:", err);
    return { success: false, message: err.message || "Gagal membatalkan perjalanan" };
  }
};

// 12. Rate Ride Order
export const rateRide = async (
  orderId: string,
  rating: number,
  review?: string,
  customerId?: string
): Promise<{ success: boolean; data?: RideOrderData; message?: string }> => {
  try {
    const headers = await getAuthHeaders(customerId);
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

export interface SubmitComplaintOptions {
  category: string;
  description: string;
  attachments?: string[];
  customerId?: string;
}

// 13. Submit Ride Complaint
export const submitRideComplaint = async (
  orderId: string,
  categoryOrOptions: string | SubmitComplaintOptions,
  description?: string,
  attachments: string[] = [],
  customerId?: string
): Promise<{ success: boolean; data?: any; message?: string }> => {
  try {
    let category = "Tarif tidak sesuai";
    let desc = description || "";
    let att = attachments;
    let custId = customerId;

    if (typeof categoryOrOptions === "object") {
      category = categoryOrOptions.category || category;
      desc = categoryOrOptions.description || desc;
      att = categoryOrOptions.attachments || att;
      custId = categoryOrOptions.customerId || custId;
    } else {
      category = categoryOrOptions;
    }

    const headers = await getAuthHeaders(custId);
    const res = await fetch(getApiUrl(`/rides/${orderId}/complaint`), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify({ category, description: desc, attachments: att }),
    });
    return await readJson(res);
  } catch (err: any) {
    console.error("submitRideComplaint error:", err);
    return { success: false, message: err.message || "Gagal mengirimkan komplain" };
  }
};

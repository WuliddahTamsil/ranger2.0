import { getApiUrl } from "./api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  WasteBankUI,
  WasteCategory,
  WasteCategoryPriceUI,
  WasteDepositUI,
  PointWalletUI,
  PointLedgerUI,
  PointRedemptionUI,
  VoucherUI,
} from "../types/recycleTypes";

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
    const requestedAccountId = accountId || session?.accountId;
    const account = Array.isArray(accounts)
      ? accounts.find((item: any) => String(item.id) === String(requestedAccountId))
      : null;
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
      // fallback
    }
    throw new Error(message || `Permintaan gagal (HTTP ${response.status}).`);
  }
  try {
    return JSON.parse(body);
  } catch {
    throw new Error("Server API mengembalikan respons tidak valid.");
  }
};

const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // km
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

const getCoordsFromAddress = (address: string) => {
  const lower = (address || "").toLowerCase();
  if (lower.includes("pakuan") || lower.includes("bogor")) {
    return { lat: -6.5976, lng: 106.8062 };
  }
  if (lower.includes("dago") || lower.includes("coblong") || lower.includes("bandung")) {
    return { lat: -6.885, lng: 107.614 };
  }
  if (lower.includes("sumur bandung") || lower.includes("merdeka")) {
    return { lat: -6.912, lng: 107.6105 };
  }
  if (lower.includes("cimanuk") || lower.includes("garut kota")) {
    return { lat: -7.2185, lng: 107.9022 };
  }
  if (lower.includes("kamojang") || lower.includes("samarang") || lower.includes("garut")) {
    return { lat: -7.1452, lng: 107.7891 };
  }
  return { lat: -7.145, lng: 107.789 };
};

const STANDARD_CAT_PRICES: Array<{ category: WasteCategory; subCategory: string; pricePerKg: number; minWeightKg: number; unit: string }> = [
  { category: "Plastik", subCategory: "Botol PET Bening / Bersih", pricePerKg: 4500, minWeightKg: 0.1, unit: "kg" },
  { category: "Plastik", subCategory: "Plastik Campur / Kresek", pricePerKg: 2000, minWeightKg: 0.5, unit: "kg" },
  { category: "Kertas & Kardus", subCategory: "Kardus Cokelat Tebal", pricePerKg: 3000, minWeightKg: 0.5, unit: "kg" },
  { category: "Kertas & Kardus", subCategory: "Kertas HVS / Arsip / Buku", pricePerKg: 2500, minWeightKg: 0.2, unit: "kg" },
  { category: "Logam & Besi", subCategory: "Besi Padat / Plat", pricePerKg: 5500, minWeightKg: 1.0, unit: "kg" },
  { category: "Logam & Besi", subCategory: "Aluminium Kaleng Minuman", pricePerKg: 12000, minWeightKg: 0.2, unit: "kg" },
  { category: "Logam & Besi", subCategory: "Tembaga / Kuningan Super", pricePerKg: 65000, minWeightKg: 0.1, unit: "kg" },
  { category: "Kaca & Botol", subCategory: "Botol Kaca Utuh (Sirup/Kecap)", pricePerKg: 1500, minWeightKg: 1.0, unit: "kg" },
  { category: "Minyak Jelantah", subCategory: "Minyak Jelantah Murni (Liter)", pricePerKg: 6000, minWeightKg: 1.0, unit: "liter" },
  { category: "Elektronik", subCategory: "E-Waste Campur / Motherboard", pricePerKg: 8000, minWeightKg: 0.1, unit: "kg" },
];

const DEFAULT_KNOWN_BANKS: WasteBankUI[] = [
  {
    _id: "bank_pakuan_001",
    name: "Bank Sampah Pakuan",
    ownerId: "bank_sampah_seed_pakuan",
    address: "Pakuan, Bogor, Jawa Barat",
    latitude: -6.5976,
    longitude: 106.8062,
    phone: "081234567891",
    photoUrl: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=600",
    openingHours: "Senin - Sabtu, 08:00 - 15:15",
    acceptsPickup: false,
    status: "ACTIVE",
    rating: 4.9,
    ratingCount: 16,
    maxPrice: 12000,
    acceptedCategories: ["Plastik", "Kertas & Kardus", "Logam & Besi", "Kaca & Botol", "Elektronik"],
    prices: [],
    officerEmails: ["agalagan@gmail.com"],
  },
  {
    _id: "bank_kamojang_001",
    name: "Bank Sampah Induk Kamojang Asri",
    ownerId: "bank_sampah_seed_001",
    address: "Jl. Kamojang No. 8, Samarang, Garut",
    latitude: -7.1452,
    longitude: 107.7891,
    phone: "081234567888",
    photoUrl: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=600",
    openingHours: "Senin - Sabtu, 08:00 - 16:00",
    acceptsPickup: true,
    status: "ACTIVE",
    rating: 4.9,
    ratingCount: 24,
    maxPrice: 12000,
    acceptedCategories: ["Plastik", "Kertas & Kardus", "Logam & Besi", "Kaca & Botol", "Elektronik"],
    prices: [],
    officerEmails: ["banksampah@geoverse.com"],
  },
  {
    _id: "bank_garutkota_001",
    name: "Bank Sampah Berkah Mandiri Garut",
    ownerId: "bank_garut_owner",
    address: "Jl. Cimanuk No. 42, Garut Kota",
    latitude: -7.2185,
    longitude: 107.9022,
    phone: "085223344556",
    photoUrl: "https://images.unsplash.com/photo-1604187351574-c75ca79f5807?w=600",
    openingHours: "Senin - Minggu, 08:30 - 17:00",
    acceptsPickup: true,
    status: "ACTIVE",
    rating: 4.8,
    ratingCount: 18,
    maxPrice: 12000,
    acceptedCategories: ["Plastik", "Kertas & Kardus", "Logam & Besi", "Kaca & Botol", "Elektronik"],
    prices: [],
    officerEmails: ["banksampah.garutkota@geoverse.com"],
  },
  {
    _id: "bank_dago_001",
    name: "Bank Sampah Hijau Lestari Bandung",
    ownerId: "bank_dago_owner",
    address: "Jl. Dago No. 120, Coblong, Bandung",
    latitude: -6.885,
    longitude: 107.614,
    phone: "082112233445",
    photoUrl: "https://images.unsplash.com/photo-1595278069441-2cf29f8005a4?w=600",
    openingHours: "Senin - Jumat, 08:00 - 15:30",
    acceptsPickup: true,
    status: "ACTIVE",
    rating: 4.8,
    ratingCount: 15,
    maxPrice: 12000,
    acceptedCategories: ["Plastik", "Kertas & Kardus", "Logam & Besi", "Kaca & Botol", "Elektronik"],
    prices: [],
    officerEmails: ["banksampah.bandung@geoverse.com"],
  },
  {
    _id: "bank_merdeka_001",
    name: "Bank Sampah Merdeka Bersih",
    ownerId: "bank_merdeka_owner",
    address: "Jl. Merdeka No. 64, Sumur Bandung",
    latitude: -6.912,
    longitude: 107.6105,
    phone: "081399887766",
    photoUrl: "https://images.unsplash.com/photo-1567095761054-7a02e69e5c43?w=600",
    openingHours: "Setiap Hari, 07:30 - 16:30",
    acceptsPickup: false,
    status: "ACTIVE",
    rating: 4.7,
    ratingCount: 12,
    maxPrice: 12000,
    acceptedCategories: ["Plastik", "Kertas & Kardus", "Logam & Besi", "Kaca & Botol", "Elektronik"],
    prices: [],
    officerEmails: ["banksampah.merdeka@geoverse.com"],
  },
];

// ==================== WASTE BANKS ====================
export const getWasteBanks = async (
  lat?: number,
  lng?: number,
  filter?: string
): Promise<{ success: boolean; data: WasteBankUI[]; message?: string }> => {
  try {
    const query = new URLSearchParams();
    if (lat !== undefined && lat !== null) query.append("lat", String(lat));
    if (lng !== undefined && lng !== null) query.append("lng", String(lng));
    if (filter) query.append("filter", filter);

    const url = getApiUrl(`/waste-banks${query.toString() ? `?${query.toString()}` : ""}`);
    let apiBanks: WasteBankUI[] = [];
    try {
      const res = await fetch(url);
      const resJson = await readApiJson(res);
      if (resJson.success && Array.isArray(resJson.data)) {
        apiBanks = resJson.data;
      }
    } catch (e) {
      console.log("Fetch api waste-banks error:", e);
    }

    // Merge default known banks with apiBanks (apiBanks from MongoDB takes absolute priority)
    const mergedBanks: WasteBankUI[] = [...DEFAULT_KNOWN_BANKS];
    for (const apiB of apiBanks) {
      const idx = mergedBanks.findIndex(
        (b) => b._id === apiB._id || b.name.toLowerCase() === apiB.name.toLowerCase()
      );
      if (idx >= 0) {
        mergedBanks[idx] = {
          ...mergedBanks[idx],
          ...apiB,
          openingHours: apiB.openingHours || mergedBanks[idx].openingHours,
          acceptsPickup: apiB.acceptsPickup !== undefined ? apiB.acceptsPickup : mergedBanks[idx].acceptsPickup,
          maxPrice: apiB.maxPrice || mergedBanks[idx].maxPrice || 12000,
          acceptedCategories:
            apiB.acceptedCategories && apiB.acceptedCategories.length > 0
              ? apiB.acceptedCategories
              : mergedBanks[idx].acceptedCategories,
        };
      } else {
        mergedBanks.push({
          ...apiB,
          maxPrice: apiB.maxPrice || 12000,
          acceptedCategories:
            apiB.acceptedCategories && apiB.acceptedCategories.length > 0
              ? apiB.acceptedCategories
              : ["Plastik", "Kertas & Kardus", "Logam & Besi", "Kaca & Botol", "Elektronik"],
        });
      }
    }

    // Merge registered accounts from local storage only if not already present
    const accountsRaw = await AsyncStorage.getItem(AUTH_ACCOUNTS_KEY);
    const accounts = accountsRaw ? JSON.parse(accountsRaw) : [];
    const registeredBankSampahs = Array.isArray(accounts)
      ? accounts.filter((a: any) => a.role === "bank_sampah" && a.status !== "rejected")
      : [];

    for (const acc of registeredBankSampahs) {
      const unitName =
        acc.roleData?.businessName ||
        acc.roleData?.nama_unit ||
        acc.roleData?.unitName ||
        (acc.name?.toLowerCase().includes("bank") ? acc.name : `Bank Sampah ${acc.name}`);
      const unitAddress =
        acc.roleData?.businessAddress ||
        acc.roleData?.alamat_unit ||
        acc.roleData?.unitAddress ||
        acc.address ||
        "Pakuan, Bogor, Jawa Barat";

      const existingIndex = mergedBanks.findIndex(
        (b) =>
          b._id === acc.id ||
          b.name.toLowerCase() === unitName.toLowerCase() ||
          (b.officerEmails && b.officerEmails.includes(acc.email.toLowerCase()))
      );

      if (existingIndex < 0) {
        const coords = getCoordsFromAddress(unitAddress);
        const openingHours =
          acc.roleData?.openingHours ||
          acc.roleData?.operationalHours ||
          "Senin - Sabtu, 08:00 - 15:15";
        const acceptsPickup =
          acc.roleData?.acceptsPickup !== undefined
            ? String(acc.roleData.acceptsPickup) === "true"
            : false;

        mergedBanks.push({
          _id: acc.id,
          name: unitName,
          ownerId: acc.id,
          address: unitAddress,
          latitude: coords.lat,
          longitude: coords.lng,
          phone: acc.phone || "081234567890",
          photoUrl:
            acc.profilePhoto?.uri ||
            "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=600",
          openingHours,
          acceptsPickup,
          status: "ACTIVE",
          rating: 4.9,
          ratingCount: 16,
          maxPrice: 12000,
          acceptedCategories: ["Plastik", "Kertas & Kardus", "Logam & Besi", "Kaca & Botol", "Elektronik"],
          prices: [],
          officerEmails: [acc.email.toLowerCase()],
        });
      }
    }

    // Dynamically calculate distanceKm for EVERY bank based on user coordinates
    if (lat != null && lng != null) {
      for (let i = 0; i < mergedBanks.length; i++) {
        const b = mergedBanks[i];
        const bCoords =
          b.latitude != null && b.longitude != null
            ? { lat: b.latitude, lng: b.longitude }
            : getCoordsFromAddress(b.address || b.name);
        mergedBanks[i].latitude = bCoords.lat;
        mergedBanks[i].longitude = bCoords.lng;
        mergedBanks[i].distanceKm = calculateDistanceKm(lat, lng, bCoords.lat, bCoords.lng);
      }

      // Sort with closest distance first (0.0 km on top)
      mergedBanks.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
    }

    let filtered = mergedBanks;
    if (filter === "pickup") {
      filtered = mergedBanks.filter((b) => b.acceptsPickup);
    } else if (filter === "best_price") {
      filtered = [...mergedBanks].sort((a, b) => (b.maxPrice || 0) - (a.maxPrice || 0));
    }

    return { success: true, data: filtered };
  } catch (err: any) {
    console.error("getWasteBanks error:", err);
    return { success: false, data: [], message: err?.message || "Gagal memuat bank sampah" };
  }
};

export const getWasteBankById = async (
  id: string,
  lat?: number,
  lng?: number
): Promise<{ success: boolean; data?: WasteBankUI; message?: string }> => {
  try {
    const listRes = await getWasteBanks(lat, lng);
    if (listRes.success && Array.isArray(listRes.data)) {
      const found = listRes.data.find((b) => b._id === id);
      if (found) {
        return { success: true, data: found };
      }
    }

    const query = new URLSearchParams();
    if (lat !== undefined && lat !== null) query.append("lat", String(lat));
    if (lng !== undefined && lng !== null) query.append("lng", String(lng));

    const url = getApiUrl(`/waste-banks/${id}${query.toString() ? `?${query.toString()}` : ""}`);
    const res = await fetch(url);
    return await readApiJson(res);
  } catch (err: any) {
    console.error("getWasteBankById error:", err);
    return { success: false, message: err?.message || "Gagal memuat detail bank sampah" };
  }
};

export const getWasteBankPrices = async (
  bankSampahId: string
): Promise<{ success: boolean; data: WasteCategoryPriceUI[]; message?: string }> => {
  try {
    const res = await fetch(getApiUrl(`/waste-banks/${bankSampahId}/prices`));
    const json = await readApiJson(res);
    if (json.success && Array.isArray(json.data) && json.data.length > 0) {
      return json;
    }
    // Fallback standard catalog if no custom prices found
    const defaultPrices: WasteCategoryPriceUI[] = STANDARD_CAT_PRICES.map((p, idx) => ({
      _id: `std_price_${bankSampahId}_${idx}`,
      bankSampahId,
      category: p.category,
      subCategory: p.subCategory,
      pricePerKg: p.pricePerKg,
      minWeightKg: p.minWeightKg,
      unit: p.unit,
      isActive: true,
    }));
    return { success: true, data: defaultPrices };
  } catch (err: any) {
    console.error("getWasteBankPrices fallback error:", err);
    const defaultPrices: WasteCategoryPriceUI[] = STANDARD_CAT_PRICES.map((p, idx) => ({
      _id: `std_price_${bankSampahId}_${idx}`,
      bankSampahId,
      category: p.category,
      subCategory: p.subCategory,
      pricePerKg: p.pricePerKg,
      minWeightKg: p.minWeightKg,
      unit: p.unit,
      isActive: true,
    }));
    return { success: true, data: defaultPrices };
  }
};

export const updateWasteBankOperational = async (
  bankSampahId: string,
  payload: { name?: string; address?: string; openingHours?: string; acceptsPickup?: boolean; phone?: string; status?: string }
): Promise<{ success: boolean; data?: WasteBankUI; message?: string }> => {
  try {
    if (payload.openingHours) {
      if (bankSampahId) await AsyncStorage.setItem(`@waste_bank_hours_${bankSampahId}`, payload.openingHours);
      await AsyncStorage.setItem("@waste_bank_hours_pakuan", payload.openingHours);
      await AsyncStorage.setItem("@waste_bank_hours_bank_sampah_pakuan", payload.openingHours);
      if (payload.name) {
        const key = payload.name.toLowerCase().replace(/[^a-z0-9]/g, "_");
        await AsyncStorage.setItem(`@waste_bank_hours_${key}`, payload.openingHours);
      }
    }
    if (payload.acceptsPickup !== undefined) {
      if (bankSampahId) await AsyncStorage.setItem(`@waste_bank_pickup_${bankSampahId}`, String(payload.acceptsPickup));
      await AsyncStorage.setItem("@waste_bank_pickup_pakuan", String(payload.acceptsPickup));
      await AsyncStorage.setItem("@waste_bank_pickup_bank_sampah_pakuan", String(payload.acceptsPickup));
      if (payload.name) {
        const key = payload.name.toLowerCase().replace(/[^a-z0-9]/g, "_");
        await AsyncStorage.setItem(`@waste_bank_pickup_${key}`, String(payload.acceptsPickup));
      }
    }

    const authHeaders = await getAuthHeaders();
    const res = await fetch(getApiUrl(`/waste-banks/${bankSampahId}/operational`), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify(payload),
    });
    return await readApiJson(res);
  } catch (err: any) {
    console.error("updateWasteBankOperational error:", err);
    return { success: false, message: err?.message || "Gagal memperbarui jam operasional bank sampah" };
  }
};

// ==================== WASTE DEPOSITS ====================
export const createWasteDeposit = async (
  payload: {
    bankSampahId: string;
    method: "DROP_OFF" | "PICKUP";
    categories: Array<{ category: string; estimatedWeightKg: number }>;
    pickupAddress?: string;
    pickupLatitude?: number;
    pickupLongitude?: number;
    pickupSchedule?: string;
    pickupNotes?: string;
    customerPhotos?: string[];
  },
  idempotencyKey?: string
): Promise<{ success: boolean; data?: WasteDepositUI; message?: string }> => {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(getApiUrl("/waste/deposits"), {
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
    console.error("createWasteDeposit error:", err);
    return { success: false, message: err?.message || "Gagal membuat permohonan setor sampah" };
  }
};

export const getCustomerDeposits = async (
  customerId: string
): Promise<{ success: boolean; data: WasteDepositUI[]; message?: string }> => {
  try {
    const authHeaders = await getAuthHeaders(customerId);
    const res = await fetch(getApiUrl(`/waste/deposits/customer/${customerId}?t=${Date.now()}`), {
      headers: authHeaders,
    });
    return await readApiJson(res);
  } catch (err: any) {
    console.error("getCustomerDeposits error:", err);
    return { success: false, data: [], message: err?.message || "Gagal memuat riwayat setoran" };
  }
};

export const getWasteDepositById = async (
  id: string
): Promise<{ success: boolean; data?: WasteDepositUI; message?: string }> => {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(getApiUrl(`/waste/deposits/${id}?t=${Date.now()}`), {
      headers: authHeaders,
    });
    return await readApiJson(res);
  } catch (err: any) {
    console.error("getWasteDepositById error:", err);
    return { success: false, message: err?.message || "Gagal memuat data setoran" };
  }
};

export const getBankDeposits = async (
  bankSampahId: string
): Promise<{ success: boolean; data: WasteDepositUI[]; message?: string }> => {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(getApiUrl(`/waste/deposits/bank/${bankSampahId}?t=${Date.now()}`), {
      headers: authHeaders,
    });
    return await readApiJson(res);
  } catch (err: any) {
    console.error("getBankDeposits error:", err);
    return { success: false, data: [], message: err?.message || "Gagal memuat antrean setoran" };
  }
};

export const acceptWasteDeposit = async (
  id: string,
  notes?: string
): Promise<{ success: boolean; data?: WasteDepositUI; message?: string }> => {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(getApiUrl(`/waste/deposits/${id}/accept`), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ notes }),
    });
    return await readApiJson(res);
  } catch (err: any) {
    console.error("acceptWasteDeposit error:", err);
    return { success: false, message: err?.message || "Gagal menerima setoran" };
  }
};

export const assignWasteDepositDriver = async (
  id: string,
  driverId: string
): Promise<{ success: boolean; data?: WasteDepositUI; message?: string }> => {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(getApiUrl(`/waste/deposits/${id}/assign-driver`), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ driverId }),
    });
    return await readApiJson(res);
  } catch (err: any) {
    console.error("assignWasteDepositDriver error:", err);
    return { success: false, message: err?.message || "Gagal menugaskan driver" };
  }
};

export const weighWasteDeposit = async (
  id: string,
  payload: {
    categories: Array<{ category: string; actualWeightKg: number }>;
    weighingProofPhotos?: string[];
    weighingNotes?: string;
  }
): Promise<{ success: boolean; data?: WasteDepositUI; message?: string }> => {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(getApiUrl(`/waste/deposits/${id}/weigh`), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify(payload),
    });
    return await readApiJson(res);
  } catch (err: any) {
    console.error("weighWasteDeposit error:", err);
    return { success: false, message: err?.message || "Gagal menyimpan hasil timbang" };
  }
};

export const confirmWasteDeposit = async (
  id: string
): Promise<{ success: boolean; data?: WasteDepositUI; message?: string }> => {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(getApiUrl(`/waste/deposits/${id}/confirm`), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
    });
    return await readApiJson(res);
  } catch (err: any) {
    console.error("confirmWasteDeposit error:", err);
    return { success: false, message: err?.message || "Gagal mengonfirmasi hasil timbang" };
  }
};

export const cancelWasteDeposit = async (
  id: string,
  reason?: string
): Promise<{ success: boolean; data?: WasteDepositUI; message?: string }> => {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(getApiUrl(`/waste/deposits/${id}/cancel`), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ reason }),
    });
    return await readApiJson(res);
  } catch (err: any) {
    console.error("cancelWasteDeposit error:", err);
    return { success: false, message: err?.message || "Gagal membatalkan setoran" };
  }
};

export const disputeWasteDeposit = async (
  id: string,
  reason: string
): Promise<{ success: boolean; data?: WasteDepositUI; message?: string }> => {
  try {
    const authHeaders = await getAuthHeaders();
    const res = await fetch(getApiUrl(`/waste/deposits/${id}/complaint`), {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ reason }),
    });
    return await readApiJson(res);
  } catch (err: any) {
    console.error("disputeWasteDeposit error:", err);
    return { success: false, message: err?.message || "Gagal mengajukan komplain" };
  }
};

// ==================== POINT DELEGATIONS TO geoversePointService ====================
export {
  fetchPointWallet as getPointWallet,
  fetchPointLedger as getPointLedger,
  createRedemption as createPointRedemption,
  fetchMyRedemptions as getCustomerRedemptions,
  fetchAvailableVouchers as getAvailableVouchers,
} from "../features/geoversePoint/services/geoversePointService";


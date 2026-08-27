import { getApiUrl } from "./api";

export interface LaundryServiceItem {
  _id?: string;
  id?: string;
  name: string;
  desc?: string;
  price: number;
  unit: "kg" | "pcs" | "pasang" | "meter";
  durationHours?: number;
  category?: "biasa" | "ekspres" | "satuan";
  isActive?: boolean;
}

export interface LaundryStore {
  _id?: string;
  id?: string;
  ownerId?: string;
  storeName: string;
  description?: string;
  address: string;
  phone?: string;
  openingHours?: string;
  isOpen?: boolean;
  rating?: number;
  totalReviews?: number;
  distanceText?: string;
  imageUrl?: string;
  badges?: string[];
  services: LaundryServiceItem[];
}

export type LaundryOrderStatus =
  | "MENUNGGU_DRIVER_JEMPUT"
  | "DRIVER_MENUJU_CUSTOMER"
  | "DRIVER_MENUJU_LAUNDRY"
  | "TIBA_DI_LAUNDRY"
  | "MENUNGGU_PEMBAYARAN"
  | "MENUNGGU_VERIFIKASI_PEMBAYARAN"
  | "PEMBAYARAN_LUNAS"
  | "SEDANG_DICUCI"
  | "SIAP_DIANTAR"
  | "DRIVER_MENGANTAR_BALIK"
  | "SELESAI"
  | "DIBATALKAN";

export interface LaundryOrder {
  _id?: string;
  id?: string;
  orderCode: string;
  customerId: string;
  customerName: string;
  customerPhone?: string;
  pickupAddress: string;
  pickupCoords?: string;
  deliveryAddress: string;
  deliveryCoords?: string;
  storeId: string;
  storeName: string;
  ownerId: string;
  serviceId: string;
  serviceName: string;
  pricePerUnit: number;
  unitType: string;
  driverPickupId?: string | null;
  driverPickupName?: string;
  driverPickupPhone?: string;
  driverDeliveryId?: string | null;
  driverDeliveryName?: string;
  driverDeliveryPhone?: string;
  actualWeightOrQty?: number | null;
  laundryCost?: number;
  deliveryFeePickup?: number;
  deliveryFeeDrop?: number;
  serviceFee?: number;
  totalAmount?: number;
  paymentStatus: "menunggu_timbangan" | "menunggu_pembayaran" | "menunggu_verifikasi" | "lunas" | "ditolak" | "batal";
  paymentMethod?: string;
  paymentProofUrl?: string;
  paymentRejectionReason?: string;
  paidAt?: string | null;
  status: LaundryOrderStatus;
  notes?: string;
  estimatedHours?: number;
  createdAt?: string;
  updatedAt?: string;
}

// Fallback data when offline
export const FALLBACK_LAUNDRY_STORES: LaundryStore[] = [
  {
    id: "6a845aab73158b850c17e67f",
    ownerId: "6a845aab73158b850c17e67f",
    storeName: "Ais Laundry",
    description: "Layanan laundry terpercaya, rapi, wangi tahan lama dengan garansi bersih higienis.",
    address: "Jl. Kamojang, BGR, Garut",
    phone: "+6287805987309",
    openingHours: "Buka • Tutup 21.00",
    isOpen: true,
    rating: 4.9,
    totalReviews: 45,
    distanceText: "0.4 km",
    imageUrl: "https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=600&q=80",
    badges: ["Antar Jemput", "Ekspres 3 Jam", "Garansi Bersih"],
    services: [
      { id: "s1", name: "Cuci Komplit (Cuci + Setrika)", desc: "Cuci, kering, setrika uap, pewangi & packing rapi", price: 6000, unit: "kg", durationHours: 24, category: "biasa", isActive: true },
      { id: "s2", name: "Express 3 Jam (Siap Pakai)", desc: "Prioritas kilat selesai dalam 3 jam", price: 10000, unit: "kg", durationHours: 3, category: "ekspres", isActive: true },
      { id: "s3", name: "Cuci Kering Lipat", desc: "Cuci higienis & lipat rapi tanpa setrika", price: 4500, unit: "kg", durationHours: 24, category: "biasa", isActive: true },
      { id: "s4", name: "Setrika Uap Saja", desc: "Setrika uap licin dan wangi tahan lama", price: 3500, unit: "kg", durationHours: 12, category: "biasa", isActive: true },
      { id: "s5", name: "Cuci Bedcover Besar", desc: "Pembersihan menyeluruh bedcover/selimut besar", price: 25000, unit: "pcs", durationHours: 48, category: "satuan", isActive: true },
    ],
  },
  {
    id: "1",
    ownerId: "owner_dedi",
    storeName: "Laundry Express Pak Dedi",
    description: "Layanan cuci kilat, bersih higienis dengan pewangi premium aroma segar tahan 7 hari.",
    address: "Jl. Kamojang No. 45, Desa Laksana, Ibun",
    phone: "081234567001",
    openingHours: "Buka • Tutup 21.00",
    isOpen: true,
    rating: 4.8,
    totalReviews: 124,
    distanceText: "0.5 km",
    imageUrl: "https://images.unsplash.com/photo-1545173168-9f1947eebb7f?auto=format&fit=crop&w=600&q=80",
    badges: ["Antar Jemput", "Ekspres 3 Jam", "Garansi Wangi"],
    services: [
      { id: "s1", name: "Cuci Komplit (Cuci + Setrika)", desc: "Cuci, kering, setrika uap, pewangi & packing", price: 6000, unit: "kg", durationHours: 24, category: "biasa", isActive: true },
      { id: "s2", name: "Express 3 Jam (Siap Pakai)", desc: "Prioritas kilat selesai 3 jam siap pakai", price: 10000, unit: "kg", durationHours: 3, category: "ekspres", isActive: true },
      { id: "s3", name: "Cuci Kering Lipat", desc: "Cuci higienis & lipat rapi", price: 4500, unit: "kg", durationHours: 24, category: "biasa", isActive: true },
      { id: "s4", name: "Setrika Uap Saja", desc: "Setrika uap licin dan wangi tahan lama", price: 3500, unit: "kg", durationHours: 12, category: "biasa", isActive: true },
      { id: "s5", name: "Cuci Bedcover Besar", desc: "Cuci khusus selimut tebal & bedcover", price: 25000, unit: "pcs", durationHours: 48, category: "satuan", isActive: true },
    ],
  },
  {
    id: "2",
    ownerId: "owner_rendy",
    storeName: "Bersih Kilat Laundry",
    description: "Solusi laundry modern serba cepat dengan teknologi ozon anti kuman.",
    address: "Jl. Raya Kamojang No. 12, Garut",
    phone: "081234567002",
    openingHours: "Buka • Tutup 21.00",
    isOpen: true,
    rating: 4.6,
    totalReviews: 89,
    distanceText: "1.1 km",
    imageUrl: "https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?auto=format&fit=crop&w=600&q=80",
    badges: ["Antar Jemput", "Ekspres 3 Jam"],
    services: [
      { id: "s1", name: "Cuci Komplit Kilat", desc: "Cuci dan setrika ramah lingkungan", price: 7000, unit: "kg", durationHours: 24, category: "biasa", isActive: true },
      { id: "s2", name: "Super Express 2 Jam", desc: "Cepat 2 jam langsung beres", price: 12000, unit: "kg", durationHours: 2, category: "ekspres", isActive: true },
      { id: "s3", name: "Cuci Selimut & Sprei", desc: "Khusus sprei dan bedcover", price: 15000, unit: "pcs", durationHours: 24, category: "satuan", isActive: true },
    ],
  },
  {
    id: "3",
    ownerId: "owner_rohani",
    storeName: "Laundry Ibu Rohani",
    description: "Laundry keluarga terpercaya, rapi, wangi khas melati tahan lama.",
    address: "Jl. Lapang Panas Bumi, Kawah Kamojang",
    phone: "081234567003",
    openingHours: "Buka • Tutup 20.00",
    isOpen: true,
    rating: 4.9,
    totalReviews: 210,
    distanceText: "0.2 km",
    imageUrl: "https://images.unsplash.com/photo-1521656693074-0ef32e80a5d5?auto=format&fit=crop&w=600&q=80",
    badges: ["Antar Jemput", "Harga Hemat"],
    services: [
      { id: "s1", name: "Cuci Komplit Murah", desc: "Paket hemat cuci setrika harum melati", price: 5000, unit: "kg", durationHours: 24, category: "biasa", isActive: true },
      { id: "s2", name: "Cuci Lipat Saja", desc: "Cuci bersih & lipat rapi", price: 3500, unit: "kg", durationHours: 24, category: "biasa", isActive: true },
      { id: "s3", name: "Gordyn & Karpet Ringan", desc: "Cuci gordyn dan karpet per meter", price: 15000, unit: "meter", durationHours: 48, category: "satuan", isActive: true },
    ],
  },
];

// In-memory active order holder for instant reactivity
let activeSelectedStore: LaundryStore | null = FALLBACK_LAUNDRY_STORES[0];
let activeCustomerOrder: LaundryOrder | null = null;
const listeners = new Set<() => void>();

export const getSelectedStore = (): LaundryStore => {
  return activeSelectedStore || FALLBACK_LAUNDRY_STORES[0];
};

export const setSelectedStore = (store: LaundryStore) => {
  activeSelectedStore = store;
  notifyListeners();
};

export const getActiveLaundryOrder = (): LaundryOrder | null => {
  return activeCustomerOrder;
};

export const setActiveLaundryOrder = (order: LaundryOrder | null) => {
  activeCustomerOrder = order;
  notifyListeners();
};

export const subscribeLaundry = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const notifyListeners = () => {
  listeners.forEach((l) => l());
};

// API Services
export const fetchLaundryStores = async (search?: string): Promise<LaundryStore[]> => {
  try {
    const url = getApiUrl(`/laundry/stores${search ? `?search=${encodeURIComponent(search)}` : ""}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch laundry stores");
    const json = await res.json();
    if (json.success && Array.isArray(json.data) && json.data.length > 0) {
      return json.data;
    }
    return FALLBACK_LAUNDRY_STORES;
  } catch (err) {
    console.warn("⚠️ fetchLaundryStores fallback:", err);
    if (search) {
      return FALLBACK_LAUNDRY_STORES.filter((s) =>
        s.storeName.toLowerCase().includes(search.toLowerCase()) ||
        s.address.toLowerCase().includes(search.toLowerCase())
      );
    }
    return FALLBACK_LAUNDRY_STORES;
  }
};

export const fetchLaundryStoreById = async (id: string): Promise<LaundryStore | null> => {
  try {
    const url = getApiUrl(`/laundry/stores/${id}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch store");
    const json = await res.json();
    return json.data || null;
  } catch (err) {
    console.warn("⚠️ fetchLaundryStoreById fallback:", err);
    return FALLBACK_LAUNDRY_STORES.find((s) => s.id === id || s._id === id) || FALLBACK_LAUNDRY_STORES[0];
  }
};

export const fetchMyLaundryStore = async (ownerId: string): Promise<LaundryStore | null> => {
  try {
    const url = getApiUrl(`/laundry/store/my-store?ownerId=${ownerId}`);
    const res = await fetch(url);
    const json = await res.json();
    if (json.success) return json.data;
    return FALLBACK_LAUNDRY_STORES[0];
  } catch (err) {
    console.warn("⚠️ fetchMyLaundryStore fallback:", err);
    return FALLBACK_LAUNDRY_STORES[0];
  }
};

export const saveMyLaundryStore = async (storeData: Partial<LaundryStore>): Promise<LaundryStore | null> => {
  try {
    const url = getApiUrl(`/laundry/store/my-store`);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(storeData),
    });
    const json = await res.json();
    return json.data || null;
  } catch (err) {
    console.error("❌ saveMyLaundryStore Error:", err);
    return null;
  }
};

export const createLaundryOrder = async (orderPayload: Partial<LaundryOrder>): Promise<LaundryOrder> => {
  try {
    const url = getApiUrl(`/laundry/orders`);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderPayload),
    });
    const json = await res.json();
    if (json.success && json.data) {
      setActiveLaundryOrder(json.data);
      return json.data;
    }
  } catch (err) {
    console.warn("⚠️ createLaundryOrder offline fallback:", err);
  }

  // Local fallback object
  const localOrder: LaundryOrder = {
    _id: `lnd_local_${Date.now()}`,
    orderCode: `LND-${Math.floor(1000 + Math.random() * 9000)}`,
    customerId: orderPayload.customerId || "cust_1",
    customerName: orderPayload.customerName || "Pelanggan Rangers",
    customerPhone: orderPayload.customerPhone || "08123456789",
    pickupAddress: orderPayload.pickupAddress || "Jl. Mawar No. 12, Kamojang",
    pickupCoords: orderPayload.pickupCoords || "-7.1432, 107.7845",
    deliveryAddress: orderPayload.deliveryAddress || "Jl. Mawar No. 12, Kamojang",
    deliveryCoords: orderPayload.deliveryCoords || "-7.1432, 107.7845",
    storeId: (orderPayload.storeId as any) || "1",
    storeName: orderPayload.storeName || "Laundry Express Pak Dedi",
    ownerId: orderPayload.ownerId || "owner_dedi",
    serviceId: orderPayload.serviceId || "s1",
    serviceName: orderPayload.serviceName || "Cuci Komplit (Cuci + Setrika)",
    pricePerUnit: orderPayload.pricePerUnit || 6000,
    unitType: orderPayload.unitType || "kg",
    actualWeightOrQty: null,
    laundryCost: 0,
    deliveryFeePickup: 4000,
    deliveryFeeDrop: 4000,
    serviceFee: 1000,
    totalAmount: 0,
    paymentStatus: "menunggu_timbangan",
    status: "MENUNGGU_DRIVER_JEMPUT",
    notes: orderPayload.notes || "",
    createdAt: new Date().toISOString(),
  };
  setActiveLaundryOrder(localOrder);
  return localOrder;
};

export const fetchStoreOrders = async (ownerId: string = "all"): Promise<LaundryOrder[]> => {
  try {
    const url = getApiUrl(`/laundry/orders/store/${ownerId}`);
    const res = await fetch(url);
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      return json.data;
    }
  } catch (err) {
    console.warn("⚠️ fetchStoreOrders fallback:", err);
  }
  // Return active local order if present
  return activeCustomerOrder ? [activeCustomerOrder] : [];
};

export interface LaundryCustomerSummary {
  id: string;
  customerId: string;
  name: string;
  phone: string;
  address: string;
  totalOrders: number;
  totalSpent: number;
  lastOrderCode: string;
  lastOrderService: string;
  lastOrderStatus: string;
  lastOrderDate: string;
  orders: {
    orderCode: string;
    serviceName: string;
    totalAmount: number;
    status: string;
    date: string;
  }[];
}

export const fetchStoreCustomers = async (ownerId: string = "all"): Promise<LaundryCustomerSummary[]> => {
  try {
    const url = getApiUrl(`/laundry/customers/store/${ownerId}`);
    const res = await fetch(url);
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      return json.data;
    }
  } catch (err) {
    console.warn("⚠️ fetchStoreCustomers fallback:", err);
  }

  // Fallback to active order customer if available
  if (activeCustomerOrder) {
    return [
      {
        id: activeCustomerOrder.customerId,
        customerId: activeCustomerOrder.customerId,
        name: activeCustomerOrder.customerName,
        phone: activeCustomerOrder.customerPhone || "0812-3456-7890",
        address: activeCustomerOrder.pickupAddress || "Jl. Kamojang, Garut",
        totalOrders: 1,
        totalSpent: activeCustomerOrder.totalAmount || 31800,
        lastOrderCode: activeCustomerOrder.orderCode,
        lastOrderService: activeCustomerOrder.serviceName,
        lastOrderStatus: activeCustomerOrder.status,
        lastOrderDate: activeCustomerOrder.createdAt || new Date().toISOString(),
        orders: [
          {
            orderCode: activeCustomerOrder.orderCode,
            serviceName: activeCustomerOrder.serviceName,
            totalAmount: activeCustomerOrder.totalAmount || 31800,
            status: activeCustomerOrder.status,
            date: activeCustomerOrder.createdAt || new Date().toISOString(),
          },
        ],
      },
    ];
  }
  return [];
};

export const weighAndBillLaundryOrder = async (
  orderId: string,
  weightOrQty: number,
  customLaundryCost?: number
): Promise<LaundryOrder | null> => {
  try {
    const url = getApiUrl(`/laundry/orders/${orderId}/weigh-and-bill`);
    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weightOrQty, customLaundryCost }),
    });
    const json = await res.json();
    if (json.success && json.data) {
      setActiveLaundryOrder(json.data);
      return json.data;
    }
  } catch (err) {
    console.warn("⚠️ weighAndBillLaundryOrder offline fallback:", err);
  }

  // Offline update
  if (activeCustomerOrder) {
    const laundryCost = customLaundryCost || Math.round(weightOrQty * activeCustomerOrder.pricePerUnit);
    const totalAmount = laundryCost + 4000 + 4000 + 1000;
    const updated: LaundryOrder = {
      ...activeCustomerOrder,
      actualWeightOrQty: weightOrQty,
      laundryCost,
      totalAmount,
      status: "MENUNGGU_PEMBAYARAN",
      paymentStatus: "menunggu_pembayaran",
    };
    setActiveLaundryOrder(updated);
    return updated;
  }
  return null;
};

export const payLaundryOrder = async (
  orderId: string,
  paymentMethod: string = "QRIS",
  paymentProofUrl: string = ""
): Promise<LaundryOrder | null> => {
  try {
    const url = getApiUrl(`/laundry/orders/${orderId}/pay`);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentMethod, paymentProofUrl }),
    });
    const json = await res.json();
    if (json.success && json.data) {
      setActiveLaundryOrder(json.data);
      return json.data;
    }
  } catch (err) {
    console.warn("⚠️ payLaundryOrder offline fallback:", err);
  }

  // Offline update
  if (activeCustomerOrder) {
    const updated: LaundryOrder = {
      ...activeCustomerOrder,
      paymentStatus: "menunggu_verifikasi",
      paymentMethod,
      paymentProofUrl,
      status: "MENUNGGU_VERIFIKASI_PEMBAYARAN",
    };
    setActiveLaundryOrder(updated);
    return updated;
  }
  return null;
};

export const verifyLaundryPayment = async (
  orderId: string,
  action: "approve" | "reject",
  rejectionReason?: string
): Promise<LaundryOrder | null> => {
  try {
    const url = getApiUrl(`/laundry/orders/${orderId}/verify-payment`);
    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, rejectionReason }),
    });
    const json = await res.json();
    if (json.success && json.data) {
      setActiveLaundryOrder(json.data);
      return json.data;
    }
  } catch (err) {
    console.warn("⚠️ verifyLaundryPayment offline fallback:", err);
  }

  if (activeCustomerOrder) {
    const updated: LaundryOrder = {
      ...activeCustomerOrder,
      paymentStatus: action === "approve" ? "lunas" : "ditolak",
      status: action === "approve" ? "SEDANG_DICUCI" : "MENUNGGU_PEMBAYARAN",
      paymentRejectionReason: action === "reject" ? (rejectionReason || "Bukti transfer tidak valid") : "",
      paidAt: action === "approve" ? new Date().toISOString() : null,
    };
    setActiveLaundryOrder(updated);
    return updated;
  }
  return null;
};

export const updateLaundryOrderStatus = async (
  orderId: string,
  status: LaundryOrderStatus,
  driverInfo?: any
): Promise<LaundryOrder | null> => {
  try {
    const url = getApiUrl(`/laundry/orders/${orderId}/update-status`);
    const res = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, ...driverInfo }),
    });
    const json = await res.json();
    if (json.success && json.data) {
      setActiveLaundryOrder(json.data);
      return json.data;
    }
  } catch (err) {
    console.warn("⚠️ updateLaundryOrderStatus offline fallback:", err);
  }

  if (activeCustomerOrder) {
    const updated: LaundryOrder = {
      ...activeCustomerOrder,
      status,
      ...(driverInfo || {}),
    };
    setActiveLaundryOrder(updated);
    return updated;
  }
  return null;
};

import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthAccount, AuthSession } from "./authTypes";

const ACCOUNTS_KEY = "rangers.auth.accounts.v1";
const SESSION_KEY = "rangers.auth.session.v1";

// SHA-256 hash of "12345678"
const PW_12345678_HASH = "ef797c8118f02dfb649607dd5d3f8c7623048c9c063d532cc95c5ed7a898a64f";

export const DEFAULT_ACCOUNTS: AuthAccount[] = [
  {
    id: "admin_seed_001",
    role: "admin",
    name: "Super Admin Ranger",
    email: "ranger@gmail.com",
    phone: "081122334455",
    address: "HQ Ranger Platform, Garut",
    passwordHash: PW_12345678_HASH,
    status: "verified",
    roleData: {},
    documents: {},
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "driver_seed_001",
    role: "driver",
    name: "Wuwu Driver",
    email: "wuliddah@gmail.com",
    phone: "081234567894",
    address: "Garut",
    passwordHash: PW_12345678_HASH,
    status: "verified",
    roleData: {
      plateNumber: "E 3305 YAM",
      vehicleType: "Motor",
      vehicleBrand: "BEAT",
      vehicleYear: "2024",
    },
    documents: {},
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "laundry_seed_001",
    role: "pemilik_laundry",
    name: "Ais Laundry",
    email: "aisl@gmail.com",
    phone: "081234567891",
    address: "Bogor",
    passwordHash: PW_12345678_HASH,
    status: "verified",
    roleData: {
      businessName: "Ais laundry",
      businessAddress: "BGR",
      serviceType: "express",
      operatingHours: "24 jam",
    },
    documents: {},
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "marketplace_seed_001",
    role: "pemilik_marketplace",
    name: "Dyas Cafe & Shop",
    email: "dyaska@gmail.com",
    phone: "081234567893",
    address: "Bogor",
    passwordHash: PW_12345678_HASH,
    status: "verified",
    roleData: {
      businessName: "DYAS",
      businessCategory: "Cafe",
      businessAddress: "Bogor",
      businessDescription: "Cafe & UMKM Kebutuhan Sehari-hari",
    },
    documents: {},
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "marketplace_seed_002",
    role: "pemilik_marketplace",
    name: "Dyva Fazrullah Badari",
    email: "dyva123@gmail.com",
    phone: "085298979756",
    address: "Kuningan",
    passwordHash: PW_12345678_HASH,
    status: "verified",
    roleData: {
      businessName: "Rice Bowl",
      businessCategory: "Makanan",
      businessAddress: "Kuningan",
      businessDescription: "Makanan Enak",
    },
    documents: {},
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "customer_seed_001",
    role: "customer",
    name: "Wuwu Customer",
    email: "wuliddahtamsilbarokah19@gmail.com",
    phone: "081234567895",
    address: "Garut",
    passwordHash: PW_12345678_HASH,
    status: "verified",
    roleData: {},
    documents: {},
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

export const loadAccounts = async (): Promise<AuthAccount[]> => {
  const raw = await AsyncStorage.getItem(ACCOUNTS_KEY);
  let list: AuthAccount[] = [];
  if (raw) {
    try {
      list = JSON.parse(raw) as AuthAccount[];
    } catch {
      list = [];
    }
  }

  // Ensure default seed accounts exist
  let modified = false;
  for (const def of DEFAULT_ACCOUNTS) {
    const existingIndex = list.findIndex((a) => a.email.toLowerCase() === def.email.toLowerCase());
    if (existingIndex < 0) {
      list.push(def);
      modified = true;
    } else if (!list[existingIndex].passwordHash || list[existingIndex].status !== "verified") {
      list[existingIndex].passwordHash = def.passwordHash;
      list[existingIndex].status = "verified";
      modified = true;
    }
  }
  if (modified) {
    void AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list));
  }

  return list;
};

export const saveAccounts = async (accounts: AuthAccount[]) => {
  await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
};

export const loadSession = async (): Promise<AuthSession | null> => {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
};

export const saveSession = async (session: AuthSession) => {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

export const clearSession = async () => {
  await AsyncStorage.removeItem(SESSION_KEY);
};

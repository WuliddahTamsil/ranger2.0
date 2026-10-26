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
    name: "Super Admin GEOVERSE",
    email: "ranger@gmail.com",
    phone: "081511226089",
    address: "HQ GEOVERSE Platform, Garut",
    passwordHash: PW_12345678_HASH,
    status: "verified",
    roleData: {},
    documents: {},
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "admin_pge_001",
    role: "admin",
    name: "Admin PGE GEOVERSE",
    email: "geoverse.pge@gmail.com",
    phone: "081511226089",
    address: "PT Pertamina Geothermal Energy Tbk (PGE) Kamojang",
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
    id: "6adf6b03db47b90ad4041fb1",
    role: "pemilik_laundry",
    name: "Siti Nurazizah",
    email: "sitinurazizah.laundry@gmail.com",
    phone: "+628139461204",
    address: "Jl. Raya Kamojang, Samarang, Garut",
    passwordHash: PW_12345678_HASH,
    status: "verified",
    roleData: {
      businessName: "Kanyaah Laundry",
      businessAddress: "Jl. Raya Kamojang, Samarang, Garut",
      serviceType: "express",
      operatingHours: "08.00 - 21.00",
      phone: "+628139461204",
    },
    documents: {},
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "6adf6d477e733444682a76f6",
    role: "pemilik_laundry",
    name: "Gusni Santiana",
    email: "gusnisantiana.laundry@gmail.com",
    phone: "+6281234567030",
    address: "Jl. Raya Kamojang, Samarang, Garut",
    passwordHash: PW_12345678_HASH,
    status: "verified",
    roleData: {
      businessName: "Gusni Santiana Laundry",
      businessAddress: "Jl. Raya Kamojang, Samarang, Garut",
      serviceType: "express",
      operatingHours: "08.00 - 21.00",
      phone: "+6281234567030",
    },
    documents: {},
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "6adf6d487e733444682a7701",
    role: "pemilik_kos",
    name: "Bu Nenti",
    email: "bunenti.kost@gmail.com",
    phone: "+6281234567011",
    address: "Masuk gang mesjid Al-Kausar RT 002 RW 007 Desa Laksana Kec. Ibun Kab. Bandung",
    passwordHash: PW_12345678_HASH,
    status: "verified",
    roleData: {
      businessName: "Kost Bu Nenti",
      businessAddress: "Masuk gang mesjid Al-Kausar RT 002 RW 007 Desa Laksana Kec. Ibun Kab. Bandung",
      kostType: "Campur",
      roomCount: "9",
      phone: "+6281234567011",
    },
    documents: {},
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "6adf6d487e733444682a7703",
    role: "pemilik_kos",
    name: "Ibu Iput",
    email: "ibuiput.kost@gmail.com",
    phone: "+6281234567012",
    address: "Kahuripan Kamojang Rt 001 Rw 007 Desa Laksana Kec. Ibun Kabupaten Bandung",
    passwordHash: PW_12345678_HASH,
    status: "verified",
    roleData: {
      businessName: "Kost & HomeStay Ibu Iput",
      businessAddress: "Kahuripan Kamojang Rt 001 Rw 007 Desa Laksana Kec. Ibun Kabupaten Bandung",
      kostType: "Campur",
      roomCount: "4",
      phone: "+6281234567012",
    },
    documents: {},
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "kos_seed_001",
    role: "pemilik_kos",
    name: "Aisyah Pemilik Kos & Homestay",
    email: "aisk@gmail.com",
    phone: "087805987309",
    address: "Garut",
    passwordHash: PW_12345678_HASH,
    status: "verified",
    roleData: {
      businessName: "Ais Kos Exclusive & Homestay",
      businessAddress: "Tarogong Kaler, Garut",
      kostType: "Campur",
      roomCount: "10",
    },
    documents: {},
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "6ac6718770933058bf751c11",
    role: "pemilik_kos",
    name: "Adam (ADAM HO)",
    email: "adamshalishazahra@gmail.com",
    phone: "+6287805987309",
    address: "Garut",
    passwordHash: PW_12345678_HASH,
    status: "verified",
    roleData: {
      businessName: "ADAM HO",
      businessAddress: "GARUT",
      propertyType: "Wisata",
      businessCategory: "wisata",
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
    id: "bank_sampah_seed_001",
    role: "bank_sampah",
    name: "Bank Sampah Induk Kamojang Asri",
    email: "banksampah@geoverse.com",
    phone: "081234567896",
    address: "Jl. Kamojang No. 8, Samarang, Garut",
    passwordHash: PW_12345678_HASH,
    status: "verified",
    roleData: {
      businessName: "Bank Sampah Induk Kamojang Asri",
      businessAddress: "Jl. Kamojang No. 8, Samarang, Garut",
      operationalHours: "Senin - Sabtu, 08:00 - 16:00",
      acceptsPickup: "true",
    },
    documents: {},
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "bank_sampah_seed_pakuan",
    role: "bank_sampah",
    name: "Bank Sampah Pakuan",
    email: "agalagan@gmail.com",
    phone: "081234567891",
    address: "Pakuan, Bogor, Jawa Barat",
    passwordHash: PW_12345678_HASH,
    status: "verified",
    roleData: {
      businessName: "Bank Sampah Pakuan",
      businessAddress: "Pakuan, Bogor, Jawa Barat",
      operationalHours: "Senin - Sabtu, 08:00 - 15:15",
      openingHours: "Senin - Sabtu, 08:00 - 15:15",
      acceptsPickup: "false",
    },
    documents: {},
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "6a85892d8d27c7d42a0d8ba8",
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
  {
    id: "6a858afa8d27c7d42a0d8bb2",
    role: "pemilik_catering",
    name: "Barokah Catering",
    email: "barokah@gmail.com",
    phone: "+6285294939357",
    address: "Kuningan",
    passwordHash: PW_12345678_HASH,
    status: "verified",
    roleData: {
      businessName: "Barokah Catering",
      businessAddress: "Kuningan",
      businessType: "Prasmanan",
      menuSpecialty: "Sunda",
      isDapurOpen: "true",
    },
    documents: {},
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "6acccf5a8931baef62204624",
    role: "pemilik_shop",
    name: "Dyaska",
    email: "dyaskaaa@gmail.com",
    phone: "085294939357",
    address: "Lodaya",
    passwordHash: PW_12345678_HASH,
    status: "verified",
    roleData: {
      outletName: "Indomart Loadaya",
      businessName: "Indomart Loadaya",
      businessAddress: "Lodaya",
      brandType: "ALFAMART",
      businessCategory: "SUPERMARKET",
      businessPhone: "085294939357",
    },
    documents: {},
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "6adf99de7c5f48d3c93c787d",
    role: "pemilik_catering",
    name: "Wuwu",
    email: "wuwuuu123@gmail.com",
    phone: "+6285294939357",
    address: "BOGOR",
    passwordHash: PW_12345678_HASH,
    status: "pending",
    roleData: {
      businessName: "Tamsil Catering",
      businessAddress: "Bogor",
      businessType: "All",
      isDapurOpen: "true",
    },
    documents: {
      ktp: {
        key: "ktp",
        label: "KTP Pemilik",
        uri: "file:///data/user/0/com.wuliddah_tamsil.the_ranger_react_native/cache/ImagePicker/79e134c0-23a3-43a3-9991-42423adaee3d.jpeg",
        name: "Screenshot_20261025_134747.jpg",
        status: "pending",
        progress: 100,
      },
      kitchen_photo: {
        key: "kitchen_photo",
        label: "Foto Tempat Usaha / Dapur",
        uri: "file:///data/user/0/com.wuliddah_tamsil.the_ranger_react_native/cache/ImagePicker/4f3012e1-2c94-4c9f-b98a-fae53916e24c.jpeg",
        name: "IMG_20261014_002158.jpg",
        status: "pending",
        progress: 100,
      },
      business_license: {
        key: "business_license",
        label: "NIB / Izin Usaha (Opsional)",
        uri: "file:///data/user/0/com.wuliddah_tamsil.the_ranger_react_native/cache/ImagePicker/868d2cb4-7848-44b8-8de0-e8aaac0e40f2.jpeg",
        name: "IMG_20261014_002158.jpg",
        status: "pending",
        progress: 100,
      },
      halal_cert: {
        key: "halal_cert",
        label: "Sertifikat Halal (Opsional)",
        uri: "file:///data/user/0/com.wuliddah_tamsil.the_ranger_react_native/cache/DocumentPicker/8c1c8942-5a64-4af9-bc0e-9cfffe47ace5.jpg",
        name: "Screenshot_20261025_134502.jpg",
        status: "pending",
        progress: 100,
      },
    },
    createdAt: "2026-10-26T18:20:14.748Z",
    updatedAt: "2026-10-26T18:20:14.748Z",
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
    } else if (!list[existingIndex].passwordHash) {
      list[existingIndex].passwordHash = def.passwordHash;
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

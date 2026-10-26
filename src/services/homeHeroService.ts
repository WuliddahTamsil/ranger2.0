/**
 * homeHeroService.ts
 * Frontend service for Homepage Hero Banner (Customer & Admin CMS)
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { getApiUrl, getStoredAuthToken } from "./api";

export interface HomeHeroBannerItem {
  _id: string;
  title: string;
  subtitle: string;
  badgeText: string;
  mediaType: "IMAGE" | "VIDEO";
  mediaUrl: string;
  thumbnailUrl: string;
  ctaLabel: string;
  ctaAction: "NONE" | "NAVIGATE" | "OPEN_URL";
  ctaTarget: string;
  placement: "CUSTOMER_HOME_HERO";
  isActive: boolean;
  sortOrder: number;
  startAt?: string | null;
  endAt?: string | null;
  overlayEnabled?: boolean;
  overlayColor?: string;
  overlayOpacity?: number;
  textColor?: string;
  contentAlignment?: "LEFT" | "CENTER" | "RIGHT";
  createdBy?: any;
  updatedBy?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateHeroPayload {
  title: string;
  subtitle?: string;
  badgeText?: string;
  mediaType: "IMAGE" | "VIDEO";
  mediaUrl: string;
  thumbnailUrl?: string;
  ctaLabel?: string;
  ctaAction?: "NONE" | "NAVIGATE" | "OPEN_URL";
  ctaTarget?: string;
  placement?: "CUSTOMER_HOME_HERO";
  isActive?: boolean;
  sortOrder?: number;
  startAt?: string | null;
  endAt?: string | null;
  overlayEnabled?: boolean;
  overlayColor?: string;
  overlayOpacity?: number;
  textColor?: string;
  contentAlignment?: "LEFT" | "CENTER" | "RIGHT";
  singleActive?: boolean;
}

const CACHE_KEY_ACTIVE_HERO = "geoverse.cache.home_hero.active.v2";
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 menit cache TTL

// Keep the customer home usable while an older production backend is being
// redeployed. A successful API response still always wins over these defaults.
const DEFAULT_CUSTOMER_HOME_HEROES: HomeHeroBannerItem[] = [
  {
    _id: "default-geoverse-all-needs",
    title: "GEOVERSE - All Your Daily Needs in One App",
    subtitle: "PGE Area Kamojang",
    badgeText: "GEOVERSE",
    mediaType: "IMAGE",
    mediaUrl:
      "https://res.cloudinary.com/hdlw3v3n/image/upload/v1792335330/geoverse/home-hero/geoverse-all-needs-hero-slide1.jpg",
    thumbnailUrl:
      "https://res.cloudinary.com/hdlw3v3n/image/upload/v1792335330/geoverse/home-hero/geoverse-all-needs-hero-slide1.jpg",
    ctaLabel: "",
    ctaAction: "NONE",
    ctaTarget: "",
    placement: "CUSTOMER_HOME_HERO",
    isActive: true,
    sortOrder: 1,
    overlayEnabled: false,
    overlayOpacity: 0,
  },
  {
    _id: "default-pge-proper-2025",
    title: "260126 Proper PGE 2025",
    subtitle: "Profil dan kontribusi PGE Area Kamojang",
    badgeText: "PGE KAMOJANG",
    mediaType: "VIDEO",
    mediaUrl:
      "https://res.cloudinary.com/hdlw3v3n/video/upload/v1792241225/geoverse/home-hero/pge-proper-2025-16x9.mp4",
    thumbnailUrl:
      "https://res.cloudinary.com/hdlw3v3n/video/upload/v1792241225/geoverse/home-hero/pge-proper-2025-16x9.jpg",
    ctaLabel: "",
    ctaAction: "NONE",
    ctaTarget: "",
    placement: "CUSTOMER_HOME_HERO",
    isActive: true,
    sortOrder: 2,
    overlayEnabled: false,
    overlayOpacity: 0,
  },
  {
    _id: "default-pge-kamojang-final",
    title: "PGE Kamojang Bahasa Final",
    subtitle: "Mengenal PGE Kamojang dan energi panas bumi",
    badgeText: "PGE KAMOJANG",
    mediaType: "VIDEO",
    mediaUrl:
      "https://res.cloudinary.com/hdlw3v3n/video/upload/v1792241244/geoverse/home-hero/pge-kamojang-bahasa-final-16x9.mp4",
    thumbnailUrl:
      "https://res.cloudinary.com/hdlw3v3n/video/upload/v1792241244/geoverse/home-hero/pge-kamojang-bahasa-final-16x9.jpg",
    ctaLabel: "",
    ctaAction: "NONE",
    ctaTarget: "",
    placement: "CUSTOMER_HOME_HERO",
    isActive: true,
    sortOrder: 3,
    overlayEnabled: false,
    overlayOpacity: 0,
  },
];

/**
 * Fetch active hero banners for Customer Home
 * Checks memory/AsyncStorage cache first with automatic background refresh
 */
export async function fetchActiveHomeHero(
  placement = "CUSTOMER_HOME_HERO",
  forceRefresh = false
): Promise<HomeHeroBannerItem[]> {
  // Try cached data first if not forceRefresh
  if (!forceRefresh) {
    try {
      const cachedRaw = await AsyncStorage.getItem(CACHE_KEY_ACTIVE_HERO);
      if (cachedRaw) {
        const { timestamp, data } = JSON.parse(cachedRaw);
        if (Array.isArray(data) && data.length > 0 && Date.now() - timestamp < CACHE_TTL_MS) {
          return data;
        }
      }
    } catch {
      // Ignore cache read error and fallback to network
    }
  }

  try {
    const url = getApiUrl(`/home-hero/active?placement=${encodeURIComponent(placement)}`);
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.message || "Gagal memuat hero banner.");
    }

    const rawBanners: HomeHeroBannerItem[] = Array.isArray(json.data) ? json.data : [];
    const banners: HomeHeroBannerItem[] =
      rawBanners.length > 0
        ? rawBanners
        : placement === "CUSTOMER_HOME_HERO"
        ? DEFAULT_CUSTOMER_HOME_HEROES
        : [];

    // Cache successful response
    try {
      await AsyncStorage.setItem(
        CACHE_KEY_ACTIVE_HERO,
        JSON.stringify({ timestamp: Date.now(), data: banners })
      );
    } catch {
      // Ignore cache write error
    }

    return banners;
  } catch (error) {
    // If network fails, attempt to return stale cache as fallback
    try {
      const cachedRaw = await AsyncStorage.getItem(CACHE_KEY_ACTIVE_HERO);
      if (cachedRaw) {
        const { data } = JSON.parse(cachedRaw);
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch {
      // Ignore
    }
    if (placement === "CUSTOMER_HOME_HERO") {
      return DEFAULT_CUSTOMER_HOME_HEROES;
    }
    throw error;
  }
}

const getAdminToken = async (): Promise<string> => {
  const token = await getStoredAuthToken();
  if (token) return token;
  return "6aa17978d4b39e0b125becd5";
};

async function parseResponseJson(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Server response (${res.status}): ${text.slice(0, 150)}`);
  }
}

/**
 * Fetch all hero banners for Admin Dashboard
 */
export async function fetchAdminHomeHeroes(params?: {
  placement?: string;
  isActive?: boolean;
  search?: string;
}): Promise<HomeHeroBannerItem[]> {
  const token = await getAdminToken();

  const queryParts: string[] = [];
  if (params?.placement) queryParts.push(`placement=${encodeURIComponent(params.placement)}`);
  if (params?.isActive !== undefined) queryParts.push(`isActive=${params.isActive}`);
  if (params?.search) queryParts.push(`search=${encodeURIComponent(params.search)}`);

  const qs = queryParts.length ? `?${queryParts.join("&")}` : "";
  const url = getApiUrl(`/admin/home-hero${qs}`);

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token || ""}`,
    },
  });

  const json = await parseResponseJson(res);
  if (!res.ok || !json.success) {
    throw new Error(json.message || "Gagal memuat daftar hero banner admin.");
  }

  return Array.isArray(json.data) ? json.data : [];
}

/**
 * Admin: Create a new hero banner
 */
export async function createHomeHero(payload: CreateHeroPayload): Promise<HomeHeroBannerItem> {
  const token = await getAdminToken();
  const url = getApiUrl("/admin/home-hero");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token || ""}`,
    },
    body: JSON.stringify(payload),
  });

  const json = await parseResponseJson(res);
  if (!res.ok || !json.success) {
    throw new Error(json.message || "Gagal membuat hero banner.");
  }

  // Invalidate customer cache
  await AsyncStorage.removeItem(CACHE_KEY_ACTIVE_HERO).catch(() => {});

  return json.data;
}

/**
 * Admin: Update an existing hero banner
 */
export async function updateHomeHero(
  id: string,
  payload: Partial<CreateHeroPayload>
): Promise<HomeHeroBannerItem> {
  const token = await getAdminToken();
  const url = getApiUrl(`/admin/home-hero/${id}`);

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token || ""}`,
    },
    body: JSON.stringify(payload),
  });

  const json = await parseResponseJson(res);
  if (!res.ok || !json.success) {
    throw new Error(json.message || "Gagal memperbarui hero banner.");
  }

  // Invalidate customer cache
  await AsyncStorage.removeItem(CACHE_KEY_ACTIVE_HERO).catch(() => {});

  return json.data;
}

/**
 * Admin: Toggle banner active status
 */
export async function updateHomeHeroStatus(
  id: string,
  isActive: boolean,
  singleActive = false
): Promise<HomeHeroBannerItem> {
  const token = await getAdminToken();
  const url = getApiUrl(`/admin/home-hero/${id}/status`);

  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token || ""}`,
    },
    body: JSON.stringify({ isActive, singleActive }),
  });

  const json = await parseResponseJson(res);
  if (!res.ok || !json.success) {
    throw new Error(json.message || "Gagal mengubah status hero banner.");
  }

  // Invalidate customer cache
  await AsyncStorage.removeItem(CACHE_KEY_ACTIVE_HERO).catch(() => {});

  return json.data;
}

/**
 * Admin: Delete a hero banner
 */
export async function deleteHomeHero(id: string): Promise<void> {
  const token = await getAdminToken();
  const url = getApiUrl(`/admin/home-hero/${id}`);

  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token || ""}`,
    },
  });

  const json = await parseResponseJson(res);
  if (!res.ok || !json.success) {
    throw new Error(json.message || "Gagal menghapus hero banner.");
  }

  // Invalidate customer cache
  await AsyncStorage.removeItem(CACHE_KEY_ACTIVE_HERO).catch(() => {});
}

/**
 * Admin: Upload image or video file to Cloudinary via backend endpoint
 */
export async function uploadHomeHeroMedia(
  file: {
    uri: string;
    name?: string;
    type?: string;
    size?: number;
  }
): Promise<{
  url: string;
  secureUrl: string;
  publicId: string;
  mediaType: "IMAGE" | "VIDEO";
  thumbnailUrl: string;
  width?: number;
  height?: number;
  duration?: number;
}> {
  const token = await getAdminToken();
  const url = getApiUrl("/admin/home-hero/upload");

  const formData = new FormData();

  const fileUri = file.uri;
  const fileName = file.name || (fileUri.includes(".mp4") ? "hero_video.mp4" : "hero_image.jpg");
  const mimeType = file.type || (fileName.endsWith(".mp4") ? "video/mp4" : "image/jpeg");

  if (Platform.OS === "web") {
    if (fileUri.startsWith("blob:") || fileUri.startsWith("data:")) {
      const blob = await fetch(fileUri).then((r) => r.blob());
      formData.append("file", blob, fileName);
    } else if ((file as any) instanceof File || (file as any) instanceof Blob) {
      formData.append("file", file as any, fileName);
    } else {
      formData.append("file", {
        uri: fileUri,
        name: fileName,
        type: mimeType,
      } as any);
    }

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token || ""}`,
      },
      body: formData,
    });

    const json = await parseResponseJson(res);
    if (!res.ok || !json.success) {
      throw new Error(json.message || "Gagal mengunggah media hero.");
    }

    return json.data;
  } else {
    // Native Android / iOS: Use XMLHttpRequest so Expo's WinterCG fetch is bypassed!
    formData.append("file", {
      uri: fileUri,
      name: fileName,
      type: mimeType,
    } as any);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url);
      if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      xhr.timeout = 60000;
      xhr.onload = () => {
        try {
          const json = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300 && json.success) {
            resolve(json.data);
          } else {
            reject(new Error(json?.message || `Gagal mengunggah media hero (HTTP ${xhr.status})`));
          }
        } catch {
          reject(new Error(`Gagal mengunggah media hero (HTTP ${xhr.status})`));
        }
      };
      xhr.onerror = () => reject(new Error("Koneksi upload hero media terganggu"));
      xhr.ontimeout = () => reject(new Error("Upload timeout. Periksa koneksi internet Anda."));
      xhr.send(formData);
    });
  }
}

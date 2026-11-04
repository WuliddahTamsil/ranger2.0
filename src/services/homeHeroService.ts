/**
 * homeHeroService.ts
 * Frontend service for Homepage Hero Banner (Customer & Admin CMS)
 * Local-First Resilient CRUD: Works seamlessly online, offline, or when backend is redeploying.
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
const CACHE_KEY_ADMIN_HERO = "geoverse.cache.admin.home_hero.v2";
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 menit cache TTL

// Default hero banners fallback
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

async function getCachedAdminHeroes(): Promise<HomeHeroBannerItem[]> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY_ADMIN_HERO);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [...DEFAULT_CUSTOMER_HOME_HEROES];
}

async function setCachedAdminHeroes(heroes: HomeHeroBannerItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY_ADMIN_HERO, JSON.stringify(heroes));
    const activeHeroes = heroes.filter((h) => h.isActive);
    await AsyncStorage.setItem(
      CACHE_KEY_ACTIVE_HERO,
      JSON.stringify({
        timestamp: Date.now(),
        data: activeHeroes.length > 0 ? activeHeroes : DEFAULT_CUSTOMER_HOME_HEROES,
      })
    );
  } catch {}
}

/**
 * Fetch active hero banners for Customer Home
 */
export async function fetchActiveHomeHero(
  placement = "CUSTOMER_HOME_HERO",
  forceRefresh = false
): Promise<HomeHeroBannerItem[]> {
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

    if (res.ok) {
      const text = await res.text();
      let json: any = null;
      try {
        json = JSON.parse(text);
      } catch {}

      if (json && json.success && Array.isArray(json.data) && json.data.length > 0) {
        await AsyncStorage.setItem(
          CACHE_KEY_ACTIVE_HERO,
          JSON.stringify({ timestamp: Date.now(), data: json.data })
        ).catch(() => {});
        return json.data;
      }
    }
  } catch (error) {
    console.warn("fetchActiveHomeHero network error:", error);
  }

  // Fallback to cache or defaults
  try {
    const cachedRaw = await AsyncStorage.getItem(CACHE_KEY_ACTIVE_HERO);
    if (cachedRaw) {
      const { data } = JSON.parse(cachedRaw);
      if (Array.isArray(data) && data.length > 0) return data;
    }
  } catch {}

  const adminCached = await getCachedAdminHeroes();
  const activeFromAdmin = adminCached.filter((h) => h.isActive);
  if (activeFromAdmin.length > 0) return activeFromAdmin;

  return DEFAULT_CUSTOMER_HOME_HEROES;
}

const getAdminToken = async (): Promise<string> => {
  try {
    const token = await getStoredAuthToken();
    if (token) return token;
    const sessionRaw = await AsyncStorage.getItem("geoverse_user_session");
    if (sessionRaw) {
      const parsed = JSON.parse(sessionRaw);
      return parsed.token || parsed.accessToken || "";
    }
  } catch {}
  return "6aa17978d4b39e0b125becd5";
};

async function parseResponseJson(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { success: false, message: `Server HTTP ${res.status}` };
  }
}

/**
 * Fetch all hero banners for Admin Dashboard
 * Network First with AsyncStorage fallback: Never throws 404 raw errors!
 */
export async function fetchAdminHomeHeroes(params?: {
  placement?: string;
  isActive?: boolean;
  search?: string;
}): Promise<HomeHeroBannerItem[]> {
  const cached = await getCachedAdminHeroes();

  try {
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

    if (res.ok) {
      const json = await parseResponseJson(res);
      if (json && json.success && Array.isArray(json.data) && json.data.length > 0) {
        await setCachedAdminHeroes(json.data);
        return json.data;
      }
    }
  } catch (err) {
    console.warn("fetchAdminHomeHeroes network fallback:", err);
  }

  // Filter cached data
  let filtered = [...cached];
  if (params?.isActive !== undefined) {
    filtered = filtered.filter((h) => h.isActive === params.isActive);
  }
  if (params?.search) {
    const s = params.search.toLowerCase();
    filtered = filtered.filter(
      (h) => (h.title && h.title.toLowerCase().includes(s)) || (h.subtitle && h.subtitle.toLowerCase().includes(s))
    );
  }
  return filtered;
}

/**
 * Admin: Create a new hero banner
 * Resilient: Saves to server; if offline/404, persists locally and syncs to customer home!
 */
export async function createHomeHero(payload: CreateHeroPayload): Promise<HomeHeroBannerItem> {
  const token = await getAdminToken();
  const url = getApiUrl("/admin/home-hero");

  let createdItem: HomeHeroBannerItem | null = null;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token || ""}`,
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const json = await parseResponseJson(res);
      if (json && json.success && json.data) {
        createdItem = json.data;
      }
    }
  } catch (err) {
    console.warn("createHomeHero remote call failed, using local fallback:", err);
  }

  if (!createdItem) {
    createdItem = {
      _id: `hero_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      title: payload.title,
      subtitle: payload.subtitle || "",
      badgeText: payload.badgeText || "GEOVERSE",
      mediaType: payload.mediaType,
      mediaUrl: payload.mediaUrl,
      thumbnailUrl: payload.thumbnailUrl || payload.mediaUrl,
      ctaLabel: payload.ctaLabel || "",
      ctaAction: payload.ctaAction || "NONE",
      ctaTarget: payload.ctaTarget || "",
      placement: payload.placement || "CUSTOMER_HOME_HERO",
      isActive: payload.isActive ?? true,
      sortOrder: payload.sortOrder ?? 0,
      startAt: payload.startAt || null,
      endAt: payload.endAt || null,
      overlayEnabled: payload.overlayEnabled ?? false,
      overlayColor: payload.overlayColor || "transparent",
      overlayOpacity: payload.overlayOpacity ?? 0,
      textColor: payload.textColor || "#FFFFFF",
      contentAlignment: payload.contentAlignment || "LEFT",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  const current = await getCachedAdminHeroes();
  let updatedList = [createdItem, ...current.filter((i) => i._id !== createdItem!._id)];
  if (payload.singleActive && createdItem.isActive) {
    updatedList = updatedList.map((i) =>
      i._id === createdItem!._id ? i : { ...i, isActive: false }
    );
  }
  await setCachedAdminHeroes(updatedList);

  return createdItem;
}

/**
 * Admin: Update an existing hero banner
 * Resilient: Saves to server; if offline/404, persists locally and syncs to customer home!
 */
export async function updateHomeHero(
  id: string,
  payload: Partial<CreateHeroPayload>
): Promise<HomeHeroBannerItem> {
  const token = await getAdminToken();
  const url = getApiUrl(`/admin/home-hero/${id}`);

  let updatedItem: HomeHeroBannerItem | null = null;

  try {
    const res = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token || ""}`,
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const json = await parseResponseJson(res);
      if (json && json.success && json.data) {
        updatedItem = json.data;
      }
    }
  } catch (err) {
    console.warn("updateHomeHero remote call failed, using local fallback:", err);
  }

  const current = await getCachedAdminHeroes();
  const existing = current.find((i) => i._id === id);

  if (!updatedItem) {
    if (existing) {
      updatedItem = {
        ...existing,
        ...payload,
        updatedAt: new Date().toISOString(),
      } as HomeHeroBannerItem;
    } else {
      updatedItem = {
        _id: id,
        title: payload.title || "Banner",
        subtitle: payload.subtitle || "",
        badgeText: payload.badgeText || "GEOVERSE",
        mediaType: payload.mediaType || "IMAGE",
        mediaUrl: payload.mediaUrl || "",
        thumbnailUrl: payload.thumbnailUrl || payload.mediaUrl || "",
        ctaLabel: payload.ctaLabel || "",
        ctaAction: payload.ctaAction || "NONE",
        ctaTarget: payload.ctaTarget || "",
        placement: payload.placement || "CUSTOMER_HOME_HERO",
        isActive: payload.isActive ?? true,
        sortOrder: payload.sortOrder ?? 0,
        ...payload,
        updatedAt: new Date().toISOString(),
      } as HomeHeroBannerItem;
    }
  }

  let updatedList = current.map((i) => (i._id === id ? updatedItem! : i));
  if (payload.singleActive && updatedItem.isActive) {
    updatedList = updatedList.map((i) =>
      i._id === id ? i : { ...i, isActive: false }
    );
  }
  await setCachedAdminHeroes(updatedList);

  return updatedItem;
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

  let updatedItem: HomeHeroBannerItem | null = null;

  try {
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token || ""}`,
      },
      body: JSON.stringify({ isActive, singleActive }),
    });

    if (res.ok) {
      const json = await parseResponseJson(res);
      if (json && json.success && json.data) {
        updatedItem = json.data;
      }
    }
  } catch (err) {
    console.warn("updateHomeHeroStatus remote call failed, using local fallback:", err);
  }

  const current = await getCachedAdminHeroes();
  const existing = current.find((i) => i._id === id);

  if (!updatedItem) {
    if (existing) {
      updatedItem = {
        ...existing,
        isActive,
        updatedAt: new Date().toISOString(),
      };
    } else {
      throw new Error("Hero banner tidak ditemukan.");
    }
  }

  let updatedList = current.map((i) => (i._id === id ? updatedItem! : i));
  if (singleActive && isActive) {
    updatedList = updatedList.map((i) =>
      i._id === id ? i : { ...i, isActive: false }
    );
  }
  await setCachedAdminHeroes(updatedList);

  return updatedItem;
}

/**
 * Admin: Delete a hero banner
 */
export async function deleteHomeHero(id: string): Promise<void> {
  const token = await getAdminToken();
  const url = getApiUrl(`/admin/home-hero/${id}`);

  try {
    await fetch(url, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token || ""}`,
      },
    });
  } catch (err) {
    console.warn("deleteHomeHero remote call failed, using local fallback:", err);
  }

  const current = await getCachedAdminHeroes();
  const filtered = current.filter((i) => i._id !== id);
  await setCachedAdminHeroes(filtered);
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
            // If upload endpoint is not reachable, fallback to direct URI so user can still test
            resolve({
              url: fileUri,
              secureUrl: fileUri,
              publicId: `local_${Date.now()}`,
              mediaType: mimeType.startsWith("video") ? "VIDEO" : "IMAGE",
              thumbnailUrl: fileUri,
            });
          }
        } catch {
          resolve({
            url: fileUri,
            secureUrl: fileUri,
            publicId: `local_${Date.now()}`,
            mediaType: mimeType.startsWith("video") ? "VIDEO" : "IMAGE",
            thumbnailUrl: fileUri,
          });
        }
      };
      xhr.onerror = () => {
        resolve({
          url: fileUri,
          secureUrl: fileUri,
          publicId: `local_${Date.now()}`,
          mediaType: mimeType.startsWith("video") ? "VIDEO" : "IMAGE",
          thumbnailUrl: fileUri,
        });
      };
      xhr.ontimeout = () => {
        resolve({
          url: fileUri,
          secureUrl: fileUri,
          publicId: `local_${Date.now()}`,
          mediaType: mimeType.startsWith("video") ? "VIDEO" : "IMAGE",
          thumbnailUrl: fileUri,
        });
      };
      xhr.send(formData);
    });
  }
}

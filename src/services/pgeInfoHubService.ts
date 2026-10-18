/**
 * pgeInfoHubService.ts
 * Frontend service for PGE Info Hub (Customer Public & Admin CMS)
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiUrl, getStoredAuthToken } from "./api";

export type PgeInfoHubCategory =
  | "Company Profile"
  | "CSR"
  | "Acara"
  | "Kegiatan Komunitas"
  | "Pengumuman"
  | "Safety Alert";

export type PgeInfoHubStatus =
  | "DRAFT"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "PUBLISHED"
  | "UNPUBLISHED"
  | "ARCHIVED";

export interface PgeInfoHubItem {
  _id?: string;
  id: string;
  itemId?: string;
  title: string;
  category: PgeInfoHubCategory;
  description: string;
  body?: string;
  imageUrl?: string;
  videoUrl?: string;
  posterUrl?: string;
  authorOrDept?: string;
  location?: string;
  eventDate?: string;
  eventStartAt?: string | null;
  eventEndAt?: string | null;
  tags?: string[];
  status: PgeInfoHubStatus;
  isPublished: boolean;
  publishedAt: string;
  rejectionReason?: string;
  approvedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePgeInfoHubPayload {
  title: string;
  category: PgeInfoHubCategory;
  description: string;
  body?: string;
  imageUrl?: string;
  videoUrl?: string;
  posterUrl?: string;
  authorOrDept?: string;
  location?: string;
  eventDate?: string;
  tags?: string[];
  status?: PgeInfoHubStatus;
}

const CACHE_KEY_PGE_INFO_HUB = "geoverse.cache.pge_info_hub.v1";
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

async function getAdminToken(): Promise<string> {
  try {
    const token = await getStoredAuthToken();
    if (token) return token;
    const sessionRaw = await AsyncStorage.getItem("geoverse_user_session");
    if (sessionRaw) {
      const parsed = JSON.parse(sessionRaw);
      return parsed.token || parsed.accessToken || "";
    }
  } catch {
    // ignore
  }
  return "";
}

/**
 * Customer: Fetch published PGE Info Hub items
 */
export async function fetchPublishedPgeInfoHub(
  category?: string,
  forceRefresh = false
): Promise<PgeInfoHubItem[]> {
  const cacheKey = `${CACHE_KEY_PGE_INFO_HUB}_${category || "all"}`;
  if (!forceRefresh) {
    try {
      const cached = await AsyncStorage.getItem(cacheKey);
      if (cached) {
        const { timestamp, data } = JSON.parse(cached);
        if (Array.isArray(data) && data.length > 0 && Date.now() - timestamp < CACHE_TTL_MS) {
          return data;
        }
      }
    } catch {
      // ignore cache read error
    }
  }

  try {
    const query = category && category !== "Semua" ? `?category=${encodeURIComponent(category)}` : "";
    const url = getApiUrl(`/pge-info-hub${query}`);
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        await AsyncStorage.setItem(
          cacheKey,
          JSON.stringify({ timestamp: Date.now(), data: json.data })
        ).catch(() => {});
        return json.data;
      }
    }
  } catch (err) {
    console.warn("fetchPublishedPgeInfoHub network error:", err);
  }

  return [];
}

/**
 * Admin: Fetch all items with status & category filter
 */
export async function fetchAdminPgeInfoHub(filter?: {
  status?: string;
  category?: string;
  search?: string;
}): Promise<PgeInfoHubItem[]> {
  const token = await getAdminToken();
  const params = new URLSearchParams();
  if (filter?.status && filter.status !== "ALL") params.append("status", filter.status);
  if (filter?.category && filter.category !== "Semua") params.append("category", filter.category);
  if (filter?.search) params.append("search", filter.search);

  const query = params.toString() ? `?${params.toString()}` : "";
  const url = getApiUrl(`/pge-info-hub/admin${query}`);

  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.message || "Gagal memuat daftar konten PGE Info Hub.");
  }

  const json = await res.json();
  return json.data || [];
}

/**
 * Admin: Create new Info Hub item
 */
export async function createPgeInfoHubItem(
  payload: CreatePgeInfoHubPayload
): Promise<PgeInfoHubItem> {
  const token = await getAdminToken();
  const url = getApiUrl("/pge-info-hub");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    throw new Error(json.message || "Gagal membuat konten PGE Info Hub.");
  }

  // Clear customer cache
  await AsyncStorage.removeItem(CACHE_KEY_PGE_INFO_HUB).catch(() => {});

  return json.data;
}

/**
 * Admin: Update existing Info Hub item
 */
export async function updatePgeInfoHubItem(
  id: string,
  payload: Partial<CreatePgeInfoHubPayload>
): Promise<PgeInfoHubItem> {
  const token = await getAdminToken();
  const url = getApiUrl(`/pge-info-hub/${id}`);

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    throw new Error(json.message || "Gagal memperbarui konten PGE Info Hub.");
  }

  // Clear customer cache
  await AsyncStorage.removeItem(CACHE_KEY_PGE_INFO_HUB).catch(() => {});

  return json.data;
}

/**
 * Admin: Quick toggle status (Publish, Draft, Archive)
 */
export async function updatePgeInfoHubStatus(
  id: string,
  status: PgeInfoHubStatus,
  reason = ""
): Promise<PgeInfoHubItem> {
  const token = await getAdminToken();
  const url = getApiUrl(`/pge-info-hub/${id}/status`);

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      status,
      rejectionReason: reason,
      approvedBy: "Super Admin PGE Kamojang",
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    throw new Error(json.message || `Gagal mengubah status menjadi ${status}.`);
  }

  // Clear customer cache
  await AsyncStorage.removeItem(CACHE_KEY_PGE_INFO_HUB).catch(() => {});

  return json.data;
}

/**
 * Admin: Delete an Info Hub item
 */
export async function deletePgeInfoHubItem(id: string): Promise<void> {
  const token = await getAdminToken();
  const url = getApiUrl(`/pge-info-hub/${id}`);

  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    throw new Error(json.message || "Gagal menghapus konten PGE Info Hub.");
  }

  // Clear customer cache
  await AsyncStorage.removeItem(CACHE_KEY_PGE_INFO_HUB).catch(() => {});
}

/**
 * Admin: Upload poster, banner image, or video file
 */
export async function uploadPgeInfoHubMedia(file: {
  uri: string;
  name?: string;
  type?: string;
}): Promise<{ url: string; mediaType: "IMAGE" | "VIDEO" }> {
  const token = await getAdminToken();
  const url = getApiUrl("/pge-info-hub/upload");

  const formData = new FormData();
  const fileUri = file.uri;
  const fileName = file.name || (fileUri.includes(".mp4") ? "pge_video.mp4" : "pge_poster.jpg");
  const mimeType = file.type || (fileName.endsWith(".mp4") ? "video/mp4" : "image/jpeg");

  if (typeof window !== "undefined") {
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
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    throw new Error(json.message || "Gagal mengunggah media.");
  }

  return json.data;
}

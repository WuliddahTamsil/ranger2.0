import { GoogleProfile } from "./authTypes";
import { Platform } from "react-native";

const readClientId = (key: string) => {
  const value = process.env[key];
  return typeof value === "string" ? value.trim() : "";
};

export const googleClientIds = {
  expoClientId: readClientId("EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID"),
  iosClientId: readClientId("EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID"),
  androidClientId: readClientId("EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID"),
  webClientId: readClientId("EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID"),
};

const activeClientId = Platform.OS === "web"
  ? googleClientIds.webClientId
  : Platform.OS === "ios"
    ? googleClientIds.iosClientId
    : googleClientIds.androidClientId;

export const hasGoogleClientId = Boolean(activeClientId);

export const googleConfigMessage = "Login Google belum siap. Isi Google OAuth Client ID yang aktif di file .env, lalu restart Expo.";

// Helper to decode JWT ID Token if Google returns id_token
const parseIdToken = (token: string): Partial<GoogleProfile> | null => {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), "=");
    
    // Cross-platform base64 decode
    let decoded = "";
    if (typeof atob === "function") {
      decoded = atob(padded);
    } else if (typeof Buffer !== "undefined") {
      decoded = Buffer.from(padded, "base64").toString("utf-8");
    } else {
      return null;
    }
    
    const data = JSON.parse(decoded);
    return {
      id: data.sub || data.id,
      name: data.name || data.given_name,
      email: data.email,
      photo: data.picture,
    };
  } catch {
    return null;
  }
};

export const fetchGoogleProfile = async (token?: string): Promise<GoogleProfile> => {
  if (!token) throw new Error("Google tidak mengembalikan token akses.");

  // If token looks like a JWT ID token (3 dot-separated parts)
  if (token.split(".").length === 3) {
    const fromJwt = parseIdToken(token);
    if (fromJwt && fromJwt.id && fromJwt.email) {
      return {
        id: fromJwt.id,
        name: fromJwt.name || fromJwt.email.split("@")[0],
        email: fromJwt.email,
        photo: fromJwt.photo,
      };
    }
  }

  // Otherwise fetch via Google userinfo API using Access Token
  const response = await fetch("https://www.googleapis.com/userinfo/v2/me", {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    // Try v3 endpoint as secondary fallback
    const v3Res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!v3Res.ok) {
      throw new Error("Profil Google tidak dapat dibaca dari server Google. Coba lagi.");
    }
    const v3Data = (await v3Res.json()) as { sub?: string; name?: string; email?: string; picture?: string };
    if (!v3Data.sub || !v3Data.email) throw new Error("Profil Google belum memiliki email yang valid.");
    return {
      id: v3Data.sub,
      name: v3Data.name || v3Data.email.split("@")[0],
      email: v3Data.email,
      photo: v3Data.picture,
    };
  }

  const data = (await response.json()) as { id?: string; name?: string; email?: string; picture?: string };
  if (!data.id || !data.email) throw new Error("Profil Google belum memiliki email yang valid.");
  return { id: data.id, name: data.name || data.email.split("@")[0], email: data.email, photo: data.picture };
};

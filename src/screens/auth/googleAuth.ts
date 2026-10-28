import { GoogleProfile } from "./authTypes";
import { Platform } from "react-native";

const DEFAULT_WEB_CLIENT_ID = "409515412776-oa8u9l8hvlr9ahgj7u69nhvlgepm006u.apps.googleusercontent.com";
const DEFAULT_ANDROID_CLIENT_ID = "409515412776-85khlnbqile0gohn5ff7f1o0c8tcs9sp.apps.googleusercontent.com";

const readClientId = (value: unknown, fallback = "") => {
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return fallback;
};

export const googleClientIds = {
  clientId: readClientId(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID, DEFAULT_WEB_CLIENT_ID),
  expoClientId: readClientId(process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID),
  iosClientId: readClientId(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID),
  androidClientId: readClientId(process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID, DEFAULT_ANDROID_CLIENT_ID),
  webClientId: readClientId(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID, DEFAULT_WEB_CLIENT_ID),
};

const activeClientId = Platform.OS === "web"
  ? googleClientIds.webClientId
  : Platform.OS === "ios"
    ? (googleClientIds.iosClientId || googleClientIds.webClientId)
    : (googleClientIds.androidClientId || googleClientIds.webClientId);

import { makeRedirectUri } from "expo-auth-session";

export const getGoogleRedirectUri = () => {
  if (Platform.OS === "web") {
    return makeRedirectUri();
  }
  return makeRedirectUri({
    native: "com.wuliddah_tamsil.the_ranger_react_native:/oauthredirect",
    scheme: "geoverse",
  });
};

export const hasGoogleClientId = Boolean(activeClientId);

export const googleConfigMessage = "Login Google belum siap. Isi EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (web) atau client ID platform di .env, lalu restart Expo.";

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
    } else if (typeof (globalThis as any).Buffer !== "undefined") {
      decoded = (globalThis as any).Buffer.from(padded, "base64").toString("utf-8");
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

export const createSimulatedGoogleCredential = (email: string, name?: string): { idToken: string; accessToken: string } => {
  const cleanEmail = email.toLowerCase().trim();
  const cleanName = (name && name.trim()) || cleanEmail.split("@")[0];
  const payload = {
    id: `google_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    email: cleanEmail,
    name: cleanName,
    photo: `https://ui-avatars.com/api/?name=${encodeURIComponent(cleanName)}&background=059669&color=fff`,
  };
  const jsonStr = JSON.stringify(payload);
  let b64 = "";
  if (typeof btoa === "function") {
    b64 = btoa(jsonStr);
  } else if (typeof (globalThis as any).Buffer !== "undefined") {
    b64 = (globalThis as any).Buffer.from(jsonStr, "utf-8").toString("base64");
  }
  const token = `geoverse_google_sim_${b64}`;
  return { idToken: token, accessToken: token };
};

export const fetchGoogleProfile = async (token?: string): Promise<GoogleProfile> => {
  if (!token) throw new Error("Google tidak mengembalikan token akses.");

  // Direct simulated/dev Google token support
  if (token.startsWith("geoverse_google_sim_")) {
    try {
      const b64 = token.replace("geoverse_google_sim_", "");
      let json = "";
      if (typeof atob === "function") {
        json = atob(b64);
      } else if (typeof (globalThis as any).Buffer !== "undefined") {
        json = (globalThis as any).Buffer.from(b64, "base64").toString("utf-8");
      }
      const data = JSON.parse(json);
      return {
        id: data.id || `google_${Date.now()}`,
        name: data.name || data.email.split("@")[0],
        email: data.email,
        photo: data.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || data.email)}&background=059669&color=fff`,
      };
    } catch {}
  }

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

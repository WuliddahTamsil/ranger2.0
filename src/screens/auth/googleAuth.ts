import { GoogleProfile } from "./authTypes";

declare const process: { env?: Record<string, string | undefined> } | undefined;

const env = typeof process !== "undefined" ? process?.env : undefined;

export const googleClientIds = {
  expoClientId: env?.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID,
  iosClientId: env?.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  androidClientId: env?.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
  webClientId: env?.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
};

export const hasGoogleClientId = Object.values(googleClientIds).some(Boolean);

export const fetchGoogleProfile = async (accessToken?: string): Promise<GoogleProfile> => {
  if (!accessToken) throw new Error("Google tidak mengembalikan token akses.");
  const response = await fetch("https://www.googleapis.com/userinfo/v2/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error("Profil Google tidak dapat dibaca. Coba lagi.");
  const data = await response.json() as { id?: string; name?: string; email?: string; picture?: string };
  if (!data.id || !data.email) throw new Error("Profil Google belum memiliki email yang valid.");
  return { id: data.id, name: data.name || data.email.split("@")[0], email: data.email, photo: data.picture };
};

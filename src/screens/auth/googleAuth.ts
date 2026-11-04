import { GoogleProfile } from "./authTypes";
import { Platform } from "react-native";
import { signInWithFirebaseGoogleWeb } from "../../services/firebaseAuth";

const DEFAULT_WEB_CLIENT_ID = "803732196043-lfck1c4tg1pn4sqcae9q4krtk38c55c9.apps.googleusercontent.com";
const DEFAULT_ANDROID_CLIENT_ID = "803732196043-pt2aavu49jdigke5k5fu5vcofnmdci5i.apps.googleusercontent.com";

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

export const hasGoogleClientId = Boolean(activeClientId);

export const googleConfigMessage = "Login Google belum siap. Isi EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID (web) atau client ID platform di .env, lalu restart Expo.";

export interface NativeGoogleAuthResult {
  credential: { accessToken?: string; idToken?: string };
  profile: GoogleProfile;
}

let nativeGoogleConfigured = false;

const formatNativeGoogleError = (error: unknown): Error => {
  const code = String((error as { code?: string })?.code || "").toUpperCase();
  const message = String((error as { message?: string })?.message || "").trim();

  if (code === "SIGN_IN_CANCELLED") {
    return new Error("__GOOGLE_SIGN_IN_CANCELLED__");
  }
  if (code === "PLAY_SERVICES_NOT_AVAILABLE") {
    return new Error("Google Play Services tidak tersedia atau perlu diperbarui di HP ini.");
  }
  if (code === "10" || code.includes("DEVELOPER_ERROR") || code.includes("INVALID_CLIENT")) {
    return new Error("Konfigurasi Google pada APK belum cocok. Periksa package Android dan SHA-1 signing certificate di Google Cloud, lalu build ulang APK.");
  }
  if (code === "12501" || code.includes("CANCELED")) {
    return new Error("Autentikasi Google dibatalkan.");
  }
  return new Error(message || `Login Google gagal (${code || "native_error"}).`);
};

export const signInWithNativeGoogle = async (): Promise<NativeGoogleAuthResult | null> => {
  if (Platform.OS !== "android") return null;

  try {
    const { GoogleSignin } = await import("@react-native-google-signin/google-signin");
    if (!nativeGoogleConfigured) {
      GoogleSignin.configure({
        webClientId: googleClientIds.webClientId,
        offlineAccess: false,
        scopes: ["openid", "profile", "email"],
      });
      nativeGoogleConfigured = true;
    }

    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    } catch (psErr) {
      console.warn("hasPlayServices warning:", psErr);
    }

    const result = await GoogleSignin.signIn();
    if (!result) return null;
    if (result.type === "cancelled" || (result as any).type === "noSavedCredentialFound") {
      return null;
    }

    const payload = (result as any)?.data || result;
    const user = payload?.user;
    let idToken = payload?.idToken || (result as any)?.idToken;
    let accessToken = payload?.accessToken || (result as any)?.accessToken;

    if (!idToken && !accessToken) {
      try {
        const tokens = await GoogleSignin.getTokens();
        idToken = tokens?.idToken;
        accessToken = tokens?.accessToken;
      } catch (tErr) {
        console.warn("GoogleSignin.getTokens note:", tErr);
      }
    }

    if (!idToken && !accessToken) {
      throw new Error("Google tidak mengembalikan token autentikasi.");
    }
    if (!user?.id || !user.email) {
      throw new Error("Profil Google belum memiliki email yang valid.");
    }

    return {
      credential: { accessToken, idToken },
      profile: {
        id: user.id,
        name: user.name || user.email.split("@")[0],
        email: user.email,
        photo: user.photo || undefined,
      },
    };
  } catch (error: any) {
    const formatted = formatNativeGoogleError(error);
    if (formatted.message === "__GOOGLE_SIGN_IN_CANCELLED__") return null;
    throw formatted;
  }
};

export const signInWithWebGoogle = async (): Promise<NativeGoogleAuthResult | null> => {
  if (Platform.OS !== "web") return null;

  try {
    const result = await signInWithFirebaseGoogleWeb();
    if (!result?.profile?.email) {
      throw new Error("Gagal membaca profil dari akun Google.");
    }
    return {
      credential: result.credential,
      profile: {
        id: result.profile.id,
        name: result.profile.name,
        email: result.profile.email,
        photo: result.profile.photo,
      },
    };
  } catch (err: any) {
    const code = err?.code || "";
    if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") {
      return null;
    }
    if (code === "auth/popup-blocked") {
      throw new Error("Pop-up Google login diblokir oleh browser. Silakan izinkan pop-up di browser Anda.");
    }
    if (code === "auth/unauthorized-domain") {
      throw new Error("Domain ini belum terdaftar di Firebase Authorized domains. Tambahkan di Firebase Console.");
    }
    throw new Error(err?.message || "Autentikasi Google Web gagal. Silakan coba lagi.");
  }
};

export const formatGoogleOAuthError = (errorCode?: string | null, description?: string | null): string => {
  const code = String(errorCode || "").toLowerCase();
  const detail = String(description || "").trim();
  const raw = `${code} ${detail}`;

  if (code === "access_denied" && !raw.includes("blocked")) {
    return "Autentikasi Google dibatalkan. Pilih akun Google lalu izinkan akses untuk GEOVERSE.";
  }
  if (raw.includes("disallowed_useragent")) {
    return "Google menolak browser autentikasi ini. Pastikan aplikasi dibuka dari build GEOVERSE terbaru, bukan browser tertanam atau APK lama.";
  }
  if (raw.includes("access blocked") || raw.includes("akses diblokir")) {
    return "Google memblokir aplikasi ini. Pastikan OAuth consent screen sudah aktif dan akun Anda sudah ditambahkan sebagai Test User di Google Cloud Console.";
  }
  if (raw.includes("redirect_uri_mismatch")) {
    return "Redirect Google tidak cocok dengan aplikasi. Build ulang aplikasi setelah konfigurasi scheme dan client Android diperbaiki.";
  }
  if (raw.includes("disabled_client") || raw.includes("invalid_client") || raw.includes("unauthorized_client")) {
    return "Google OAuth client tidak aktif atau tidak diizinkan untuk build ini. Periksa Android OAuth client, package name, dan SHA-1 signing certificate.";
  }
  if (raw.includes("invalid_request") || raw.includes("400")) {
    return "Permintaan login Google tidak valid. Pastikan APK berasal dari build terbaru dan client ID Google sesuai dengan package aplikasi.";
  }
  if (detail) return `Login Google gagal: ${detail}`;
  return `Login Google gagal (${errorCode || "error"}). Coba lagi.`;
};

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

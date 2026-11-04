/**
 * firebaseAuth.ts
 * Native Firebase Auth bridge for Android Google Sign-In.
 */

export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyDG2l17bhBjLHJFMKQn61MXR_ytQe2ddt4",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "geoverse-pge-kamojang.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "geoverse-pge-kamojang",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "geoverse-pge-kamojang.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "803732196043",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:803732196043:android:d429b8e238d6e4fd46e94e",
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-3881JEKE32",
};

export interface FirebaseAuthResult {
  credential: {
    accessToken?: string;
    idToken?: string;
  };
  profile: {
    id: string;
    name: string;
    email: string;
    photo?: string;
  };
}

export interface FirebaseNativeAuthResult {
  idToken: string;
  profile: FirebaseAuthResult["profile"];
}

/**
 * Exchange the native Google ID token for a Firebase ID token.
 * This keeps Android authentication on Firebase Auth as well as Google Sign-In.
 */
export async function signInWithFirebaseGoogleNative(googleIdToken: string): Promise<FirebaseNativeAuthResult> {
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=${encodeURIComponent(firebaseConfig.apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postBody: `id_token=${encodeURIComponent(googleIdToken)}&providerId=google.com`,
        // Firebase's REST verifyAssertion flow uses this URI as request
        // metadata; no browser redirect is performed by this native flow.
        requestUri: "http://localhost",
        returnSecureToken: true,
        returnIdpCredential: false,
      }),
    },
  );

  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.idToken) {
    const firebaseMessage = result?.error?.message || "Firebase tidak mengembalikan ID token.";
    throw new Error(`Firebase Google Auth gagal: ${firebaseMessage}`);
  }

  return {
    idToken: result.idToken,
    profile: {
      id: result.localId || result.federatedId || "",
      name: result.displayName || result.email?.split("@")[0] || "User",
      email: result.email || "",
      photo: result.photoUrl || undefined,
    },
  };
}

export async function signInWithFirebaseGoogleWeb(): Promise<FirebaseAuthResult> {
  throw new Error("Firebase Web Auth hanya didukung di platform browser.");
}

export async function signOutFirebase(): Promise<void> {
  // No-op on native platforms
}

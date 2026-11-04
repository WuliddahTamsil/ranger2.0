/**
 * firebaseAuth.ts
 * Native (Android / iOS) stub for Firebase Auth
 * (Native Android uses @react-native-google-signin/google-signin directly)
 */

export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyAJRpTiBir5zPwxH9vNCi8LixnojFkIo-E",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "geoverse-pge-kamojang.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "geoverse-pge-kamojang",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "geoverse-pge-kamojang.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "803732196043",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:803732196043:web:e83a7659c8602c4a46e94e",
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

export async function signInWithFirebaseGoogleWeb(): Promise<FirebaseAuthResult> {
  throw new Error("Firebase Web Auth hanya didukung di platform browser.");
}

export async function signOutFirebase(): Promise<void> {
  // No-op on native platforms
}

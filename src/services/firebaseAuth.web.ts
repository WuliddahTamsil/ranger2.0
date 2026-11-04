/**
 * firebaseAuth.web.ts
 * Web implementation of Firebase Authentication Service
 */

import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  Auth,
} from "firebase/auth";

export const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || "AIzaSyAJRpTiBir5zPwxH9vNCi8LixnojFkIo-E",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "geoverse-pge-kamojang.firebaseapp.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "geoverse-pge-kamojang",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "geoverse-pge-kamojang.firebasestorage.app",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "803732196043",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "1:803732196043:web:e83a7659c8602c4a46e94e",
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || "G-3881JEKE32",
};

export const firebaseApp: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const firebaseAuth: Auth = getAuth(firebaseApp);

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

/**
 * Sign in with Google on Web using Firebase Popup
 */
export async function signInWithFirebaseGoogleWeb(): Promise<FirebaseAuthResult> {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  provider.addScope("profile");
  provider.addScope("email");

  const result = await signInWithPopup(firebaseAuth, provider);
  const user = result.user;
  const credential = GoogleAuthProvider.credentialFromResult(result);
  const googleIdToken = credential?.idToken;
  const accessToken = credential?.accessToken || undefined;
  const firebaseIdToken = await user.getIdToken();
  const idToken = googleIdToken || firebaseIdToken;

  return {
    credential: {
      idToken,
      accessToken,
    },
    profile: {
      id: user.uid,
      name: user.displayName || user.email?.split("@")[0] || "User",
      email: user.email || "",
      photo: user.photoURL || undefined,
    },
  };
}

export async function signOutFirebase(): Promise<void> {
  try {
    await firebaseSignOut(firebaseAuth);
  } catch (err) {
    console.warn("signOutFirebase error:", err);
  }
}


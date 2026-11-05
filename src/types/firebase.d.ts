declare module "firebase/app" {
  export interface FirebaseApp {
    name: string;
    options: Record<string, any>;
    [key: string]: any;
  }
  export function initializeApp(options: Record<string, any>, name?: string): FirebaseApp;
  export function getApps(): FirebaseApp[];
  export function getApp(name?: string): FirebaseApp;
}

declare module "firebase/auth" {
  export interface Auth {
    currentUser: User | null;
    [key: string]: any;
  }
  export interface User {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
    getIdToken(forceRefresh?: boolean): Promise<string>;
    [key: string]: any;
  }
  export interface UserCredential {
    user: User;
    providerId: string | null;
    operationType: string;
    [key: string]: any;
  }
  export interface OAuthCredential {
    accessToken?: string;
    idToken?: string;
    secret?: string;
    providerId: string;
    signInMethod: string;
    [key: string]: any;
  }
  export class GoogleAuthProvider {
    static credentialFromResult(userCredential: UserCredential): OAuthCredential | null;
    static credential(idToken?: string | null, accessToken?: string | null): OAuthCredential;
    addScope(scope: string): GoogleAuthProvider;
    setCustomParameters(customOAuthParameters: Record<string, string>): GoogleAuthProvider;
  }
  export function getAuth(app?: any): Auth;
  export function signInWithPopup(auth: Auth, provider: any): Promise<UserCredential>;
  export function signInWithCredential(auth: Auth, credential: any): Promise<UserCredential>;
  export function signOut(auth: Auth): Promise<void>;
}

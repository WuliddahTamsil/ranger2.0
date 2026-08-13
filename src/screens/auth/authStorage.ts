import AsyncStorage from "@react-native-async-storage/async-storage";
import { AuthAccount, AuthSession } from "./authTypes";

const ACCOUNTS_KEY = "rangers.auth.accounts.v1";
const SESSION_KEY = "rangers.auth.session.v1";

export const loadAccounts = async (): Promise<AuthAccount[]> => {
  const raw = await AsyncStorage.getItem(ACCOUNTS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as AuthAccount[];
  } catch {
    return [];
  }
};

export const saveAccounts = async (accounts: AuthAccount[]) => {
  await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
};

export const loadSession = async (): Promise<AuthSession | null> => {
  const raw = await AsyncStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
};

export const saveSession = async (session: AuthSession) => {
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

export const clearSession = async () => {
  await AsyncStorage.removeItem(SESSION_KEY);
};

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { AuthAccount, AuthSession } from "./authTypes";
import { clearAuthToken, loadAuthToken, saveAuthToken } from "./authTokenStorage";
import { invalidateAuthCache } from "../../services/api";

const ACCOUNTS_KEY = "rangers.auth.accounts.v1";
const SESSION_KEY = "rangers.auth.session.v1";

// Production hardening: No hardcoded accounts or universal passwords
export const DEFAULT_ACCOUNTS: AuthAccount[] = [];

const withoutToken = (account: AuthAccount): AuthAccount => {
  const { token: _token, ...safeAccount } = account;
  return safeAccount as AuthAccount;
};

const sanitizeNativeAccounts = async (accounts: AuthAccount[]) => {
  if (Platform.OS === "web") return accounts;

  let migrated = false;
  await Promise.all(
    accounts.map(async (account) => {
      if (account?.id && account.token) {
        await saveAuthToken(account.id, account.token);
        migrated = true;
      }
    }),
  );

  const sanitized = accounts.map(withoutToken);
  if (migrated) {
    await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(sanitized));
  }
  return sanitized;
};

export const loadAccounts = async (): Promise<AuthAccount[]> => {
  const raw = await AsyncStorage.getItem(ACCOUNTS_KEY);
  if (!raw) return [];
  try {
    const accounts = JSON.parse(raw) as AuthAccount[];
    return Array.isArray(accounts) ? sanitizeNativeAccounts(accounts) : [];
  } catch {
    return [];
  }
};

export const saveAccounts = async (accounts: AuthAccount[]) => {
  invalidateAuthCache();
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
    return;
  }

  await Promise.all(
    accounts.map((account) => saveAuthToken(account.id, account.token)),
  );
  await AsyncStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts.map(withoutToken)));
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
  invalidateAuthCache();
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

export const clearSession = async () => {
  invalidateAuthCache();
  try {
    const session = await loadSession();
    await clearAuthToken(session?.accountId);
  } catch {
    // Best effort cleanup; the session record is still removed below.
  }
  await AsyncStorage.removeItem(SESSION_KEY);
};

export { loadAuthToken };

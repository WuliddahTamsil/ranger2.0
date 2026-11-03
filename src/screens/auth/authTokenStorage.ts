import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const TOKEN_KEY_PREFIX = "rangers.auth.token.v1.";

const getTokenKey = (accountId: string) => `${TOKEN_KEY_PREFIX}${accountId}`;

export const saveAuthToken = async (accountId: string, token?: string) => {
  if (!accountId || !token) return;
  const key = getTokenKey(accountId);
  if (Platform.OS === "web") {
    await AsyncStorage.setItem(key, token);
    return;
  }
  await SecureStore.setItemAsync(key, token, {
    keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
};

export const loadAuthToken = async (accountId?: string | null): Promise<string | null> => {
  if (!accountId) return null;
  const key = getTokenKey(accountId);
  if (Platform.OS === "web") return AsyncStorage.getItem(key);
  return SecureStore.getItemAsync(key);
};

export const clearAuthToken = async (accountId?: string | null) => {
  if (!accountId) return;
  const key = getTokenKey(accountId);
  if (Platform.OS === "web") {
    await AsyncStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
};

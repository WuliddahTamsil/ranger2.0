import AsyncStorage from "@react-native-async-storage/async-storage";
import { ORDERS } from "../../constants/mockData";
import { OrderItem } from "../../types";

const STORAGE_KEY = "ranger_customer_orders_v1";

let customerOrders: OrderItem[] = [...ORDERS];
let hydrated = false;
const listeners = new Set<(orders: OrderItem[]) => void>();

const notify = () => {
  const snapshot = [...customerOrders];
  listeners.forEach((listener) => listener(snapshot));
};

export const getCustomerOrders = () => [...customerOrders];

export const subscribeCustomerOrders = (listener: (orders: OrderItem[]) => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const hydrateCustomerOrders = async () => {
  if (hydrated) return getCustomerOrders();

  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as OrderItem[];
      if (Array.isArray(parsed)) customerOrders = parsed;
    }
  } catch {
    // Gunakan data lokal jika storage belum tersedia atau datanya rusak.
  }

  hydrated = true;
  notify();
  return getCustomerOrders();
};

export const addCustomerOrder = (order: OrderItem) => {
  customerOrders = [order, ...customerOrders];
  notify();
  void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(customerOrders));
};

export const getLatestCateringOrder = () =>
  customerOrders.find((order) => order.type.toLowerCase().includes("cater"));

export const getLatestOrderByType = (type: string) =>
  customerOrders.find((order) => order.type.toLowerCase() === type.toLowerCase());

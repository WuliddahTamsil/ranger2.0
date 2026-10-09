import AsyncStorage from "@react-native-async-storage/async-storage";

export interface MarketplaceCartSeed {
  productId: string | number;
  quantity: number;
}

const STORAGE_KEY = "@kanyaah_marketplace_cart";

let pendingMarketplaceCart: MarketplaceCartSeed[] = [];

// Initialize in background from storage
void AsyncStorage.getItem(STORAGE_KEY).then((data) => {
  if (data) {
    try {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && pendingMarketplaceCart.length === 0) {
        pendingMarketplaceCart = parsed.filter((item) => item && item.quantity > 0);
      }
    } catch {
      // Ignore parse error
    }
  }
}).catch(() => undefined);

export const setPendingMarketplaceCart = (items: MarketplaceCartSeed[]) => {
  pendingMarketplaceCart = items.filter((item) => item.quantity > 0);
  if (pendingMarketplaceCart.length > 0) {
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(pendingMarketplaceCart)).catch(() => undefined);
  } else {
    void AsyncStorage.removeItem(STORAGE_KEY).catch(() => undefined);
  }
};

export const consumePendingMarketplaceCart = () => {
  const items = pendingMarketplaceCart;
  pendingMarketplaceCart = [];
  void AsyncStorage.removeItem(STORAGE_KEY).catch(() => undefined);
  return items;
};

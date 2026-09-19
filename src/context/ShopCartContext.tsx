import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ShopProduct, ShopStore } from "../services/shopService";

export interface CartLine {
  product: ShopProduct;
  quantity: number;
  notes?: string;
  substitutionPreference?: "DONT_SUBSTITUTE" | "SAME_CATEGORY" | "CONTACT_ME" | "AUTO_PRICE_LIMIT";
}

export interface ConflictModalState {
  visible: boolean;
  currentStoreName: string;
  newStore: ShopStore | null;
  pendingProduct: ShopProduct | null;
}

interface ShopCartContextType {
  activeStore: ShopStore | null;
  items: CartLine[];
  substitutionPolicy: "DONT_SUBSTITUTE" | "SAME_CATEGORY" | "CONTACT_ME" | "AUTO_PRICE_LIMIT";
  setSubstitutionPolicy: (policy: "DONT_SUBSTITUTE" | "SAME_CATEGORY" | "CONTACT_ME" | "AUTO_PRICE_LIMIT") => void;
  storeNotes: string;
  setStoreNotes: (notes: string) => void;
  addToCart: (product: ShopProduct, store: ShopStore) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, delta: number) => void;
  clearCart: () => void;
  getItemQuantity: (productId: string) => number;
  totalItems: number;
  subtotal: number;
  estimatedDeliveryFee: number;
  serviceFee: number;
  estimatedTotal: number;
  conflictModal: ConflictModalState;
  resolveConflictKeepCurrent: () => void;
  resolveConflictReplaceStore: () => void;
  resolveConflictCancel: () => void;
}

const CART_STORAGE_KEY = "@geoverse_shop_cart_v1";

const ShopCartContext = createContext<ShopCartContextType | undefined>(undefined);

export const ShopCartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeStore, setActiveStore] = useState<ShopStore | null>(null);
  const [items, setItems] = useState<CartLine[]>([]);
  const [substitutionPolicy, setSubstitutionPolicy] = useState<
    "DONT_SUBSTITUTE" | "SAME_CATEGORY" | "CONTACT_ME" | "AUTO_PRICE_LIMIT"
  >("CONTACT_ME");
  const [storeNotes, setStoreNotes] = useState<string>("");

  const [conflictModal, setConflictModal] = useState<ConflictModalState>({
    visible: false,
    currentStoreName: "",
    newStore: null,
    pendingProduct: null,
  });

  // Load cart from storage on mount
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(CART_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.activeStore && Array.isArray(parsed.items)) {
            setActiveStore(parsed.activeStore);
            setItems(parsed.items);
            if (parsed.substitutionPolicy) setSubstitutionPolicy(parsed.substitutionPolicy);
            if (parsed.storeNotes) setStoreNotes(parsed.storeNotes);
          }
        }
      } catch (e) {
        console.warn("Failed to load shop cart", e);
      }
    })();
  }, []);

  // Save cart to storage
  useEffect(() => {
    (async () => {
      try {
        if (activeStore && items.length > 0) {
          await AsyncStorage.setItem(
            CART_STORAGE_KEY,
            JSON.stringify({ activeStore, items, substitutionPolicy, storeNotes })
          );
        } else {
          await AsyncStorage.removeItem(CART_STORAGE_KEY);
        }
      } catch (e) {
        console.warn("Failed to persist shop cart", e);
      }
    })();
  }, [activeStore, items, substitutionPolicy, storeNotes]);

  const addToCart = (product: ShopProduct, store: ShopStore) => {
    // If cart has items from a different store, trigger single-store conflict modal
    if (activeStore && String(activeStore._id) !== String(store._id) && items.length > 0) {
      setConflictModal({
        visible: true,
        currentStoreName: activeStore.name,
        newStore: store,
        pendingProduct: product,
      });
      return;
    }

    if (!activeStore) {
      setActiveStore(store);
    }

    setItems((prev) => {
      const existing = prev.find((item) => String(item.product._id) === String(product._id));
      if (existing) {
        if (existing.quantity >= product.stock) return prev; // Cannot exceed stock
        return prev.map((item) =>
          String(item.product._id) === String(product._id)
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1, substitutionPreference: substitutionPolicy }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setItems((prev) => {
      return prev
        .map((item) => {
          if (String(item.product._id) === String(productId)) {
            const nextQty = item.quantity + delta;
            if (nextQty > item.product.stock) return item; // Cap at max stock
            return { ...item, quantity: nextQty };
          }
          return item;
        })
        .filter((item) => item.quantity > 0);
    });
  };

  const removeFromCart = (productId: string) => {
    setItems((prev) => prev.filter((item) => String(item.product._id) !== String(productId)));
  };

  const clearCart = () => {
    setItems([]);
    setActiveStore(null);
  };

  // Conflict Resolution Handlers
  const resolveConflictKeepCurrent = () => {
    setConflictModal({ visible: false, currentStoreName: "", newStore: null, pendingProduct: null });
  };

  const resolveConflictReplaceStore = () => {
    if (conflictModal.newStore && conflictModal.pendingProduct) {
      setActiveStore(conflictModal.newStore);
      setItems([
        {
          product: conflictModal.pendingProduct,
          quantity: 1,
          substitutionPreference: substitutionPolicy,
        },
      ]);
    }
    setConflictModal({ visible: false, currentStoreName: "", newStore: null, pendingProduct: null });
  };

  const resolveConflictCancel = () => {
    setConflictModal({ visible: false, currentStoreName: "", newStore: null, pendingProduct: null });
  };

  const getItemQuantity = (productId: string) => {
    const it = items.find((i) => String(i.product._id) === String(productId));
    return it ? it.quantity : 0;
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  const subtotal = items.reduce((sum, item) => {
    const price =
      item.product.promoPrice != null && item.product.promoPrice > 0
        ? item.product.promoPrice
        : item.product.price;
    return sum + price * item.quantity;
  }, 0);

  const estimatedDeliveryFee = activeStore?.deliveryFee || 8000;
  const serviceFee = 2000;
  const estimatedTotal = subtotal > 0 ? subtotal + estimatedDeliveryFee + serviceFee : 0;

  // Clear activeStore if items become 0
  useEffect(() => {
    if (items.length === 0 && activeStore) {
      setActiveStore(null);
    }
  }, [items, activeStore]);

  return (
    <ShopCartContext.Provider
      value={{
        activeStore,
        items,
        substitutionPolicy,
        setSubstitutionPolicy,
        storeNotes,
        setStoreNotes,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getItemQuantity,
        totalItems,
        subtotal,
        estimatedDeliveryFee,
        serviceFee,
        estimatedTotal,
        conflictModal,
        resolveConflictKeepCurrent,
        resolveConflictReplaceStore,
        resolveConflictCancel,
      }}
    >
      {children}
    </ShopCartContext.Provider>
  );
};

export const useShopCart = () => {
  const context = useContext(ShopCartContext);
  if (!context) {
    throw new Error("useShopCart must be used within a ShopCartProvider");
  }
  return context;
};

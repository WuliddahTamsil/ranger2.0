import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  Modal,
  TextInput,
  Alert,
  Linking,
  Platform,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import * as Location from "expo-location";
import {
  Home,
  Map,
  ShoppingBag,
  MessageCircle,
  User as UserIcon,
  MapPin,
  Bell,
  Search,
  ChevronRight,
  X,
  Store,
  Coffee,
  Wind,
  Building,
  Building2,
  Star,
  Plus,
  Minus,
  CheckCircle,
  Heart,
  PlayCircle,
  Bike,
  Package,
  Recycle,
  Leaf,
  WalletCards,
  ArrowUpRight,
  Sparkles,
  HeartPulse,
  Ticket,
  ArrowUp,
  ArrowRight,
  MoreHorizontal,
  Percent,
  Compass,
  HelpCircle,
  FileText,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
} from "lucide-react-native";
import { useRecycle } from "../../context/RecycleContext";
import { useGeoversePoint } from "../../features/geoversePoint";
import { fetchCustomerRides } from "../../services/rideService";
import { rp } from "../../utils/formatters";
import { RESTAURANTS, LAUNDRIES, KOS_LIST } from "../../constants/mockData";
import { Nav, OrderItem } from "../../types";
import { AuthAccount } from "../auth/authTypes";
import { getPrimaryCustomerAddress } from "../../services/customerAddressService";
import { PlaceSuggestion, searchPlacesSmart } from "../../utils/geocoding";

// Import other customer screens
import { Jelajah } from "./Jelajah";
import { Pesanan } from "./Pesanan";
import { Inbox, CustomerNotification, CustomerChatThread } from "./Inbox";
import { Profile } from "./Profile";
import { hydrateCustomerChatThreads, subscribeCustomerChatThreads } from "./customerInboxStore";
import { getMarketplaceProducts, getMarketplaceOrdersForCustomer, getCateringOrdersForCustomer, getNotifications, markNotificationRead, getCustomerReviews } from "../../services/api";
import { subscribeToUserRealtime } from "../../services/userRealtime";
import { setPendingMarketplaceCart } from "./marketplaceCartStore";

interface CartItem {
  id: number | string;
  name: string;
  price: number;
  qty: number;
  store: string;
  img: string;
  ownerId?: string;
  serviceType?: "marketplace" | "catering";
}

interface SearchCoordinates {
  latitude: number;
  longitude: number;
}

type NearbyPlace = PlaceSuggestion & {
  distanceKm: number;
};

const calculateDistanceKm = (from: SearchCoordinates, to: SearchCoordinates) => {
  const earthRadiusKm = 6371;
  const latitudeDelta = ((to.latitude - from.latitude) * Math.PI) / 180;
  const longitudeDelta = ((to.longitude - from.longitude) * Math.PI) / 180;
  const latitude1 = (from.latitude * Math.PI) / 180;
  const latitude2 = (to.latitude * Math.PI) / 180;
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.sin(longitudeDelta / 2) ** 2 * Math.cos(latitude1) * Math.cos(latitude2);

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
};

interface CustomerHomeProps extends Nav {
  authAccount?: AuthAccount | null;
  onUpdateAccount?: (account: AuthAccount) => Promise<void>;
}

export const Beranda: React.FC<CustomerHomeProps> = ({ navigate, authAccount, onUpdateAccount }) => {
  const [currentTab, setCurrentTab] = useState<number>(0);
  const { wallet: recycleWallet } = useRecycle();
  const {
    wallet: pointWallet,
    walletLoading: pointWalletLoading,
    walletError: pointWalletError,
    refreshWallet: refreshPointWallet,
    formatPoint,
    formatRupiah,
  } = useGeoversePoint();
  const wallet = pointWallet || recycleWallet;
  const recyclePoints = wallet?.balancePoint || 0;
  const recycleTotalKg = wallet?.totalKgDeposited || 0;

  // Super-App Home UI states
  const [refreshing, setRefreshing] = useState(false);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchFilterText, setSearchFilterText] = useState("");
  const [searchPlaces, setSearchPlaces] = useState<NearbyPlace[]>([]);
  const [searchPlacesLoading, setSearchPlacesLoading] = useState(false);
  const [searchPlacesError, setSearchPlacesError] = useState("");
  const [searchCoordinates, setSearchCoordinates] = useState<SearchCoordinates | null>(null);
  const searchDebounceRef = useRef<Parameters<typeof clearTimeout>[0] | undefined>(undefined);
  const searchRequestRef = useRef(0);
  const [piknikModalVisible, setPiknikModalVisible] = useState(false);
  const [launcherExpanded, setLauncherExpanded] = useState(false);
  const [helpModalVisible, setHelpModalVisible] = useState(false);

  const handlePullRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.allSettled([
        refreshPointWallet(),
        new Promise<void>((resolve) => {
          setProductsReloadKey((k) => k + 1);
          setOrdersReloadKey((k) => k + 1);
          resolve();
        }),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  const getTimeGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 4 && hour < 11) return "Selamat pagi";
    if (hour >= 11 && hour < 15) return "Selamat siang";
    if (hour >= 15 && hour < 18) return "Selamat sore";
    return "Selamat malam";
  };

  // Global customer profile states
  const [customerName, setCustomerName] = useState(authAccount?.name || "");
  const [customerPhone, setCustomerPhone] = useState(authAccount?.phone || "");
  const [customerAddress, setCustomerAddress] = useState(authAccount?.address || "");
  const [customerLocation, setCustomerLocation] = useState(authAccount?.address || "");
  const [customerProfilePhoto, setCustomerProfilePhoto] = useState(authAccount?.profilePhoto || "");
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const ordersRef = useRef<OrderItem[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersLoadError, setOrdersLoadError] = useState("");
  const [ordersReloadKey, setOrdersReloadKey] = useState(0);
  const ordersAccountIdRef = useRef<string | null>(null);

  useEffect(() => {
    ordersRef.current = orders;
  }, [orders]);

  useEffect(() => {
    if (!authAccount) return;
    const primaryAddress = getPrimaryCustomerAddress(authAccount);
    setCustomerName(authAccount.name);
    setCustomerPhone(authAccount.phone);
    setCustomerAddress(primaryAddress?.fullAddress || authAccount.address);
    setCustomerLocation(primaryAddress?.fullAddress || authAccount.address);
    setCustomerProfilePhoto(authAccount.profilePhoto || "");
  }, [authAccount]);
  const getSearchCoordinates = async (): Promise<SearchCoordinates | null> => {
    if (searchCoordinates) return searchCoordinates;

    try {
      if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.geolocation) {
        const position = await new Promise<{ coords: { latitude: number; longitude: number } }>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 12000,
            maximumAge: 60000,
          });
        });
        const coordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        setSearchCoordinates(coordinates);
        return coordinates;
      }

      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== Location.PermissionStatus.GRANTED) return null;

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coordinates = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setSearchCoordinates(coordinates);
      return coordinates;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    const query = searchFilterText.trim();
    clearTimeout(searchDebounceRef.current);

    if (!searchModalVisible || query.length < 2) {
      setSearchPlaces([]);
      setSearchPlacesError("");
      setSearchPlacesLoading(false);
      return;
    }

    const requestId = ++searchRequestRef.current;
    searchDebounceRef.current = setTimeout(() => {
      void (async () => {
        setSearchPlacesLoading(true);
        setSearchPlacesError("");

        try {
          const coordinates = await getSearchCoordinates();
          const places = await searchPlacesSmart(query, {
            lat: coordinates?.latitude,
            lon: coordinates?.longitude,
            limit: 12,
          });

          if (requestId !== searchRequestRef.current) return;

          const nearbyPlaces = places
            .map((place) => ({
              ...place,
              distanceKm: coordinates
                ? calculateDistanceKm(coordinates, {
                    latitude: place.latitude,
                    longitude: place.longitude,
                  })
                : Number.POSITIVE_INFINITY,
            }))
            .sort((first, second) => first.distanceKm - second.distanceKm)
            .slice(0, 8);

          setSearchPlaces(nearbyPlaces);
          if (nearbyPlaces.length === 0) {
            setSearchPlacesError(`Tidak ada tempat yang cocok dengan "${query}" di sekitar lokasi kamu.`);
          } else if (!coordinates) {
            setSearchPlacesError("Izin lokasi belum aktif. Hasil ditampilkan berdasarkan pencarian umum.");
          }
        } catch {
          if (requestId === searchRequestRef.current) {
            setSearchPlaces([]);
            setSearchPlacesError("Pencarian lokasi gagal. Periksa koneksi internet lalu coba lagi.");
          }
        } finally {
          if (requestId === searchRequestRef.current) setSearchPlacesLoading(false);
        }
      })();
    }, 450);

    return () => {
      clearTimeout(searchDebounceRef.current);
    };
  }, [searchFilterText, searchModalVisible]);

  const openNearbyPlace = async (place: NearbyPlace) => {
    const query = `${place.name}, ${place.latitude},${place.longitude}`;
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    try {
      await Linking.openURL(mapsUrl);
    } catch {
      Alert.alert("Maps tidak tersedia", "Tidak dapat membuka lokasi ini di aplikasi peta.");
    }
  };

  // Global Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartModalVisible, setCartModalVisible] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsLoadError, setProductsLoadError] = useState(false);
  const [productsReloadKey, setProductsReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setProductsLoading(true);
    setProductsLoadError(false);
    getMarketplaceProducts().then((marketplace) => {
      if (!active) return;
      if (!marketplace.success) {
        setProducts([]);
        setProductsLoadError(true);
        setProductsLoading(false);
        return;
      }
      const marketplaceProducts = (marketplace.data || []).map((product: any) => ({
        id: product._id,
        name: product.name,
        store: product.ownerId?.roleData?.businessName || product.ownerId?.name || "GEOVERSE Marketplace",
        price: product.price,
        rating: product.rating || 0,
        sold: product.sold || 0,
        img: product.img,
        images: product.images || [product.img],
        description: product.description,
        stock: product.stock,
        totalReviews: product.totalReviews,
        reviews: product.reviews,
        storeAddress: product.ownerId?.roleData?.address || product.ownerId?.address,
        liked: false,
        cat: product.cat,
        ownerId: product.ownerId?._id || product.ownerId,
        serviceType: "marketplace",
      }));
      setProducts(marketplaceProducts);
      setProductsLoading(false);
    }).catch(() => {
      if (!active) return;
      setProducts([]);
      setProductsLoadError(true);
      setProductsLoading(false);
    });
    return () => { active = false; };
  }, [productsReloadKey]);

  useEffect(() => {
    if (!authAccount?.id) {
      ordersAccountIdRef.current = null;
      ordersRef.current = [];
      setOrders([]);
      setOrdersLoading(false);
      setOrdersLoadError("");
      return;
    }
    if (ordersAccountIdRef.current !== authAccount.id) {
      ordersAccountIdRef.current = authAccount.id;
      ordersRef.current = [];
      setOrders([]);
    }
    setOrdersLoading(true);
    setOrdersLoadError("");
    let activeOrderLoader = true;
    let loading = false;
    let firstRequest = true;
    const loadBackendOrders = async () => {
      if (loading) return;
      loading = true;
      try {
        const [marketplaceResult, cateringResult, rideResult] = await Promise.all([
          getMarketplaceOrdersForCustomer(authAccount.id),
          getCateringOrdersForCustomer(authAccount.id),
          fetchCustomerRides(authAccount.id),
        ]);
        if (!activeOrderLoader) return;
        const marketplaceLoadFailed = !marketplaceResult.success || !Array.isArray(marketplaceResult.data);
        const cateringLoadFailed = !cateringResult.success || !Array.isArray(cateringResult.data);
        // Marketplace status/proof must keep refreshing even if the separate Catering endpoint is unavailable.
        setOrdersLoadError(
          marketplaceLoadFailed
            ? marketplaceResult.message || "Pesanan Marketplace belum berhasil diperbarui. Periksa koneksi lalu coba lagi."
            : ""
        );
        if (cateringLoadFailed) {
          console.warn("Customer Catering orders could not be refreshed:", cateringResult.message || "request failed");
        }
        const marketplaceOrders: OrderItem[] | null = marketplaceResult.success && Array.isArray(marketplaceResult.data) ? marketplaceResult.data.map((order: any) => ({
        id: order._id,
        type: "Marketplace",
        iconName: "Store",
        color: "#1B7A4E",
        item: order.items?.[0]?.name || "Pesanan Marketplace",
        detail: `${order.items?.length || 0} produk`,
        status: order.status,
        statusColor: "orange",
        date: new Date(order.createdAt).toLocaleDateString("id-ID"),
        total: order.totalAmount,
        deliveryFee: order.deliveryFee,
        serviceFee: order.serviceFee,
        discount: order.discount,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        paymentBankName: order.paymentBankName,
        paymentAccountNumber: order.paymentAccountNumber,
        paymentAccountHolder: order.paymentAccountHolder,
        paymentQrisImageUrl: order.paymentQrisImageUrl,
        paymentReminder: order.paymentReminder,
        items: order.items,
        notes: order.notes,
        address: order.address,
        addressSnapshot: order.addressSnapshot,
        createdAt: order.createdAt,
        customerPhone: order.customerPhone,
        driverId: order.driverId,
        driverName: order.driverName,
        driverVehicle: order.driverVehicle || "",
        driverPlate: order.driverPlateNumber || "",
        deliveryProofUrl: order.deliveryProofUrl || "",
        storeName: order.storeName || "Mitra Toko Marketplace",
        storeAddress: order.storeAddress || "",
      })) : null;
        const cateringOrders: OrderItem[] | null = cateringResult.success && Array.isArray(cateringResult.data) ? cateringResult.data.map((order: any) => ({
        id: order._id,
        type: "Catering",
        iconName: "Coffee",
        color: "#EA580C",
        item: order.menuName,
        detail: `${order.storeName || "Dapur Catering"} • ${order.portions} porsi`,
        status: order.status,
        statusColor: "orange",
        date: new Date(order.createdAt).toLocaleDateString("id-ID"),
        total: order.totalAmount,
        deliveryFee: order.deliveryFee,
        serviceFee: order.serviceFee,
        discount: order.discount,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        paymentOption: order.paymentOption,
        paidAmount: order.paidAmount,
        remainingAmount: order.remainingAmount,
        paymentBankName: order.paymentBankName,
        paymentAccountNumber: order.paymentAccountNumber,
        paymentAccountHolder: order.paymentAccountHolder,
        paymentQrisImageUrl: order.paymentQrisImageUrl,
        paymentHistory: order.paymentHistory || [],
        paymentReminder: order.paymentReminder,
        paymentDueDate: order.paymentDueAt,
        cateringDate: order.cateringDate,
        cateringTime: order.cateringTime,
        cateringPortions: order.portions,
        notes: order.notes,
        address: order.address,
        addressSnapshot: order.addressSnapshot,
        createdAt: order.createdAt,
        customerPhone: order.customerPhone,
        driverId: order.driverId,
        driverName: order.driverName,
        driverPhone: order.driverPhone,
        driverVehicle: order.driverVehicle,
        storeName: order.storeName,
        storeAddress: order.storeAddress,
      })) : null;

        const rideOrders: OrderItem[] | null = rideResult.success && Array.isArray(rideResult.data) ? rideResult.data.map((order: any) => ({
          id: order._id,
          orderCode: order.orderCode || `#RNG-RIDE-${order._id.slice(-8).toUpperCase()}`,
          type: "Kanyaah Ride",
          iconName: "Bike",
          color: "#1B7A4E",
          item: "Kanyaah Ride",
          detail: `${order.pickup?.address || "Penjemputan"} → ${order.destination?.address || "Tujuan"}`,
          status: order.status === "SEARCHING_DRIVER" ? "Mencari Driver"
            : order.status === "DRIVER_ASSIGNED" || order.status === "DRIVER_ON_THE_WAY" ? "Menuju Penjemputan"
            : order.status === "DRIVER_ARRIVED" ? "Driver Sampai"
            : order.status === "TRIP_STARTED" ? "Dalam Perjalanan"
            : order.status === "COMPLETED" ? "Selesai" : "Dibatalkan",
          statusColor: order.status === "COMPLETED" ? "green" : order.status === "CANCELLED" ? "red" : "orange",
          date: new Date(order.createdAt).toLocaleDateString("id-ID"),
          createdAt: order.createdAt || new Date().toISOString(),
          total: order.totalAmount,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          driverId: order.driverId,
          driverName: order.driverName,
          driverPhone: order.driverPhone,
          driverPhoto: order.driverPhoto,
          driverRating: order.driverRating,
          driverVehicle: order.driverVehicle,
          driverPlate: order.driverPlate,
          pickup: order.pickup,
          destination: order.destination,
          customerNote: order.customerNote,
          estimatedDistance: order.estimatedDistance,
          estimatedDuration: order.estimatedDuration,
          estimatedFare: order.estimatedFare,
        })) : null;

        const currentOrders = ordersRef.current;
        const allCustomerOrders = [
          ...(marketplaceOrders ?? currentOrders.filter((order) => order.type === "Marketplace")),
          ...(cateringOrders ?? currentOrders.filter((order) => order.type === "Catering")),
          ...(rideOrders ?? currentOrders.filter((order) => order.type === "Kanyaah Ride")),
        ];

        allCustomerOrders.sort((a, b) => {
          const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return timeB - timeA;
        });

        ordersRef.current = allCustomerOrders;
        setOrders(allCustomerOrders);

        // Dynamically build chat threads for persisted orders.
        const dynamicThreads: CustomerChatThread[] = [];
        allCustomerOrders.forEach((o: any) => {
          if (o.driverName) {
            dynamicThreads.push({
              id: `driver_${o.id}`,
              orderId: o.id,
              participantType: "driver",
              participantName: o.type === "Kanyaah Ride" ? `${o.driverName} (Driver Kanyaah Ride)` : `${o.driverName} (Kurir)`,
              lastMessage: o.type === "Kanyaah Ride" ? `Driver Kanyaah Ride ${o.orderCode || `#${o.id.slice(-5)}`}.` : `Kurir mengantar pesanan #${o.id.slice(-5)}.`,
              updatedAt: "Baru saja",
              unreadCount: 0,
            });
          }
          if (o.type !== "Kanyaah Ride" && o.storeName) {
            dynamicThreads.push({
              id: `merchant_${o.id}`,
              orderId: o.id,
              participantType: "merchant",
              participantName: o.storeName,
              lastMessage: `Status pesanan: ${o.status}.`,
              updatedAt: "Hari ini",
              unreadCount: 0,
            });
          }
        });
        setChatThreads(dynamicThreads);
      } catch {
        if (activeOrderLoader) setOrdersLoadError("Pesanan belum dapat diperbarui. Periksa koneksi lalu coba lagi.");
      } finally {
        loading = false;
        if (activeOrderLoader && firstRequest) {
          firstRequest = false;
          setOrdersLoading(false);
        }
      }
    };
    void loadBackendOrders();
    const interval = setInterval(() => void loadBackendOrders(), 3500);
    return () => {
      activeOrderLoader = false;
      clearInterval(interval);
    };
  }, [authAccount?.id, ordersReloadKey]);

  // Global Notifications State
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);

  useEffect(() => {
    if (!authAccount?.id) return;
    let active = true;
    const fetchLiveNotifs = async () => {
      const res = await getNotifications(authAccount.id);
      if (active && res.success && Array.isArray(res.data)) {
        const mapped: CustomerNotification[] = res.data.map((n: any) => ({
          id: n._id,
          type: n.type === "order_new" || n.type === "order_status" ? "transaksi" : n.type === "payment_confirmed" ? "sistem" : "promo",
          title: n.title,
          msg: n.message,
          time: new Date(n.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
          read: Boolean(n.isRead),
        }));
        setNotifications(mapped);
      }
    };
    void fetchLiveNotifs();
    let unsubscribe: () => void = () => undefined;
    void subscribeToUserRealtime(
      () => void fetchLiveNotifs(),
      (updatedOrder) => {
        const updatedOrderId = String(updatedOrder?._id || updatedOrder?.id || "");
        const updatedStatus = updatedOrder?.status;
        const deliveryProofUrl = updatedOrder?.deliveryProofUrl;
        if (updatedOrderId && typeof updatedStatus === "string") {
          const existingOrder = ordersRef.current.find((order) => String(order.id) === updatedOrderId);
          if (existingOrder) {
            const nextOrders = ordersRef.current.map((order) =>
              String(order.id) === updatedOrderId
                ? {
                    ...order,
                    status: updatedStatus || order.status,
                    ...(typeof deliveryProofUrl === "string"
                      ? { deliveryProofUrl }
                      : {}),
                  }
                : order
            );
            ordersRef.current = nextOrders;
            setOrders(nextOrders);
          }
        }
        // Refresh the full record too, so the detail view receives the server's canonical order data.
        setOrdersReloadKey((key) => key + 1);
      }
    ).then((stop) => {
      if (active) unsubscribe = stop;
      else stop();
    });
    const interval = setInterval(fetchLiveNotifs, 8000);
    return () => {
      active = false;
      clearInterval(interval);
      unsubscribe();
    };
  }, [authAccount?.id]);

  // Global Chat Threads State
  const [chatThreads, setChatThreads] = useState<CustomerChatThread[]>([]);

  useEffect(() => {
    let active = true;
    const unsubscribe = subscribeCustomerChatThreads((nextThreads) => {
      if (active) setChatThreads(nextThreads);
    });
    void hydrateCustomerChatThreads().then((storedThreads) => {
      if (active) setChatThreads(storedThreads);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  // Global Reviews / Ratings State
  const [reviews, setReviews] = useState<any[]>([]);

  useEffect(() => {
    if (!authAccount?.id) return;
    let active = true;
    void getCustomerReviews(authAccount.id).then((result) => {
      if (active && result.success && Array.isArray(result.data)) {
        setReviews(result.data);
      }
    });
    return () => { active = false; };
  }, [authAccount?.id]);

  // Global Wishlist/Liked products State
  const [wishlist, setWishlist] = useState<Array<number | string>>([]);

  // Sub-service Modal states
  const [marketModalVisible, setMarketModalVisible] = useState(false);
  const [cateringModalVisible, setCateringModalVisible] = useState(false);
  const [laundryModalVisible, setLaundryModalVisible] = useState(false);
  const [kosModalVisible, setKosModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [selectedProductImage, setSelectedProductImage] = useState(0);
  const [selectedService, setSelectedService] = useState<any | null>(null);

  const [marketCat, setMarketCat] = useState("Semua");

  const handleAddToCart = (product: any) => {
    if (product.serviceType === "catering") {
      Alert.alert(
        "Pesanan Catering Terjadwal",
        "Pilih menu dan jadwal Catering dari layanan Catering agar detail porsi dan tanggal ikut tercatat.",
        [{ text: "Buka Catering", onPress: () => navigate("c_catering") }, { text: "Tutup", style: "cancel" }]
      );
      return;
    }
    setCart((currentCart) => {
      const existing = currentCart.find((item) => item.id === product.id);
      if (existing) {
        return currentCart.map((item) => (
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        ));
      }
      return [...currentCart, {
        id: product.id,
        name: product.name,
        price: product.price,
        qty: 1,
        store: product.store,
        img: product.img,
        ownerId: product.ownerId,
        serviceType: "marketplace",
      }];
    });
  };

  const openProductDetail = (product: any) => {
    setSelectedProduct(product);
    setSelectedProductImage(0);
  };

  const getProductImages = (product: any) => {
    const images = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
    return images.length > 0 ? images : [product.img];
  };

  const openServiceDetail = (service: any) => {
    setSelectedService(service);
  };

  const handleUpdateQty = (id: number | string, delta: number) => {
    setCart((currentCart) => currentCart
      .map((item) => item.id === id ? { ...item, qty: item.qty + delta } : item)
      .filter((item) => item.qty > 0)
    );
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      Alert.alert("Keranjang Kosong", "Silakan tambahkan produk terlebih dahulu.");
      return;
    }

    if (cart.some((item) => item.serviceType === "catering")) {
      Alert.alert("Pisahkan Jenis Pesanan", "Item Catering harus dipesan lewat layanan Catering agar jadwal dan jumlah porsi dapat diisi.");
      return;
    }

    setPendingMarketplaceCart(cart.map((item) => ({ productId: item.id, quantity: item.qty })));
    setCart([]);
    setCartModalVisible(false);
    navigate("c_marketplace");
  };

  const handleToggleLike = (id: number | string) => {
    if (wishlist.includes(id)) {
      setWishlist(wishlist.filter((wId) => wId !== id));
    } else {
      setWishlist([...wishlist, id]);
    }
  };

  const totalCartCount = cart.reduce((sum, i) => sum + i.qty, 0);
  const totalCartPrice = cart.reduce((sum, i) => sum + i.price * i.qty, 0);

  const getStoreRating = (storeName: string) => {
    const storeProducts = products.filter((p) => p.store === storeName);
    if (storeProducts.length === 0) return "0.0";
    const sum = storeProducts.reduce((acc, p) => acc + p.rating, 0);
    return (sum / storeProducts.length).toFixed(1);
  };

  const filteredMarketProducts =
    marketCat === "Semua" ? products : products.filter((p) => p.cat === marketCat);

  // Nav configuration (GEOVERSE Super-App Style: Beranda, Jelajah, Pesanan, Inbox, Profil)
  const navItems = [
    { label: "Beranda", icon: Home, hasDot: false, badgeCount: 0 },
    { label: "Jelajah", icon: Compass, hasDot: false, badgeCount: 0 },
    {
      label: "Pesanan",
      icon: ShoppingBag,
      hasDot: orders.some((o) => !["COMPLETED", "CANCELLED", "Selesai", "Dibatalkan"].includes(o.status)),
      badgeCount: 0,
    },
    {
      label: "Inbox",
      icon: MessageCircle,
      hasDot: false,
      badgeCount: notifications.filter((n) => !n.read).length,
    },
    { label: "Profil", icon: UserIcon, hasDot: false, badgeCount: 0 },
  ];

  const renderTabContent = () => {
    switch (currentTab) {
      case 0:
        return renderBerandaContent();
      case 1:
        return (
          <Jelajah
            products={products}
            onAddToCart={handleAddToCart}
            onOpenMarketplace={() => navigate("c_marketplace")}
            onOpenCatering={() => navigate("c_catering")}
            onOpenLaundry={() => navigate("c_laundry")}
            onOpenKos={() => navigate("c_kos")}
            onOpenRide={() => navigate("c_ride")}
          />
        );
      case 2:
        return (
          <Pesanan
            orders={orders}
            setOrders={setOrders}
            reviews={reviews}
            setReviews={setReviews}
            authAccount={authAccount}
            ordersLoading={ordersLoading}
            ordersLoadError={ordersLoadError}
            onRetryOrders={() => setOrdersReloadKey((key) => key + 1)}
            onOpenRideTracking={() => navigate("c_ride_tracking")}
            onOpenCateringTracking={() => navigate("c_catering_tracking")}
            onOpenCateringQris={() => navigate("c_catering_qris")}
            navigate={navigate}
          />
        );
      case 3:
        return (
          <Inbox
            notifications={notifications}
            setNotifications={setNotifications}
            chatThreads={chatThreads}
            setChatThreads={setChatThreads}
            setCustomerTab={setCurrentTab}
            authAccount={authAccount}
          />
        );
      case 4:
        return (
          <Profile
            customerName={customerName}
            setCustomerName={setCustomerName}
            customerPhone={customerPhone}
            setCustomerPhone={setCustomerPhone}
            customerAddress={customerAddress}
            setCustomerAddress={setCustomerAddress}
            customerLocation={customerLocation}
            setCustomerLocation={setCustomerLocation}
            orderCount={orders.length}
            wishlistCount={wishlist.length}
            reviewCount={String(reviews.length)}
            authAccount={authAccount}
            profilePhoto={customerProfilePhoto}
            setProfilePhoto={setCustomerProfilePhoto}
            navigate={navigate}
          />
        );
      default:
        return renderBerandaContent();
    }
  };

  // Active orders filter
  const activeOrders = orders.filter(
    (o) => !["COMPLETED", "CANCELLED", "Selesai", "Dibatalkan"].includes(o.status)
  );
  const activeOrder = activeOrders[0];
  const unreadNotifCount = notifications.filter((n) => !n.read).length;

  // Main Beranda layout panel (Clean Gojek-Grade Super-App Design)
  const renderBerandaContent = () => {
    const pointBalance = wallet?.balancePoint ?? 0;
    const rupiahEquivalent = pointBalance;

    return (
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handlePullRefresh}
            colors={["#0D7A53"]}
            tintColor="#0D7A53"
          />
        }
      >
        {/* ============================================================ */}
        {/* 1. GOJEK-STYLE GREEN HEADER */}
        {/* ============================================================ */}
        <View style={styles.gojekHeader}>
          {/* Subtle translucent circles */}
          <View style={styles.headerDecoCircle1} />
          <View style={styles.headerDecoCircle2} />

          {/* Top Search Bar & Profile Button Row */}
          <View style={styles.headerTopRow}>
            <TouchableOpacity
              style={styles.headerSearchBar}
              onPress={() => setSearchModalVisible(true)}
              activeOpacity={0.9}
              accessibilityLabel="Cari kuliner, laundry, belanja, ojek"
            >
              <Search size={18} color="#0D7A53" />
              <Text style={styles.headerSearchPlaceholder} numberOfLines={1}>
                Cari kuliner, mart, laundry, ojek...
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.headerProfileBtn}
              onPress={() => setCurrentTab(4)}
              activeOpacity={0.85}
              accessibilityLabel="Profil Saya"
            >
              {customerProfilePhoto ? (
                <Image source={{ uri: customerProfilePhoto }} style={styles.headerProfileImg} />
              ) : (
                <UserIcon size={20} color="#0D7A53" />
              )}
              {unreadNotifCount > 0 && <View style={styles.headerProfileDot} />}
            </TouchableOpacity>
          </View>

          {/* Hero Headline & Location Pill */}
          <View style={styles.headerHeroArea}>
            <View style={styles.headerEyebrowRow}>
              <View style={styles.headerChip}>
                <Sparkles size={10} color="#DDF4E7" />
                <Text style={styles.headerChipText}>Fresh & Fast</Text>
              </View>
            </View>
            <Text style={styles.headerHeroTitle}>
              Pilihan Tepat{"\n"}buat semua kebutuhan
            </Text>
            <View style={styles.headerTagRow}>
              <View style={styles.headerTagPill}>
                <Text style={styles.headerTagText}>Gratis antar</Text>
              </View>
              <View style={styles.headerTagPill}>
                <Text style={styles.headerTagText}>Siap 24 jam</Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.headerLocationPill}
              onPress={() => navigate("c_addresses")}
              activeOpacity={0.8}
            >
              <MapPin size={11} color="#DDF4E7" />
              <Text style={styles.headerLocationText} numberOfLines={1}>
                {customerLocation || "Jl. Kamojang No. 14, Garut"}
              </Text>
              <ChevronRight size={11} color="#DDF4E7" />
            </TouchableOpacity>
          </View>
        </View>

        {/* ============================================================ */}
        {/* 2. 3 QUICK CATEGORY CARDS (Resto, Bepergian, Kebutuhan) */}
        {/* ============================================================ */}
        <View style={styles.categoryCardsRow}>
          {/* Card 1: Resto Jempolan */}
          <TouchableOpacity
            style={styles.categoryCardItem}
            onPress={() => navigate("c_catering")}
            activeOpacity={0.85}
          >
            <View style={[styles.categoryCardIconBox, { backgroundColor: "#FEE2E2" }]}>
              <Coffee size={18} color="#DC2626" />
            </View>
            <View style={styles.categoryCardTextCol}>
              <Text style={styles.categoryCardTitle} numberOfLines={1}>Resto Jempolan</Text>
              <Text style={styles.categoryCardSub} numberOfLines={1}>Kuliner lezat</Text>
            </View>
          </TouchableOpacity>

          {/* Card 2: Mudah Bepergian */}
          <TouchableOpacity
            style={styles.categoryCardItem}
            onPress={() => navigate("c_ride")}
            activeOpacity={0.85}
          >
            <View style={[styles.categoryCardIconBox, { backgroundColor: "#DCFCE7" }]}>
              <Bike size={18} color="#15803D" />
            </View>
            <View style={styles.categoryCardTextCol}>
              <Text style={styles.categoryCardTitle} numberOfLines={1}>Mudah Bepergian</Text>
              <Text style={styles.categoryCardSub} numberOfLines={1}>Ojek & kurir</Text>
            </View>
          </TouchableOpacity>

          {/* Card 3: Kebutuhan Harian */}
          <TouchableOpacity
            style={styles.categoryCardItem}
            onPress={() => navigate("c_shop_home")}
            activeOpacity={0.85}
          >
            <View style={[styles.categoryCardIconBox, { backgroundColor: "#FEF3C7" }]}>
              <ShoppingBag size={18} color="#D97706" />
            </View>
            <View style={styles.categoryCardTextCol}>
              <Text style={styles.categoryCardTitle} numberOfLines={1}>Kebutuhan Harian</Text>
              <Text style={styles.categoryCardSub} numberOfLines={1}>Grocery segar</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ============================================================ */}
        {/* 3. GOPAY / GEOVERSE POINT FLOATING WALLET CARD */}
        {/* ============================================================ */}
        <View style={styles.walletBarCard}>
          {/* Left: Balance Info */}
          <TouchableOpacity
            style={styles.walletBarLeft}
            onPress={() => navigate("c_point_home")}
            activeOpacity={0.8}
          >
            <View style={styles.walletBarIconBox}>
              <WalletCards size={18} color="#0D7A53" />
            </View>
            <View style={styles.walletBarTextCol}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <Text style={styles.walletBarBalance}>
                  {pointBalance.toLocaleString("id-ID")} Pts
                </Text>
                <View style={styles.walletPlusCircle}>
                  <Plus size={10} color="#0D7A53" />
                </View>
              </View>
              <Text style={styles.walletBarSub}>
                ≈ Rp{rupiahEquivalent.toLocaleString("id-ID")} · Buka Dompet
              </Text>
            </View>
          </TouchableOpacity>

          {/* Right: 3 Clean Action Buttons */}
          <View style={styles.walletBarActionsRow}>
            <TouchableOpacity
              style={styles.walletActionBtn}
              onPress={() => navigate("c_recycle_home")}
              activeOpacity={0.75}
            >
              <View style={styles.walletActionCircle}>
                <ArrowUp size={15} color="#0D7A53" />
              </View>
              <Text style={styles.walletActionLabel}>Setor</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.walletActionBtn}
              onPress={() => navigate("c_point_vouchers")}
              activeOpacity={0.75}
            >
              <View style={styles.walletActionCircle}>
                <Ticket size={15} color="#0D7A53" />
              </View>
              <Text style={styles.walletActionLabel}>Voucher</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.walletActionBtn}
              onPress={() => navigate("c_point_ledger")}
              activeOpacity={0.75}
            >
              <View style={styles.walletActionCircle}>
                <FileText size={15} color="#0D7A53" />
              </View>
              <Text style={styles.walletActionLabel}>Riwayat</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ============================================================ */}
        {/* 4. MAIN SERVICES LAUNCHER (Borderless, Gojek Style) */}
        {/* ============================================================ */}
        <View style={styles.launcherSection}>
          {/* Row 1: Ride, Send, Catering, Shop */}
          <View style={styles.launcherRow}>
            {/* 1. GoRide / Kanyaah Ride */}
            <TouchableOpacity
              style={styles.launcherItem}
              onPress={() => navigate("c_ride")}
              activeOpacity={0.75}
            >
              <View style={[styles.launcherSquircle, { backgroundColor: "#DCFCE7" }]}>
                <View style={styles.launcherBadge}>
                  <Text style={styles.launcherBadgeText}>1RB!</Text>
                </View>
                <Bike size={24} color="#15803D" />
              </View>
              <Text style={styles.launcherLabel} numberOfLines={1}>Kanyaah Ride</Text>
            </TouchableOpacity>

            {/* 2. GoSend / Kanyaah Send */}
            <TouchableOpacity
              style={styles.launcherItem}
              onPress={() => navigate("c_send")}
              activeOpacity={0.75}
            >
              <View style={[styles.launcherSquircle, { backgroundColor: "#FEF3C7" }]}>
                <View style={styles.launcherBadge}>
                  <Text style={styles.launcherBadgeText}>5RB!</Text>
                </View>
                <Package size={24} color="#D97706" />
              </View>
              <Text style={styles.launcherLabel} numberOfLines={1}>Kanyaah Send</Text>
            </TouchableOpacity>

            {/* 3. GoFood / Kanyaah Catering */}
            <TouchableOpacity
              style={styles.launcherItem}
              onPress={() => navigate("c_catering")}
              activeOpacity={0.75}
            >
              <View style={[styles.launcherSquircle, { backgroundColor: "#FEE2E2" }]}>
                <View style={styles.launcherBadge}>
                  <Text style={styles.launcherBadgeText}>-75%</Text>
                </View>
                <Coffee size={24} color="#DC2626" />
              </View>
              <Text style={styles.launcherLabel} numberOfLines={1}>Katering</Text>
            </TouchableOpacity>

            {/* 4. GoMart / Kanyaah Shop */}
            <TouchableOpacity
              style={styles.launcherItem}
              onPress={() => navigate("c_shop_home")}
              activeOpacity={0.75}
            >
              <View style={[styles.launcherSquircle, { backgroundColor: "#FDF2F8" }]}>
                <View style={styles.launcherBadge}>
                  <Text style={styles.launcherBadgeText}>30MIN</Text>
                </View>
                <ShoppingBag size={24} color="#DB2777" />
              </View>
              <Text style={styles.launcherLabel} numberOfLines={1}>Kanyaah Shop</Text>
            </TouchableOpacity>
          </View>

          {/* Row 2: Laundry, Recycle, Point, More */}
          <View style={styles.launcherRow}>
            {/* 5. Laundry */}
            <TouchableOpacity
              style={styles.launcherItem}
              onPress={() => navigate("c_laundry")}
              activeOpacity={0.75}
            >
              <View style={[styles.launcherSquircle, { backgroundColor: "#E0F2FE" }]}>
                <View style={styles.launcherBadge}>
                  <Text style={styles.launcherBadgeText}>BERSIH</Text>
                </View>
                <Wind size={24} color="#0284C7" />
              </View>
              <Text style={styles.launcherLabel} numberOfLines={1}>Laundry</Text>
            </TouchableOpacity>

            {/* 6. Kanyaah Recycle */}
            <TouchableOpacity
              style={styles.launcherItem}
              onPress={() => navigate("c_recycle_home")}
              activeOpacity={0.75}
            >
              <View style={[styles.launcherSquircle, { backgroundColor: "#EAF8F0" }]}>
                <View style={styles.launcherBadge}>
                  <Text style={styles.launcherBadgeText}>POIN!</Text>
                </View>
                <Recycle size={24} color="#0D7A53" />
              </View>
              <Text style={styles.launcherLabel} numberOfLines={1}>Recycle</Text>
            </TouchableOpacity>

            {/* 7. GEOVERSE Point */}
            <TouchableOpacity
              style={styles.launcherItem}
              onPress={() => navigate("c_point_home")}
              activeOpacity={0.75}
            >
              <View style={[styles.launcherSquircle, { backgroundColor: "#FEF9C3" }]}>
                <View style={styles.launcherBadge}>
                  <Text style={styles.launcherBadgeText}>REWARD</Text>
                </View>
                <Sparkles size={24} color="#CA8A04" />
              </View>
              <Text style={styles.launcherLabel} numberOfLines={1}>Point</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.launcherItem}
              onPress={() => setLauncherExpanded((expanded) => !expanded)}
              activeOpacity={0.75}
            >
              <View style={[styles.launcherSquircle, { backgroundColor: "#F1F5F9" }]}>
                <View style={styles.launcherBadge}>
                  <Text style={styles.launcherBadgeText}>LAINNYA</Text>
                </View>
                <MoreHorizontal size={28} color="#475569" />
              </View>
              <Text style={styles.launcherLabel} numberOfLines={1}>
                {launcherExpanded ? "Tutup" : "Lainnya"}
              </Text>
            </TouchableOpacity>
          </View>

          {launcherExpanded && (
            <View style={[styles.launcherRow, styles.launcherExpandedRow]}>
              {/* Additional services revealed by Lainnya */}
              <TouchableOpacity
                style={styles.launcherItem}
                onPress={() => navigate("c_marketplace")}
                activeOpacity={0.75}
              >
                <View style={[styles.launcherSquircle, { backgroundColor: "#E0F2FE" }]}>
                  <View style={styles.launcherBadge}>
                    <Text style={styles.launcherBadgeText}>UMKM</Text>
                  </View>
                  <Store size={24} color="#0284C7" />
                </View>
                <Text style={styles.launcherLabel} numberOfLines={1}>Kanyaah Mart</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.launcherItem}
                onPress={() => navigate("c_kos")}
                activeOpacity={0.75}
              >
                <View style={[styles.launcherSquircle, { backgroundColor: "#F3E8FF" }]}>
                  <View style={styles.launcherBadge}>
                    <Text style={styles.launcherBadgeText}>NYAMAN</Text>
                  </View>
                  <Building2 size={24} color="#9333EA" />
                </View>
                <Text style={styles.launcherLabel} numberOfLines={1}>Kanyaah Homestay</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ============================================================ */}
        {/* 5. GREEN VALUE SUBSCRIPTION STRIP */}
        {/* ============================================================ */}
        <TouchableOpacity
          style={styles.greenValueStrip}
          onPress={() => navigate("c_recycle_home")}
          activeOpacity={0.85}
        >
          <View style={styles.greenValueLeft}>
            <View style={styles.greenValueIconCircle}>
              <Plus size={12} color="#0D7A53" />
            </View>
            <Text style={styles.greenValueText} numberOfLines={1}>
              Diskon s.d. 10rb/transaksi. Kumpulkan GEOVERSE Point!
            </Text>
          </View>
          <ArrowRight size={14} color="#FFFFFF" />
        </TouchableOpacity>

        {/* ============================================================ */}
        {/* 6. ACTIVE ORDER TRACKER (Conditionally rendered) */}
        {/* ============================================================ */}
        {activeOrder && (
          <View style={styles.activeOrderContainer}>
            <View style={styles.activeOrderCard}>
              <View style={styles.activeOrderHeader}>
                <View style={styles.activeOrderTypeRow}>
                  <View style={styles.activeOrderIconBadge}>
                    {activeOrder.type === "Kanyaah Ride" ? (
                      <Bike size={16} color="#0D7A53" />
                    ) : activeOrder.type === "Catering" ? (
                      <Coffee size={16} color="#EA580C" />
                    ) : (
                      <ShoppingBag size={16} color="#0D7A53" />
                    )}
                  </View>
                  <View>
                    <Text style={styles.activeOrderTypeTitle}>
                      {activeOrder.type === "Kanyaah Ride"
                        ? "Kanyaah Ride"
                        : activeOrder.type === "Catering"
                        ? "Katering Dapur"
                        : "Kanyaah Shop"}
                    </Text>
                    <Text style={styles.activeOrderCode}>
                      {activeOrder.orderCode || `#${String(activeOrder.id).slice(-6).toUpperCase()}`}
                    </Text>
                  </View>
                </View>
                <View style={styles.activeOrderStatusBadge}>
                  <Text style={styles.activeOrderStatusText}>
                    {activeOrder.status === "SEARCHING_DRIVER"
                      ? "Mencari Driver"
                      : activeOrder.status === "DRIVER_ASSIGNED" || activeOrder.status === "DRIVER_ON_THE_WAY"
                      ? "Driver Menuju Toko"
                      : activeOrder.status === "TRIP_STARTED"
                      ? "Dalam Perjalanan"
                      : activeOrder.status || "Sedang Diproses"}
                  </Text>
                </View>
              </View>

              <Text style={styles.activeOrderItemText} numberOfLines={1}>
                {activeOrder.item} {activeOrder.detail ? `· ${activeOrder.detail}` : ""}
              </Text>

              {/* Progress bar pill indicator */}
              <View style={styles.activeOrderProgressRow}>
                <View style={[styles.activeOrderProgressSegment, styles.progressActive]} />
                <View style={[styles.activeOrderProgressSegment, styles.progressActive]} />
                <View style={styles.activeOrderProgressSegment} />
              </View>

              <View style={styles.activeOrderFooter}>
                <Text style={styles.activeOrderEstimateText}>
                  {activeOrder.driverName ? `Kurir: ${activeOrder.driverName}` : "Pesanan aktif customer"}
                </Text>
                <TouchableOpacity
                  style={styles.activeOrderCtaBtn}
                  onPress={() => {
                    if (activeOrder.type === "Kanyaah Ride") {
                      navigate("c_ride_tracking");
                    } else if (activeOrder.type === "Catering") {
                      navigate("c_catering_tracking");
                    } else {
                      setCurrentTab(2);
                    }
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.activeOrderCtaText}>Lihat Pesanan</Text>
                  <ChevronRight size={13} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* ============================================================ */}
        {/* 7. PROMO CAROUSEL */}
        {/* ============================================================ */}
        <View style={styles.promoCarouselContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.promoCarouselContent}
            decelerationRate="fast"
            snapToInterval={292}
          >
            {/* Promo Card 1: Kanyaah Shop */}
            <TouchableOpacity
              style={[styles.promoCard, { backgroundColor: "#EAF8F0", borderColor: "#DDF4E7" }]}
              onPress={() => navigate("c_shop_home")}
              activeOpacity={0.85}
            >
              <View style={styles.promoCardTop}>
                <View style={[styles.promoBadgePill, { backgroundColor: "#0D7A53" }]}>
                  <Text style={styles.promoBadgeText}>KANYAAH SHOP</Text>
                </View>
                <ShoppingBag size={18} color="#0D7A53" />
              </View>
              <Text style={styles.promoCardTitle}>Belanja kebutuhan harian lebih mudah</Text>
              <Text style={styles.promoCardDesc} numberOfLines={2}>
                Sayur segar, apotek resmi, buah, dan grocery lokal diantar instan ke rumah.
              </Text>
              <View style={styles.promoCardFooter}>
                <Text style={styles.promoCtaText}>Jelajahi Sekarang</Text>
                <ArrowRight size={13} color="#0D7A53" />
              </View>
            </TouchableOpacity>

            {/* Promo Card 2: GEOVERSE Point & Recycle */}
            <TouchableOpacity
              style={[styles.promoCard, { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" }]}
              onPress={() => navigate("c_recycle_home")}
              activeOpacity={0.85}
            >
              <View style={styles.promoCardTop}>
                <View style={[styles.promoBadgePill, { backgroundColor: "#059669" }]}>
                  <Text style={styles.promoBadgeText}>BANK SAMPAH</Text>
                </View>
                <Recycle size={18} color="#059669" />
              </View>
              <Text style={styles.promoCardTitle}>Kumpulkan Point dari setor sampah</Text>
              <Text style={styles.promoCardDesc} numberOfLines={2}>
                Ubah sampah terpilah jadi reward saldo belanja dan voucher potongan transaksi.
              </Text>
              <View style={styles.promoCardFooter}>
                <Text style={styles.promoCtaText}>Mulai Setor</Text>
                <ArrowRight size={13} color="#0D7A53" />
              </View>
            </TouchableOpacity>

            {/* Promo Card 3: Kanyaah Send */}
            <TouchableOpacity
              style={[styles.promoCard, { backgroundColor: "#FEF3C7", borderColor: "#FDE68A" }]}
              onPress={() => navigate("c_send")}
              activeOpacity={0.85}
            >
              <View style={styles.promoCardTop}>
                <View style={[styles.promoBadgePill, { backgroundColor: "#D97706" }]}>
                  <Text style={styles.promoBadgeText}>KANYAAH SEND</Text>
                </View>
                <Package size={18} color="#D97706" />
              </View>
              <Text style={styles.promoCardTitle}>Kirim barang dengan driver terdekat</Text>
              <Text style={styles.promoCardDesc} numberOfLines={2}>
                Pengiriman dokumen & paket kilat langsung sampai dengan kurir terpercaya.
              </Text>
              <View style={styles.promoCardFooter}>
                <Text style={[styles.promoCtaText, { color: "#B45309" }]}>Kirim Sekarang</Text>
                <ArrowRight size={13} color="#B45309" />
              </View>
            </TouchableOpacity>

            {/* Promo Card 4: Kanyaah Catering */}
            <TouchableOpacity
              style={[styles.promoCard, { backgroundColor: "#FFEDD5", borderColor: "#FED7AA" }]}
              onPress={() => navigate("c_catering")}
              activeOpacity={0.85}
            >
              <View style={styles.promoCardTop}>
                <View style={[styles.promoBadgePill, { backgroundColor: "#EA580C" }]}>
                  <Text style={styles.promoBadgeText}>KANYAAH CATERING</Text>
                </View>
                <Coffee size={18} color="#EA580C" />
              </View>
              <Text style={styles.promoCardTitle}>Dukung UMKM lokal di sekitar kamu</Text>
              <Text style={styles.promoCardDesc} numberOfLines={2}>
                Pilihan prasmanan, nasi box & sajian dapur warga Kamojang untuk keluarga.
              </Text>
              <View style={styles.promoCardFooter}>
                <Text style={[styles.promoCtaText, { color: "#C2410C" }]}>Lihat Menu</Text>
                <ArrowRight size={13} color="#C2410C" />
              </View>
            </TouchableOpacity>
            {/* Promo Card 5: Kanyaah Ride */}
            <TouchableOpacity
              style={[styles.promoCard, { backgroundColor: "#DCFCE7", borderColor: "#BBF7D0" }]}
              onPress={() => navigate("c_ride")}
              activeOpacity={0.85}
            >
              <View style={styles.promoCardTop}>
                <View style={[styles.promoBadgePill, { backgroundColor: "#15803D" }]}>
                  <Text style={styles.promoBadgeText}>KANYAAH RIDE</Text>
                </View>
                <Bike size={18} color="#15803D" />
              </View>
              <Text style={styles.promoCardTitle}>Bepergian lebih mudah dan aman</Text>
              <Text style={styles.promoCardDesc} numberOfLines={2}>
                Pesan ojek terdekat untuk perjalanan cepat dengan driver terpercaya.
              </Text>
              <View style={styles.promoCardFooter}>
                <Text style={[styles.promoCtaText, { color: "#15803D" }]}>Pesan Ride</Text>
                <ArrowRight size={13} color="#15803D" />
              </View>
            </TouchableOpacity>

            {/* Promo Card 6: Kanyaah Laundry */}
            <TouchableOpacity
              style={[styles.promoCard, { backgroundColor: "#E0F2FE", borderColor: "#BAE6FD" }]}
              onPress={() => navigate("c_laundry")}
              activeOpacity={0.85}
            >
              <View style={styles.promoCardTop}>
                <View style={[styles.promoBadgePill, { backgroundColor: "#0284C7" }]}>
                  <Text style={styles.promoBadgeText}>KANYAAH LAUNDRY</Text>
                </View>
                <Wind size={18} color="#0284C7" />
              </View>
              <Text style={styles.promoCardTitle}>Pakaian bersih tanpa repot</Text>
              <Text style={styles.promoCardDesc} numberOfLines={2}>
                Laundry kiloan dan ekspres dari mitra terdekat, siap antar-jemput.
              </Text>
              <View style={styles.promoCardFooter}>
                <Text style={[styles.promoCtaText, { color: "#0284C7" }]}>Cari Laundry</Text>
                <ArrowRight size={13} color="#0284C7" />
              </View>
            </TouchableOpacity>

            {/* Promo Card 7: Kanyaah Homestay */}
            <TouchableOpacity
              style={[styles.promoCard, { backgroundColor: "#F3E8FF", borderColor: "#E9D5FF" }]}
              onPress={() => navigate("c_kos")}
              activeOpacity={0.85}
            >
              <View style={styles.promoCardTop}>
                <View style={[styles.promoBadgePill, { backgroundColor: "#9333EA" }]}>
                  <Text style={styles.promoBadgeText}>KANYAAH HOMESTAY</Text>
                </View>
                <Building2 size={18} color="#9333EA" />
              </View>
              <Text style={styles.promoCardTitle}>Temukan tempat tinggal nyaman</Text>
              <Text style={styles.promoCardDesc} numberOfLines={2}>
                Pilihan homestay dan kos lokal yang nyaman untuk tinggal lebih tenang.
              </Text>
              <View style={styles.promoCardFooter}>
                <Text style={[styles.promoCtaText, { color: "#9333EA" }]}>Lihat Homestay</Text>
                <ArrowRight size={13} color="#9333EA" />
              </View>
            </TouchableOpacity>

            {/* Promo Card 8: GEOVERSE Point */}
            <TouchableOpacity
              style={[styles.promoCard, { backgroundColor: "#FEF9C3", borderColor: "#FDE68A" }]}
              onPress={() => navigate("c_point_home")}
              activeOpacity={0.85}
            >
              <View style={styles.promoCardTop}>
                <View style={[styles.promoBadgePill, { backgroundColor: "#CA8A04" }]}>
                  <Text style={styles.promoBadgeText}>GEOVERSE POINT</Text>
                </View>
                <Sparkles size={18} color="#CA8A04" />
              </View>
              <Text style={styles.promoCardTitle}>Kumpulkan poin, dapatkan reward</Text>
              <Text style={styles.promoCardDesc} numberOfLines={2}>
                Gunakan poin untuk voucher dan potongan transaksi di berbagai layanan.
              </Text>
              <View style={styles.promoCardFooter}>
                <Text style={[styles.promoCtaText, { color: "#A16207" }]}>Lihat Reward</Text>
                <ArrowRight size={13} color="#A16207" />
              </View>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* ============================================================ */}
        {/* 8. REKOMENDASI UNTUKMU */}
        {/* ============================================================ */}
        <View style={styles.recommendationSection}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionMainTitle}>Rekomendasi untukmu</Text>
              <Text style={styles.sectionSubtitle}>Pilihan produk terbaik dari merchant lokal</Text>
            </View>
            <TouchableOpacity onPress={() => setCurrentTab(1)} activeOpacity={0.8}>
              <Text style={styles.seeAllGreenText}>Lihat semua</Text>
            </TouchableOpacity>
          </View>

          {productsLoading ? (
            <Text style={styles.loadingMutedText}>Memuat rekomendasi produk…</Text>
          ) : productsLoadError ? (
            <TouchableOpacity onPress={() => setProductsReloadKey((k) => k + 1)}>
              <Text style={styles.loadingMutedText}>Gagal memuat produk. Ketuk untuk mencoba lagi.</Text>
            </TouchableOpacity>
          ) : products.length === 0 ? (
            <Text style={styles.loadingMutedText}>Belum ada rekomendasi produk yang tersedia.</Text>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recommendationScroll}
            >
              {products.slice(0, 6).map((item: any) => {
                const isLiked = wishlist.includes(item.id);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.recommendationCard}
                    onPress={() => openProductDetail(item)}
                    activeOpacity={0.88}
                  >
                    <Image source={{ uri: item.img }} style={styles.recommendationImg as any} />
                    <TouchableOpacity
                      style={styles.recommendationHeartBtn}
                      onPress={() => handleToggleLike(item.id)}
                    >
                      <Heart
                        size={13}
                        color={isLiked ? "#DC2626" : "#9CA3AF"}
                        fill={isLiked ? "#DC2626" : "none"}
                      />
                    </TouchableOpacity>

                    <View style={styles.recommendationBody}>
                      <Text style={styles.recommendationStoreName} numberOfLines={1}>
                        {item.store}
                      </Text>
                      <Text style={styles.recommendationItemName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <View style={styles.recommendationRatingRow}>
                        <Star size={11} color="#D97706" fill="#D97706" />
                        <Text style={styles.recommendationRatingVal}>{item.rating || "4.8"}</Text>
                        <Text style={styles.recommendationSoldText}>· {item.sold || 0} terjual</Text>
                      </View>
                      <View style={styles.recommendationPriceFooter}>
                        <Text style={styles.recommendationPriceText}>{rp(item.price)}</Text>
                        <TouchableOpacity
                          style={styles.recommendationAddBtn}
                          onPress={() => {
                            handleAddToCart(item);
                            Alert.alert("Sukses", `${item.name} ditambahkan ke keranjang.`);
                          }}
                          activeOpacity={0.8}
                        >
                          <Plus size={13} color="#FFFFFF" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Bottom spacer */}
        <View style={{ height: 36 }} />
      </ScrollView>
    );
  };

  return (
    <ResponsiveSafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.appShell}>
        {/* Active Tab Panel */}
        <View style={styles.tabContainer}>{renderTabContent()}</View>

        {/* ============================================================ */}
        {/* FIXED BOTTOM NAVIGATION BAR (Exact Gojek 5-Menu Polish) */}
        {/* ============================================================ */}
        <View style={styles.bottomNavBar}>
          {navItems.map((item, index) => {
            const active = currentTab === index;
            const IconComp = item.icon;
            return (
              <TouchableOpacity
                key={index}
                style={styles.bottomNavItem}
                onPress={() => setCurrentTab(index)}
                activeOpacity={0.7}
                accessibilityLabel={item.label}
              >
                {active && <View style={styles.bottomNavActiveBar} />}
                <View style={[styles.bottomNavIconContainer, active && styles.bottomNavIconActiveBg]}>
                  <IconComp size={21} color={active ? "#0D7A53" : "#64748B"} />
                  {item.hasDot && !active && <View style={styles.bottomNavRedDot} />}
                  {item.badgeCount > 0 && !active && (
                    <View style={styles.bottomNavCountBadge}>
                      <Text style={styles.bottomNavCountBadgeText}>
                        {item.badgeCount > 99 ? "99+" : item.badgeCount}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.bottomNavLabel, active ? styles.bottomNavLabelActive : null]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* MODAL 1: MARKETPLACE */}
      <Modal visible={marketModalVisible} transparent animationType="slide">
        <View style={styles.modalBgBottom}>
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>GEOVERSE Marketplace</Text>
              <TouchableOpacity onPress={() => setMarketModalVisible(false)}>
                <X size={20} color="#111827" />
              </TouchableOpacity>
            </View>

            {/* Sub Categories scroll */}
            <View style={styles.catScrollBox}>
              {["Semua", "Makanan", "Fashion", "Minuman", "Kesehatan", "Kerajinan"].map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.catPillBtn, marketCat === c && styles.catPillBtnActive]}
                  onPress={() => setMarketCat(c)}
                >
                  <Text style={[styles.catPillText, marketCat === c && styles.catPillTextActive]}>
                    {c}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Products listings scroll */}
            <ScrollView contentContainerStyle={styles.sheetProductList} showsVerticalScrollIndicator={false}>
              <View style={styles.productsGrid}>
                {filteredMarketProducts.map((p: any) => {
                  return (
                    <View key={p.id} style={styles.productCard}>
                      <Image source={{ uri: p.img }} style={styles.productImg as any} />
                      <View style={styles.productCardBody}>
                        <Text style={styles.productStoreName} numberOfLines={1}>{p.store}</Text>
                        <Text style={styles.productItemName} numberOfLines={1}>{p.name}</Text>
                        <View style={styles.productCardFooter}>
                          <Text style={styles.productPriceText}>{rp(p.price)}</Text>
                          <TouchableOpacity 
                            style={styles.addButtonMini}
                            onPress={() => {
                              handleAddToCart(p);
                              Alert.alert("Sukses", `${p.name} ditambahkan ke keranjang.`);
                            }}
                          >
                            <Plus size={12} color="#FFFFFF" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: CATERING */}
      <Modal visible={cateringModalVisible} transparent animationType="slide">
        <View style={styles.modalBgBottom}>
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Rekomendasi Catering</Text>
              <TouchableOpacity onPress={() => setCateringModalVisible(false)}>
                <X size={20} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.sheetList} showsVerticalScrollIndicator={false}>
              {RESTAURANTS.map((res) => (
                <View key={res.id} style={styles.restaurantRowCard}>
                  <Image source={{ uri: res.img }} style={styles.restaurantRowImg as any} />
                  <View style={styles.restaurantRowBody}>
                    <Text style={styles.restaurantRowName}>{res.name}</Text>
                    <Text style={styles.restaurantRowCuisine}>{res.cuisine} · ★ {res.rating}</Text>
                    <Text style={styles.restaurantRowMin}>Min. order {rp(res.minOrder)}</Text>
                    <View style={styles.tagBadgeRow}>
                      {res.tags.map((t, idx) => (
                        <View key={idx} style={styles.tagBadge}>
                          <Text style={styles.tagBadgeText}>{t}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: LAUNDRY */}
      <Modal visible={laundryModalVisible} transparent animationType="slide">
        <View style={styles.modalBgBottom}>
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Laundry Dekat Anda</Text>
              <TouchableOpacity onPress={() => setLaundryModalVisible(false)}>
                <X size={20} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.sheetList} showsVerticalScrollIndicator={false}>
              {LAUNDRIES.map((l) => (
                <View key={l.id} style={styles.restaurantRowCard}>
                  <Image source={{ uri: l.img }} style={styles.restaurantRowImg as any} />
                  <View style={styles.restaurantRowBody}>
                    <Text style={styles.restaurantRowName}>{l.name}</Text>
                    <Text style={styles.restaurantRowCuisine}>{l.address} · ★ {l.rating}</Text>
                    <Text style={styles.restaurantRowMin}>Harga {rp(l.price)}/kg · {l.distance}</Text>
                    <TouchableOpacity 
                      style={styles.orderLaundryBtn}
                      onPress={() => {
                        setLaundryModalVisible(false);
                        Alert.alert("Laundry dipesan", `Simulator pemesanan laundry di ${l.name} sukses.`);
                      }}
                    >
                      <Text style={styles.orderLaundryBtnText}>Pesan Sekarang</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MODAL 4: KOS */}
      <Modal visible={kosModalVisible} transparent animationType="slide">
        <View style={styles.modalBgBottom}>
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Kos Online Kamojang</Text>
              <TouchableOpacity onPress={() => setKosModalVisible(false)}>
                <X size={20} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.sheetList} showsVerticalScrollIndicator={false}>
              {KOS_LIST.map((k) => (
                <View key={k.id} style={styles.restaurantRowCard}>
                  <Image source={{ uri: k.img }} style={styles.restaurantRowImg as any} />
                  <View style={styles.restaurantRowBody}>
                    <Text style={styles.restaurantRowName}>{k.name}</Text>
                    <Text style={styles.restaurantRowCuisine}>{k.address} · Tipe {k.type}</Text>
                    <Text style={styles.restaurantRowMin}>{rp(k.price)}/bulan</Text>
                    <View style={styles.tagBadgeRow}>
                      {k.facilities.slice(0, 3).map((f, idx) => (
                        <View key={idx} style={[styles.tagBadge, { backgroundColor: "#E0F2FE" }]}>
                          <Text style={[styles.tagBadgeText, { color: "#0284C7" }]}>{f}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={Boolean(selectedProduct)} transparent animationType="slide" onRequestClose={() => setSelectedProduct(null)}>
        <View style={styles.modalBgBottom}>
          <View style={styles.detailSheet}>
            {selectedProduct && (() => {
              const images = getProductImages(selectedProduct);
              const cartLine = cart.find((item) => item.id === selectedProduct.id);
              const productReviews = Array.isArray(selectedProduct.reviews) ? selectedProduct.reviews : [];
              return (
                <>
                  <View style={styles.sheetHeader}><Text style={styles.sheetTitle}>Detail Produk</Text><TouchableOpacity onPress={() => setSelectedProduct(null)}><X size={20} color="#111827" /></TouchableOpacity></View>
                  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailScroll}>
                    <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={(event) => setSelectedProductImage(Math.round(event.nativeEvent.contentOffset.x / 320))}>
                      {images.map((image: string, index: number) => <View key={`${image}-${index}`} style={styles.carouselSlide}><Image source={{ uri: image }} style={styles.detailImage} /><Text style={styles.imageCounter}>{index + 1}/{images.length}</Text></View>)}
                    </ScrollView>
                    <View style={styles.dotRow}>{images.map((_: string, index: number) => <View key={index} style={[styles.dot, index === selectedProductImage && styles.dotActive]} />)}</View>
                    <Text style={styles.detailProductName}>{selectedProduct.name}</Text>
                    <Text style={styles.detailPrice}>{rp(selectedProduct.price)}</Text>
                    <View style={styles.detailRatingRow}><Text style={styles.ratingStars}>★ {selectedProduct.rating || 0}</Text><Text style={styles.mutedText}>{selectedProduct.totalReviews || productReviews.length || 0} ulasan</Text><Text style={styles.mutedText}>{selectedProduct.stock ?? "Stok tersedia"}</Text></View>
                    <Text style={styles.detailSectionTitle}>Deskripsi</Text><Text style={styles.detailDescription}>{selectedProduct.description || "Deskripsi produk belum tersedia."}</Text>
                    <View style={styles.storeInfoCard}><Store size={20} color="#1B7A4E" /><View style={{ flex: 1 }}><Text style={styles.storeInfoName}>{selectedProduct.store}</Text><Text style={styles.mutedText}>{selectedProduct.storeAddress || "Lokasi toko belum tersedia"}</Text></View></View>
                    <Text style={styles.detailSectionTitle}>Ulasan Pelanggan</Text>
                    {productReviews.some((review: any) => Array.isArray(review.media) && review.media.length > 0) && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.reviewMediaRow}>{productReviews.flatMap((review: any) => Array.isArray(review.media) ? review.media : []).slice(0, 10).map((media: any, mediaIndex: number) => <TouchableOpacity key={mediaIndex} style={styles.reviewMediaThumb} onPress={() => media.type === "video" && media.url ? void Linking.openURL(media.url) : undefined} activeOpacity={media.type === "video" ? 0.75 : 1}>{media.type === "video" ? <View style={styles.reviewMediaVideo}><PlayCircle size={23} color="#FFFFFF" /><Text style={styles.reviewMediaVideoText}>VIDEO</Text></View> : <Image source={{ uri: media.url }} style={styles.reviewMediaImage} />}</TouchableOpacity>)}</ScrollView>}
                    {productReviews.length > 0 ? productReviews.slice(0, 3).map((review: any, index: number) => <View key={index} style={styles.reviewRow}><Text style={styles.ratingStars}>★ {review.rating || selectedProduct.rating || 0}</Text><Text style={styles.detailDescription}>{review.comment || review.text}</Text></View>) : <Text style={styles.mutedText}>Belum ada ulasan untuk produk ini.</Text>}
                  </ScrollView>
                  <View style={styles.stickyActionRow}>{cartLine && <View style={styles.detailQty}><TouchableOpacity onPress={() => handleUpdateQty(selectedProduct.id, -1)}><Minus size={16} color="#1B7A4E" /></TouchableOpacity><Text style={styles.qtyText}>{cartLine.qty}</Text><TouchableOpacity onPress={() => handleUpdateQty(selectedProduct.id, 1)}><Plus size={16} color="#1B7A4E" /></TouchableOpacity></View>}<TouchableOpacity style={styles.detailAddButton} onPress={() => handleAddToCart(selectedProduct)}><Plus size={17} color="#FFFFFF" /><Text style={styles.checkoutBtnText}>Tambah ke Keranjang</Text></TouchableOpacity></View>
                </>
              );
            })()}
          </View>
        </View>
      </Modal>

      <Modal visible={Boolean(selectedService)} transparent animationType="slide" onRequestClose={() => setSelectedService(null)}>
        <View style={styles.modalBgBottom}>
          <View style={styles.detailSheet}>
            {selectedService && <><View style={styles.sheetHeader}><Text style={styles.sheetTitle}>{selectedService.name}</Text><TouchableOpacity onPress={() => setSelectedService(null)}><X size={20} color="#111827" /></TouchableOpacity></View><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailScroll}><ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>{(selectedService.images.length ? selectedService.images : [products[0]?.img]).filter(Boolean).map((image: string, index: number) => <View key={index} style={styles.carouselSlide}><Image source={{ uri: image }} style={styles.detailImage} /><Text style={styles.imageCounter}>{index + 1}/{selectedService.images.length || 1}</Text></View>)}</ScrollView><Text style={styles.detailProductName}>{selectedService.name}</Text><Text style={styles.detailDescription}>{selectedService.description}</Text><View style={styles.storeInfoCard}><Store size={20} color="#1B7A4E" /><View style={{ flex: 1 }}><Text style={styles.storeInfoName}>{selectedService.provider}</Text><Text style={styles.mutedText}>{selectedService.price}</Text></View></View><View style={styles.detailRatingRow}><Text style={styles.ratingStars}>★ {selectedService.rating}</Text><Text style={styles.mutedText}>Layanan GEOVERSE</Text></View><Text style={styles.detailSectionTitle}>Ulasan Pengguna</Text><Text style={styles.mutedText}>Ulasan akan tampil setelah customer menyelesaikan pesanan.</Text></ScrollView><TouchableOpacity style={styles.detailAddButton} onPress={() => { const action = selectedService.action; setSelectedService(null); action(); }}><Text style={styles.checkoutBtnText}>Lihat Layanan</Text><ChevronRight size={17} color="#FFFFFF" /></TouchableOpacity></>}
          </View>
        </View>
      </Modal>

      {/* MODAL 5: CART DRAWER */}
      <Modal visible={cartModalVisible} transparent animationType="slide">
        <View style={styles.modalBgBottom}>
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Keranjang Belanja</Text>
              <TouchableOpacity onPress={() => setCartModalVisible(false)}>
                <X size={20} color="#111827" />
              </TouchableOpacity>
            </View>

            {cart.length === 0 ? (
              <View style={styles.emptyCartBox}>
                <ShoppingBag size={38} color="#9CA3AF" />
                <Text style={styles.emptyCartTitle}>Keranjang Anda kosong</Text>
                <Text style={styles.emptyCartSub}>Pilih produk terpopuler di beranda untuk mulai berbelanja.</Text>
              </View>
            ) : (
              <View style={styles.cartBoxContent}>
                <ScrollView style={styles.cartItemsScroll} showsVerticalScrollIndicator={false}>
                  {cart.map((item) => (
                    <View key={item.id} style={styles.cartItemRow}>
                      <Image source={{ uri: item.img }} style={styles.cartItemImg as any} />
                      <View style={styles.cartItemBody}>
                        <Text style={styles.cartItemName} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.cartItemStore} numberOfLines={1}>{item.store}</Text>
                        <Text style={styles.cartItemPrice}>{rp(item.price)}</Text>
                      </View>
                      <View style={styles.qtyControlRow}>
                        <TouchableOpacity 
                          style={styles.qtyBtn} 
                          onPress={() => handleUpdateQty(item.id, -1)}
                        >
                          <Minus size={12} color="#1B7A4E" />
                        </TouchableOpacity>
                        <Text style={styles.qtyText}>{item.qty}</Text>
                        <TouchableOpacity 
                          style={styles.qtyBtn} 
                          onPress={() => handleUpdateQty(item.id, 1)}
                        >
                          <Plus size={12} color="#1B7A4E" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </ScrollView>

                <View style={styles.cartFooterPanel}>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Subtotal produk</Text>
                    <Text style={styles.totalValText}>{rp(totalCartPrice)}</Text>
                  </View>

                  <TouchableOpacity 
                    style={styles.checkoutBtn}
                    onPress={handleCheckout}
                  >
                    <CheckCircle size={16} color="#FFFFFF" />
                    <Text style={styles.checkoutBtnText}>Lanjutkan di Marketplace</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL 6: SEARCH & SUGGESTIONS OVERLAY */}
      {/* ============================================================ */}
      <Modal visible={searchModalVisible} transparent animationType="slide" onRequestClose={() => setSearchModalVisible(false)}>
        <View style={styles.modalBgBottom}>
          <View style={styles.searchSheetContainer}>
            <View style={styles.searchSheetHeader}>
              <View style={styles.searchModalInputRow}>
                <Search size={18} color="#0D7A53" />
                <TextInput
                  style={styles.searchModalTextInput}
                  placeholder="Cari MCD, tempat, produk, toko..."
                  placeholderTextColor="#9CA3AF"
                  value={searchFilterText}
                  onChangeText={setSearchFilterText}
                  autoFocus
                />
                {searchFilterText.length > 0 && (
                  <TouchableOpacity onPress={() => setSearchFilterText("")} activeOpacity={0.7}>
                    <X size={16} color="#6B7280" />
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                style={styles.searchCloseBtn}
                onPress={() => setSearchModalVisible(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.searchCloseBtnText}>Batal</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.searchSheetScroll}>
              {/* Quick Services Suggestions */}
              <Text style={styles.searchSectionLabel}>Pintasan Layanan</Text>
              <View style={styles.searchShortcutGrid}>
                {[
                  { label: "Kanyaah Shop", icon: ShoppingBag, color: "#DB2777", bg: "#FDF2F8", route: "c_shop_home" },
                  { label: "Kanyaah Catering", icon: Coffee, color: "#EA580C", bg: "#FFEDD5", route: "c_catering" },
                  { label: "Kanyaah Laundry", icon: Wind, color: "#16A34A", bg: "#F0FDF4", route: "c_laundry" },
                  { label: "Kos Kamojang", icon: Building, color: "#9333EA", bg: "#F3E8FF", route: "c_kos" },
                  { label: "Kanyaah Ride", icon: Bike, color: "#0D7A53", bg: "#EAF8F0", route: "c_ride" },
                  { label: "Kanyaah Send", icon: Package, color: "#D97706", bg: "#FEF3C7", route: "c_send" },
                  { label: "Bank Sampah", icon: Recycle, color: "#0D7A53", bg: "#DCFCE7", route: "c_recycle_home" },
                  { label: "GEOVERSE Point", icon: Sparkles, color: "#CA8A04", bg: "#FEF9C3", route: "c_point_home" },
                ].map((s) => {
                  const Icon = s.icon;
                  return (
                    <TouchableOpacity
                      key={s.label}
                      style={styles.searchShortcutCard}
                      onPress={() => {
                        setSearchModalVisible(false);
                        navigate(s.route as any);
                      }}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.searchShortcutIconBox, { backgroundColor: s.bg }]}>
                        <Icon size={18} color={s.color} />
                      </View>
                      <Text style={styles.searchShortcutText} numberOfLines={1}>
                        {s.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Recent Search Keywords */}
              <Text style={styles.searchSectionLabel}>Pencarian Populer</Text>
              <View style={styles.searchRecentWrap}>
                {["Sayur Sop Segar", "Nasi Box Kamojang", "Laundry Kiloan", "Kirim Dokumen", "Tukar Poin", "Kos PGE Kamojang"].map((kw) => (
                  <TouchableOpacity
                    key={kw}
                    style={styles.searchRecentPill}
                    onPress={() => setSearchFilterText(kw)}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.searchRecentPillText}>{kw}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {searchFilterText.trim().length >= 2 && (
                <View style={styles.searchPlacesSection}>
                  <View style={styles.searchPlacesHeader}>
                    <Text style={styles.searchSectionLabel}>Tempat di sekitar kamu</Text>
                    {searchPlacesLoading && <ActivityIndicator size="small" color="#0D7A53" />}
                  </View>

                  {searchPlacesError ? (
                    <Text style={styles.searchPlacesHint}>{searchPlacesError}</Text>
                  ) : null}

                  {searchPlaces.map((place) => {
                    const distanceLabel = Number.isFinite(place.distanceKm)
                      ? place.distanceKm < 1
                        ? `${Math.max(1, Math.round(place.distanceKm * 1000))} m`
                        : `${place.distanceKm.toFixed(1)} km`
                      : "Jarak tidak tersedia";

                    return (
                      <TouchableOpacity
                        key={place.id}
                        style={styles.searchPlaceRow}
                        onPress={() => void openNearbyPlace(place)}
                        activeOpacity={0.8}
                        accessibilityLabel={`Buka ${place.name} di Maps`}
                      >
                        <View style={styles.searchPlaceIcon}>
                          <MapPin size={17} color="#0D7A53" />
                        </View>
                        <View style={styles.searchPlaceBody}>
                          <Text style={styles.searchPlaceName} numberOfLines={1}>{place.name}</Text>
                          <Text style={styles.searchPlaceAddress} numberOfLines={2}>
                            {place.subtitle || place.formattedAddress}
                          </Text>
                          <Text style={styles.searchPlaceDistance}>{distanceLabel} · Buka di Maps</Text>
                        </View>
                        <ExternalLink size={16} color="#0D7A53" />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {/* Filtered Products if user typed */}
              {searchFilterText.trim().length > 0 && (
                <View style={styles.searchProductsSection}>
                  <Text style={styles.searchSectionLabel}>Hasil Produk ({products.filter((p) => p.name.toLowerCase().includes(searchFilterText.toLowerCase()) || p.store.toLowerCase().includes(searchFilterText.toLowerCase())).length})</Text>
                  {products
                    .filter((p) => p.name.toLowerCase().includes(searchFilterText.toLowerCase()) || p.store.toLowerCase().includes(searchFilterText.toLowerCase()))
                    .slice(0, 6)
                    .map((p) => (
                      <TouchableOpacity
                        key={p.id}
                        style={styles.searchResultRow}
                        onPress={() => {
                          setSearchModalVisible(false);
                          openProductDetail(p);
                        }}
                        activeOpacity={0.8}
                      >
                        <Image source={{ uri: p.img }} style={styles.searchResultImg as any} />
                        <View style={styles.searchResultBody}>
                          <Text style={styles.searchResultName} numberOfLines={1}>{p.name}</Text>
                          <Text style={styles.searchResultStore} numberOfLines={1}>{p.store}</Text>
                          <Text style={styles.searchResultPrice}>{rp(p.price)}</Text>
                        </View>
                        <ChevronRight size={16} color="#9CA3AF" />
                      </TouchableOpacity>
                    ))}
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL 7: KANYAAH PIKNIK (Wisata & Alam Kamojang) */}
      {/* ============================================================ */}
      <Modal visible={piknikModalVisible} transparent animationType="slide" onRequestClose={() => setPiknikModalVisible(false)}>
        <View style={styles.modalBgBottom}>
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Compass size={20} color="#0D7A53" />
                <Text style={styles.sheetTitle}>Kanyaah Piknik Kamojang</Text>
              </View>
              <TouchableOpacity onPress={() => setPiknikModalVisible(false)} activeOpacity={0.7}>
                <X size={20} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.piknikScrollContent} showsVerticalScrollIndicator={false}>
              <View style={styles.piknikHeroBox}>
                <Text style={styles.piknikHeroTitle}>Jelajah Alam & Eco-Tour Geothermal</Text>
                <Text style={styles.piknikHeroSub}>
                  Nikmati udara sejuk pegunungan, pemandian uap belerang alami, dan pemandangan hutan pinus Kamojang bersama pemandu lokal.
                </Text>
              </View>

              <Text style={styles.piknikSectionTitle}>Destinasi Unggulan di Kamojang</Text>
              <View style={styles.piknikSpotList}>
                {[
                  {
                    name: "Kawah Kamojang & Uap Alami",
                    tag: "Geothermal Alami",
                    desc: "Kawah uap tertua di Indonesia dengan sensasi mandi uap belerang hangat untuk kesehatan kulit.",
                  },
                  {
                    name: "Kamojang Ecopark",
                    tag: "Wisata Keluarga",
                    desc: "Hutan pinus asri dengan spot foto estetik, jembatan gantung, flying fox, dan warung kopi lokal.",
                  },
                  {
                    name: "Danau Pangkalan Kamojang",
                    tag: "Danau Alam",
                    desc: "Danau tenang dikelilingi perbukitan hijau, tempat sempurna untuk bersantai dan piknik sore.",
                  },
                  {
                    name: "Camping Ground Pine Hill",
                    tag: "Berkemah & Outbound",
                    desc: "Area berkemah dengan fasilitas lengkap, api unggun, dan pemandangan sunrise Garut.",
                  },
                ].map((spot, idx) => (
                  <View key={idx} style={styles.piknikSpotCard}>
                    <View style={styles.piknikSpotHeader}>
                      <Text style={styles.piknikSpotName}>{spot.name}</Text>
                      <View style={styles.piknikSpotTag}>
                        <Text style={styles.piknikSpotTagText}>{spot.tag}</Text>
                      </View>
                    </View>
                    <Text style={styles.piknikSpotDesc}>{spot.desc}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.piknikActionBox}>
                <TouchableOpacity
                  style={styles.piknikPrimaryCta}
                  onPress={() => {
                    setPiknikModalVisible(false);
                    setCurrentTab(1);
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.piknikPrimaryCtaText}>Buka Jelajah Destinasi</Text>
                  <ArrowRight size={14} color="#FFFFFF" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.piknikSecondaryCta}
                  onPress={() => {
                    Linking.openURL("https://wa.me/6281234567890?text=Halo%20Admin%20GEOVERSE%2C%20saya%20tertarik%20dengan%20paket%20Kanyaah%20Piknik%20Kamojang.");
                  }}
                  activeOpacity={0.85}
                >
                  <MessageCircle size={15} color="#0D7A53" />
                  <Text style={styles.piknikSecondaryCtaText}>Info Wisata via WhatsApp</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ============================================================ */}
      {/* MODAL 8: PUSAT BANTUAN & FAQ */}
      {/* ============================================================ */}
      <Modal visible={helpModalVisible} transparent animationType="slide" onRequestClose={() => setHelpModalVisible(false)}>
        <View style={styles.modalBgBottom}>
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <HelpCircle size={20} color="#0D7A53" />
                <Text style={styles.sheetTitle}>Pusat Bantuan GEOVERSE</Text>
              </View>
              <TouchableOpacity onPress={() => setHelpModalVisible(false)} activeOpacity={0.7}>
                <X size={20} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.helpScrollContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.helpSectionLabel}>Pertanyaan yang Sering Diajukan</Text>

              <View style={styles.faqList}>
                <View style={styles.faqCard}>
                  <Text style={styles.faqQuestion}>Bagaimana cara mengumpulkan GEOVERSE Point?</Text>
                  <Text style={styles.faqAnswer}>
                    Pilah sampah anorganik (plastik, botol, kertas, logam) lalu setorkan ke Bank Sampah resmi mitra GEOVERSE melalui menu Kanyaah Recycle. Setelah ditimbang petugas, Point langsung masuk ke dompetmu.
                  </Text>
                </View>

                <View style={styles.faqCard}>
                  <Text style={styles.faqQuestion}>Untuk apa saldo GEOVERSE Point digunakan?</Text>
                  <Text style={styles.faqAnswer}>
                    1 Pts = Rp1. Poin dapat digunakan langsung untuk potongan pembayaran belanja di Kanyaah Shop, katering, atau ditukar dengan voucher belanja dan saldo tunai.
                  </Text>
                </View>

                <View style={styles.faqCard}>
                  <Text style={styles.faqQuestion}>Bagaimana cara memesan kurir atau ojek?</Text>
                  <Text style={styles.faqAnswer}>
                    Gunakan layanan Kanyaah Ride untuk ojek penumpang dan Kanyaah Send untuk kirim barang kilat. Masukkan lokasi penjemputan dan tujuan di area Kamojang & Garut.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.helpWhatsAppBtn}
                onPress={() => {
                  Linking.openURL("https://wa.me/6281234567890?text=Halo%20Admin%20GEOVERSE%2C%20saya%20butuh%20bantuan%20layanan.");
                }}
                activeOpacity={0.85}
              >
                <MessageCircle size={16} color="#FFFFFF" />
                <Text style={styles.helpWhatsAppBtnText}>Hubungi CS WhatsApp Kamojang</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </ResponsiveSafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#EEF2F6",
    alignItems: "center",
  },
  appShell: {
    width: "100%",
    maxWidth: 480,
    flex: 1,
    backgroundColor: "#FFFFFF",
    position: "relative",
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 4 },
  },
  tabContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 28,
  },

  // 1. GOJEK-STYLE GREEN HEADER
  gojekHeader: {
    backgroundColor: "#0D7A53",
    paddingTop: Platform.OS === "ios" ? 44 : 20,
    paddingBottom: 22,
    paddingHorizontal: 16,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    position: "relative",
    overflow: "hidden",
  },
  headerDecoCircle1: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.06)",
    top: -50,
    right: -40,
  },
  headerDecoCircle2: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255,255,255,0.04)",
    bottom: -30,
    left: -20,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 18,
    zIndex: 2,
  },
  headerSearchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    height: 46,
    paddingHorizontal: 14,
    gap: 10,
    shadowColor: "#0F172A",
    shadowOpacity: 0.10,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  headerSearchPlaceholder: {
    fontSize: 12.5,
    color: "#6B7280",
    fontWeight: "500",
    flex: 1,
  },
  headerProfileBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    shadowColor: "#0F172A",
    shadowOpacity: 0.10,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  headerProfileImg: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  headerProfileDot: {
    position: "absolute",
    top: 2,
    right: 2,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: "#DC2626",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  headerHeroArea: {
    zIndex: 2,
  },
  headerEyebrowRow: {
    marginBottom: 8,
  },
  headerChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  headerChipText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#E8FFF2",
    letterSpacing: 0.2,
  },
  headerHeroTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#FFFFFF",
    lineHeight: 30,
    letterSpacing: -0.5,
  },
  headerTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    marginBottom: 12,
  },
  headerTagPill: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  headerTagText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#F0FFF7",
  },
  headerLocationPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 14,
    alignSelf: "flex-start",
  },
  headerLocationText: {
    fontSize: 10.5,
    color: "#FFFFFF",
    fontWeight: "600",
    maxWidth: 220,
  },

  // 2. 3 CATEGORY CARDS
  categoryCardsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 10,
    marginTop: 12,
    marginBottom: 6,
  },
  categoryCardItem: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  categoryCardIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryCardTextCol: {
    flex: 1,
  },
  categoryCardTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#1E293B",
  },
  categoryCardSub: {
    fontSize: 8.5,
    color: "#6B7280",
    marginTop: 1,
  },

  // 3. GOPAY / GEOVERSE POINT FLOATING WALLET CARD
  walletBarCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  walletBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  walletBarIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#EAF8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  walletBarTextCol: {
    gap: 1,
  },
  walletBarBalance: {
    fontSize: 14,
    fontWeight: "900",
    color: "#142238",
  },
  walletPlusCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#DDF4E7",
    alignItems: "center",
    justifyContent: "center",
  },
  walletBarSub: {
    fontSize: 10,
    color: "#6B7280",
    fontWeight: "500",
  },
  walletBarActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  walletActionBtn: {
    alignItems: "center",
    gap: 4,
  },
  walletActionCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  walletActionLabel: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#1E293B",
  },

  // 4. MAIN 8 SERVICES LAUNCHER
  launcherSection: {
    marginHorizontal: 16,
    gap: 16,
    marginBottom: 16,
  },
  launcherRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  launcherExpandedRow: {
    justifyContent: "flex-start",
    gap: 16,
  },
  launcherItem: {
    width: "22%",
    alignItems: "center",
  },
  launcherSquircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  launcherBadge: {
    position: "absolute",
    top: -5,
    left: -2,
    backgroundColor: "#0F172A",
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    borderRadius: 5,
    zIndex: 2,
  },
  launcherBadgeText: {
    fontSize: 7.5,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  launcherLabel: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#1E293B",
    textAlign: "center",
    marginTop: 6,
    lineHeight: 13,
  },

  // 5. GREEN VALUE SUBSCRIPTION STRIP
  greenValueStrip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0D7A53",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  greenValueLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    paddingRight: 8,
  },
  greenValueIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  greenValueText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // 6. ACTIVE ORDER CARD
  activeOrderContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  activeOrderCard: {
    backgroundColor: "#EAF8F0",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#A7F3D0",
    padding: 14,
    gap: 10,
    elevation: 3,
    shadowColor: "#0D7A53",
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  activeOrderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  activeOrderTypeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  activeOrderIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  activeOrderTypeTitle: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#075B3D",
  },
  activeOrderCode: {
    fontSize: 9.5,
    color: "#0D7A53",
    fontWeight: "600",
  },
  activeOrderStatusBadge: {
    backgroundColor: "#0D7A53",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  activeOrderStatusText: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  activeOrderItemText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#142238",
  },
  activeOrderProgressRow: {
    flexDirection: "row",
    gap: 6,
  },
  activeOrderProgressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#DDF4E7",
  },
  progressActive: {
    backgroundColor: "#0D7A53",
  },
  activeOrderFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 4,
  },
  activeOrderEstimateText: {
    fontSize: 10.5,
    color: "#075B3D",
    fontWeight: "600",
  },
  activeOrderCtaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#0D7A53",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  activeOrderCtaText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },

  // 7. PROMO CAROUSEL
  promoCarouselContainer: {
    marginBottom: 16,
  },
  promoCarouselContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  promoCard: {
    width: 280,
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    justifyContent: "space-between",
    elevation: 2,
    shadowColor: "#142238",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  promoCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  promoBadgePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  promoBadgeText: {
    fontSize: 8.5,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  promoCardTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#142238",
    lineHeight: 17,
  },
  promoCardDesc: {
    fontSize: 10.5,
    color: "#6B7280",
    lineHeight: 14,
    marginTop: 3,
    marginBottom: 8,
  },
  promoCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
  },
  promoCtaText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#0D7A53",
  },

  // 8. REKOMENDASI UNTUKMU
  recommendationSection: {
    marginTop: 6,
    marginBottom: 12,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginHorizontal: 16,
    marginBottom: 12,
  },
  sectionMainTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#142238",
  },
  sectionSubtitle: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  seeAllGreenText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#0D7A53",
  },
  loadingMutedText: {
    fontSize: 11,
    color: "#6B7280",
    marginHorizontal: 16,
    paddingVertical: 12,
  },
  recommendationScroll: {
    paddingHorizontal: 16,
    gap: 12,
    paddingBottom: 6,
  },
  recommendationCard: {
    width: 160,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#142238",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  recommendationImg: {
    width: "100%",
    height: 95,
  },
  recommendationHeartBtn: {
    position: "absolute",
    top: 6,
    right: 6,
    backgroundColor: "#FFFFFF",
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
  },
  recommendationBody: {
    padding: 10,
    gap: 2,
  },
  recommendationStoreName: {
    fontSize: 9.5,
    color: "#6B7280",
    fontWeight: "600",
  },
  recommendationItemName: {
    fontSize: 12,
    fontWeight: "800",
    color: "#142238",
  },
  recommendationRatingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
  },
  recommendationRatingVal: {
    fontSize: 9.5,
    fontWeight: "800",
    color: "#D97706",
  },
  recommendationSoldText: {
    fontSize: 9.5,
    color: "#9CA3AF",
  },
  recommendationPriceFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  recommendationPriceText: {
    fontSize: 12,
    fontWeight: "900",
    color: "#0D7A53",
  },
  recommendationAddBtn: {
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: "#0D7A53",
    alignItems: "center",
    justifyContent: "center",
  },

  // 9. FIXED BOTTOM NAVIGATION BAR
  bottomNavBar: {
    height: 60,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingBottom: Platform.OS === "ios" ? 12 : 2,
  },
  bottomNavItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    height: "100%",
    position: "relative",
  },
  bottomNavActiveBar: {
    position: "absolute",
    top: 0,
    width: 32,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#0D7A53",
  },
  bottomNavIconContainer: {
    width: 40,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  bottomNavIconActiveBg: {
    backgroundColor: "transparent",
  },
  bottomNavRedDot: {
    position: "absolute",
    top: 1,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: "#DC2626",
  },
  bottomNavCountBadge: {
    position: "absolute",
    top: -2,
    right: 3,
    backgroundColor: "#DC2626",
    borderRadius: 6,
    minWidth: 14,
    height: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  bottomNavCountBadgeText: {
    fontSize: 8,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  bottomNavLabel: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "600",
  },
  bottomNavLabelActive: {
    color: "#0D7A53",
    fontWeight: "800",
  },

  // MODAL 6: SEARCH OVERLAY STYLES
  searchSheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    maxHeight: "90%",
    elevation: 20,
    shadowColor: "#142238",
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  searchSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  searchModalInputRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
  },
  searchModalTextInput: {
    flex: 1,
    fontSize: 13,
    color: "#142238",
    paddingVertical: 0,
  },
  searchCloseBtn: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  searchCloseBtnText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0D7A53",
  },
  searchSheetScroll: {
    paddingBottom: 20,
  },
  searchSectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    color: "#142238",
    marginTop: 12,
    marginBottom: 8,
  },
  searchShortcutGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  searchShortcutCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  searchShortcutIconBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  searchShortcutText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#142238",
  },
  searchRecentWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  searchRecentPill: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  searchRecentPillText: {
    fontSize: 11,
    color: "#4B5563",
  },
  searchPlacesSection: {
    marginTop: 14,
  },
  searchPlacesHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  searchPlacesHint: {
    fontSize: 10.5,
    color: "#64748B",
    lineHeight: 15,
    marginBottom: 6,
  },
  searchPlaceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  searchPlaceIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF8F0",
  },
  searchPlaceBody: {
    flex: 1,
    gap: 2,
  },
  searchPlaceName: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#142238",
  },
  searchPlaceAddress: {
    fontSize: 10.5,
    color: "#64748B",
    lineHeight: 14,
  },
  searchPlaceDistance: {
    fontSize: 10,
    fontWeight: "700",
    color: "#0D7A53",
  },
  searchProductsSection: {
    marginTop: 14,
  },
  searchResultRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    gap: 10,
  },
  searchResultImg: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
  },
  searchResultBody: {
    flex: 1,
    gap: 2,
  },
  searchResultName: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#142238",
  },
  searchResultStore: {
    fontSize: 10,
    color: "#6B7280",
  },
  searchResultPrice: {
    fontSize: 11.5,
    fontWeight: "900",
    color: "#0D7A53",
  },

  // MODAL 7: PIKNIK STYLES
  piknikScrollContent: {
    paddingBottom: 20,
  },
  piknikHeroBox: {
    backgroundColor: "#E0F2FE",
    borderRadius: 16,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#BAE6FD",
  },
  piknikHeroTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#0369A1",
    marginBottom: 4,
  },
  piknikHeroSub: {
    fontSize: 11,
    color: "#0C4A6E",
    lineHeight: 16,
  },
  piknikSectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#142238",
    marginBottom: 8,
  },
  piknikSpotList: {
    gap: 8,
    marginBottom: 14,
  },
  piknikSpotCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 10,
    gap: 4,
  },
  piknikSpotHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  piknikSpotName: {
    fontSize: 12,
    fontWeight: "800",
    color: "#142238",
  },
  piknikSpotTag: {
    backgroundColor: "#EAF8F0",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  piknikSpotTagText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#0D7A53",
  },
  piknikSpotDesc: {
    fontSize: 10.5,
    color: "#6B7280",
    lineHeight: 15,
  },
  piknikActionBox: {
    gap: 8,
  },
  piknikPrimaryCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#0D7A53",
    height: 42,
    borderRadius: 12,
  },
  piknikPrimaryCtaText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  piknikSecondaryCta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#EAF8F0",
    height: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  piknikSecondaryCtaText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0D7A53",
  },

  // MODAL 8: HELP STYLES
  helpScrollContent: {
    paddingBottom: 24,
  },
  helpSectionLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: "#142238",
    marginBottom: 10,
  },
  faqList: {
    gap: 10,
    marginBottom: 16,
  },
  faqCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    gap: 4,
  },
  faqQuestion: {
    fontSize: 12,
    fontWeight: "800",
    color: "#142238",
  },
  faqAnswer: {
    fontSize: 11,
    color: "#4B5563",
    lineHeight: 16,
  },
  helpWhatsAppBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0D7A53",
    height: 44,
    borderRadius: 14,
  },
  helpWhatsAppBtnText: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    gap: 12,
  },
  productCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    position: "relative",
    elevation: 4,
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  productImg: {
    width: "100%",
    height: 110,
  },
  productCardBody: {
    padding: 10,
    gap: 2,
  },
  productStoreName: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
  },
  productItemName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1E293B",
  },
  productCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  productPriceText: {
    fontSize: 13,
    fontWeight: "900",
    color: "#0D7A53",
  },
  addButtonMini: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: "#0D7A53",
    alignItems: "center",
    justifyContent: "center",
  },
  detailSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 20,
    maxHeight: "94%",
  },
  detailScroll: { paddingBottom: 16 },
  carouselSlide: { width: 320, height: 220, position: "relative" },
  detailImage: { width: "100%", height: "100%", borderRadius: 18, backgroundColor: "#E2E8F0" },
  imageCounter: { position: "absolute", right: 12, bottom: 12, color: "#FFFFFF", backgroundColor: "rgba(15,23,42,.65)", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, fontSize: 11, fontWeight: "700" },
  dotRow: { flexDirection: "row", justifyContent: "center", gap: 5, marginVertical: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#CBD5E1" },
  dotActive: { width: 18, backgroundColor: "#1B7A4E" },
  detailProductName: { color: "#111827", fontSize: 20, fontWeight: "900", marginTop: 4 },
  detailPrice: { color: "#1B7A4E", fontSize: 18, fontWeight: "900", marginTop: 6 },
  detailRatingRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 10 },
  ratingStars: { color: "#D97706", fontWeight: "800" },
  mutedText: { color: "#64748B", fontSize: 12 },
  detailSectionTitle: { color: "#1E293B", fontSize: 14, fontWeight: "800", marginTop: 12, marginBottom: 6 },
  detailDescription: { color: "#475569", fontSize: 13, lineHeight: 20 },
  storeInfoCard: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "#F0FDF4", borderRadius: 14, padding: 12, marginTop: 14 },
  storeInfoName: { color: "#1E293B", fontSize: 14, fontWeight: "800", marginBottom: 3 },
  reviewRow: { borderBottomWidth: 1, borderBottomColor: "#E2E8F0", paddingVertical: 9 },
  reviewMediaRow: { gap: 7, paddingVertical: 8, paddingRight: 8 },
  reviewMediaThumb: { width: 64, height: 64, borderRadius: 10, overflow: "hidden", backgroundColor: "#E8F5EE" },
  reviewMediaImage: { width: "100%", height: "100%" },
  reviewMediaVideo: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#1B7A4E", gap: 2 },
  reviewMediaVideoText: { color: "#FFFFFF", fontSize: 7, fontWeight: "900", letterSpacing: 0.5 },
  stickyActionRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: "#E2E8F0" },
  detailQty: { flexDirection: "row", alignItems: "center", gap: 14, paddingHorizontal: 12, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: "#BBF7D0" },
  detailAddButton: { flex: 1, minHeight: 46, borderRadius: 14, backgroundColor: "#1B7A4E", alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7 },
  modalBgBottom: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 24,
    maxHeight: "92%",
    elevation: 20,
    shadowColor: "#0F172A",
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -10 },
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingBottom: 14,
    marginBottom: 10,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1E293B",
  },
  catScrollBox: {
    flexDirection: "row",
    paddingVertical: 10,
    gap: 8,
  },
  catPillBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
  },
  catPillBtnActive: {
    backgroundColor: "#1B7A4E",
    borderColor: "#1B7A4E",
  },
  catPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  catPillTextActive: {
    color: "#FFFFFF",
  },
  sheetProductList: {
    maxHeight: 380,
    paddingBottom: 20,
  },
  sheetList: {
    maxHeight: 400,
    gap: 12,
  },
  restaurantRowCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
    padding: 10,
    gap: 12,
    elevation: 3,
    shadowColor: "#0F172A",
    shadowOpacity: 0.03,
    shadowRadius: 4,
  },
  restaurantRowImg: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  restaurantRowBody: {
    flex: 1,
    gap: 2,
    justifyContent: "center",
  },
  restaurantRowName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1E293B",
  },
  restaurantRowCuisine: {
    fontSize: 11,
    color: "#64748B",
  },
  restaurantRowMin: {
    fontSize: 11,
    fontWeight: "800",
    color: "#1B7A4E",
  },
  tagBadgeRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },
  tagBadge: {
    backgroundColor: "#E8F5EE",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagBadgeText: {
    fontSize: 8,
    fontWeight: "800",
    color: "#1B7A4E",
  },
  orderLaundryBtn: {
    backgroundColor: "#1B7A4E",
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    width: 100,
  },
  orderLaundryBtnText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },
  emptyCartBox: {
    paddingVertical: 48,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyCartTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1E293B",
  },
  emptyCartSub: {
    fontSize: 11,
    color: "#64748B",
    textAlign: "center",
    paddingHorizontal: 32,
  },
  cartBoxContent: {
    gap: 12,
  },
  cartItemsScroll: {
    maxHeight: 280,
  },
  cartItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  cartItemImg: {
    width: 44,
    height: 44,
    borderRadius: 8,
  },
  cartItemBody: {
    flex: 1,
    marginLeft: 12,
    gap: 1,
  },
  cartItemName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1E293B",
  },
  cartItemStore: {
    fontSize: 10,
    color: "#94A3B8",
  },
  cartItemPrice: {
    fontSize: 12,
    fontWeight: "900",
    color: "#1B7A4E",
  },
  qtyControlRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  qtyBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#1B7A4E",
    alignItems: "center",
    justifyContent: "center",
  },
  qtyText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1E293B",
  },
  cartFooterPanel: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    gap: 12,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  totalLabel: {
    fontSize: 12,
    color: "#64748B",
  },
  totalValText: {
    fontSize: 16,
    fontWeight: "900",
    color: "#1B7A4E",
  },
  checkoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1B7A4E",
    height: 46,
    borderRadius: 14,
    gap: 8,
  },
  checkoutBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

});
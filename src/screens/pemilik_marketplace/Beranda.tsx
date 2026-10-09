import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import React, { useCallback, useEffect, useRef, useState } from "react";
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
  Switch,
  Alert,
  Platform,
  ActivityIndicator,
} from "react-native";
import {
  Home,
  ShoppingBag,
  History as HistoryIcon,
  Wallet,
  User as UserIcon,
  Store as StoreIcon,
  Plus,
  ArrowRight,
  TrendingUp,
  MessageSquare,
  AlertTriangle,
  Image as ImageIcon,
  MoreVertical,
  ChevronRight,
  X,
  Camera,
  Trash2,
  LayoutGrid,
  List,
  Search,
  Package,
  Check,
  Minus,
  Edit3,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { rp } from "../../utils/formatters";
import { Nav } from "../../types";
import { AuthAccount } from "../auth/authTypes";
import { RoleHeader } from "../../components/RoleHeader";
import {
  getMarketplaceProductsForOwner,
  createMarketplaceProduct,
  updateMarketplaceProduct,
  deleteMarketplaceProduct,
  getMarketplaceOrdersForOwner,
  updateMarketplaceOrderStatus,
  getDrivers,
  assignMarketplaceDriver,
  getNotifications,
  markNotificationRead,
  getMarketplaceWithdrawals,
  uploadFileToBackend,
} from "../../services/api";
import { subscribeToUserRealtime } from "../../services/userRealtime";

// Import other screens
import { Order, OrderData } from "./Order";
import { Riwayat } from "./Riwayat";
import { Pendapatan } from "./Pendapatan";
import { Profile } from "./Profile";
import { FullPageProductForm, ProductFormData } from "../../components/FullPageProductForm";
import { ToastBanner, ToastType, ConfirmDialog } from "../../components/CustomDialog";

interface ProductItem {
  id: number | string;
  name: string;
  store: string;
  price: number;
  rating: number;
  sold: number;
  img: string;
  images?: string[];
  cat: string;
  description: string;
  stock: number;
  isActive: boolean;
}

interface MarketplaceHomeProps extends Nav {
  authAccount?: AuthAccount | null;
}

export const Beranda: React.FC<MarketplaceHomeProps> = ({ navigate, authAccount }) => {
  const [currentTab, setCurrentTab] = useState<number>(0);

  // In-App Toast Notification State (Eliminates browser native alerts)
  const [toastConfig, setToastConfig] = useState<{
    visible: boolean;
    type: ToastType;
    title: string;
    message: string;
  }>({
    visible: false,
    type: "info",
    title: "",
    message: "",
  });

  const showToast = (type: ToastType, title: string, message: string) => {
    setToastConfig({ visible: true, type, title, message });
  };

  const showAlert = (title: string, message: string) => {
    const lower = title.toLowerCase();
    const isSuccess = lower.includes("sukses") || lower.includes("berhasil");
    const isError = lower.includes("gagal") || lower.includes("error");
    const isWarning = lower.includes("batas") || lower.includes("izin");
    const type: ToastType = isSuccess ? "success" : isError ? "error" : isWarning ? "warning" : "info";
    showToast(type, title, message);
  };

  // In-App Confirmation Dialog State (Eliminates browser native confirms)
  const [confirmDialogConfig, setConfirmDialogConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type?: "danger" | "warning" | "success" | "info";
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
  }>({
    visible: false,
    title: "",
    message: "",
    type: "danger",
    onConfirm: () => {},
  });

  const showConfirm = (params: {
    title: string;
    message: string;
    type?: "danger" | "warning" | "success" | "info";
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
  }) => {
    setConfirmDialogConfig({
      visible: true,
      ...params,
    });
  };

  // 1. Global Store Info State with Specific Address & Maps
  const [storeInfo, setStoreInfo] = useState(() => ({
    ownerName: authAccount?.name || "",
    storeName: authAccount?.roleData?.businessName || "Nama toko belum diatur",
    phone: authAccount?.phone || "",
    email: authAccount?.email || "",
    address: authAccount?.roleData?.businessAddress || authAccount?.address || "Bogor",
    addressDetails: authAccount?.roleData?.addressDetails || authAccount?.roleData?.businessAddress || "",
    districtCity: authAccount?.roleData?.districtCity || "Kota Bogor",
    addressNote: authAccount?.roleData?.addressNote || "",
    latitude: Number(authAccount?.roleData?.latitude) || -6.5962,
    longitude: Number(authAccount?.roleData?.longitude) || 106.8040,
    description: authAccount?.roleData?.businessDescription || "Produk UMKM lokal, olahan rumahan, kerajinan, fashion, dan karya warga.",
    isOpen: true,
    isVerified: true,
    profileImage: authAccount?.profilePhoto || null,
  }));

  useEffect(() => {
    if (!authAccount) return;
    setStoreInfo((current) => ({
      ...current,
      ownerName: authAccount.name,
      phone: authAccount.phone,
      email: authAccount.email,
      storeName: authAccount.roleData?.businessName || current.storeName,
      address: authAccount.roleData?.businessAddress || authAccount.address || current.address,
      addressDetails: authAccount.roleData?.addressDetails || current.addressDetails,
      districtCity: authAccount.roleData?.districtCity || current.districtCity,
      addressNote: authAccount.roleData?.addressNote || current.addressNote,
      latitude: Number(authAccount.roleData?.latitude) || current.latitude,
      longitude: Number(authAccount.roleData?.longitude) || current.longitude,
      description: authAccount.roleData?.businessDescription || current.description,
      profileImage: authAccount.profilePhoto || null,
    }));
  }, [authAccount]);

  // 2. Global Products State
  const [products, setProducts] = useState<ProductItem[]>([]);

  useEffect(() => {
    if (!authAccount) return;
    void getMarketplaceProductsForOwner(authAccount.id).then((result) => {
      if (result.success && result.data) {
        setProducts(result.data.map((product: any) => ({
          id: product._id,
          name: product.name,
          store: storeInfo.storeName,
          price: product.price,
          rating: product.rating || 0,
          sold: product.sold || 0,
          img: product.img,
          images: Array.isArray(product.images) && product.images.length > 0 ? product.images : (product.img ? [product.img] : []),
          cat: product.cat,
          description: product.description,
          stock: product.stock,
          isActive: product.isActive,
        })));
      } else {
        setProducts([]);
      }
    });
  }, [authAccount, storeInfo.storeName]);

  // 3. Global Orders State
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersLoadError, setOrdersLoadError] = useState("");
  const [ordersReloadKey, setOrdersReloadKey] = useState(0);
  const ordersAccountIdRef = useRef<string | null>(null);
  const [drivers, setDrivers] = useState<{ id: string; name: string; phone: string; vehicleType?: string; plateNumber?: string }[]>([]);

  useEffect(() => {
    if (!authAccount?.id) {
      ordersAccountIdRef.current = null;
      setOrders([]);
      setOrdersLoading(false);
      setOrdersLoadError("");
      return;
    }
    if (ordersAccountIdRef.current !== authAccount.id) {
      ordersAccountIdRef.current = authAccount.id;
      setOrders([]);
    }
    setOrdersLoading(true);
    setOrdersLoadError("");
    let active = true;
    let loading = false;
    let firstRequest = true;
    const loadOrders = async () => {
      if (loading) return;
      loading = true;
      try {
        const result = await getMarketplaceOrdersForOwner(authAccount.id);
        if (!active) return;
        if (!result.success || !Array.isArray(result.data)) {
          setOrdersLoadError(result.message || "Riwayat pesanan belum dapat dimuat. Periksa koneksi lalu coba lagi.");
          return;
        }
        setOrders(result.data.map((order: any) => ({
          id: String(order._id),
          orderCode: order.orderCode || "",
          customer: order.customerName || "Pelanggan",
          customerPhone: order.customerPhone || "",
          items: Array.isArray(order.items) ? order.items : [],
          total: Number(order.totalAmount || 0),
          subtotal: Number(order.subtotal || 0),
          deliveryFee: Number(order.deliveryFee || 0),
          serviceFee: Number(order.serviceFee || 0),
          discount: Number(order.discount || 0),
          time: order.createdAt ? new Date(order.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "",
          createdAt: order.createdAt,
          completedAt: order.updatedAt,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          status: order.status,
          deliveryProofUrl: order.deliveryProofUrl || "",
          address: order.address || "Alamat pelanggan belum tersedia",
          storeName: order.storeName || "Mitra Marketplace",
          storeAddress: order.storeAddress || "Alamat toko belum tersedia",
          driverPhone: order.driverPhone || "",
          cancellation: order.cancellation,
          complaint: order.complaint,
          refund: order.refund,
          driver: order.driverId ? {
            name: order.driverName || "Driver",
            vehicle: order.driverVehicle || "",
            plateNumber: order.driverPlateNumber || "",
            phone: order.driverPhone || "",
            rating: 0,
            stage: order.status === "Menuju Pickup" ? "Driver menuju toko" : order.status === "Sampai Pickup" ? "Driver tiba di toko" : order.status === "Mengantar" ? "Pesanan sedang diantar" : order.status === "Selesai" ? "Pengantaran selesai" : "",
            distance: "",
            eta: "",
          } : null,
          unreadCustomerMessages: 0,
          unreadDriverMessages: 0,
        })));
        setOrdersLoadError("");
      } catch {
        if (active) setOrdersLoadError("Riwayat pesanan belum dapat dimuat. Periksa koneksi lalu coba lagi.");
      } finally {
        loading = false;
        if (active && firstRequest) {
          firstRequest = false;
          setOrdersLoading(false);
        }
      }
    };
    void loadOrders();
    const interval = setInterval(() => void loadOrders(), 30000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [authAccount?.id, ordersReloadKey]);

  useEffect(() => {
    void getDrivers().then((result) => {
      if (result.success && Array.isArray(result.data)) {
        setDrivers(result.data.map((driver: any) => ({
          id: driver._id,
          name: driver.name,
          phone: driver.phone || "",
          vehicleType: driver.roleData?.vehicleType || "",
          plateNumber: driver.roleData?.plateNumber || "",
        })));
      }
    });
  }, []);

  // 4. Global Withdrawals State
  const [withdrawals, setWithdrawals] = useState<any[]>([]);

  useEffect(() => {
    if (!authAccount?.id) return;
    void getMarketplaceWithdrawals(authAccount.id).then((result) => {
      if (result.success && Array.isArray(result.data)) {
        setWithdrawals(result.data.map((w: any) => ({
          id: String(w._id || w.id),
          amount: Number(w.amount || 0),
          method: w.method,
          destination: w.destination,
          createdAt: w.createdAt ? new Date(w.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "Hari ini",
          status: w.status || "Diproses",
        })));
      }
    });
  }, [authAccount?.id]);

  // UI States inside Beranda View
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  const refreshNotifications = useCallback(async () => {
    if (!authAccount?.id) return;
    const result = await getNotifications(authAccount.id);
    if (result.success && Array.isArray(result.data)) setNotifications(result.data);
  }, [authAccount?.id]);

  useEffect(() => {
    if (!authAccount?.id) {
      setNotifications([]);
      return;
    }
    void refreshNotifications();
    let isActive = true;
    let unsubscribe: () => void = () => undefined;
    void subscribeToUserRealtime(
      () => void refreshNotifications(),
      () => {
        void refreshNotifications();
        setOrdersReloadKey((key) => key + 1);
      }
    ).then((stop) => {
      if (isActive) unsubscribe = stop;
      else stop();
    });
    const interval = setInterval(() => void refreshNotifications(), 30000);
    return () => {
      isActive = false;
      clearInterval(interval);
      unsubscribe();
    };
  }, [authAccount?.id, refreshNotifications]);

  const openNotification = async (notification: any) => {
    if (!notification.isRead) {
      const result = await markNotificationRead(String(notification._id));
      if (result.success) setNotifications((current) => current.map((item) => item._id === notification._id ? { ...item, isRead: true } : item));
    }
    setNotifModalVisible(false);
    setCurrentTab(1);
  };
  const [productFormVisible, setProductFormVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [showAllProducts, setShowAllProducts] = useState(false);
  // View mode & filtering states
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStock, setFilterStock] = useState<"semua" | "tersedia" | "menipis" | "habis">("semua");

  // Quick Stock Modal states
  const [stockModalVisible, setStockModalVisible] = useState(false);
  const [stockProduct, setStockProduct] = useState<ProductItem | null>(null);
  const [stockValue, setStockValue] = useState("0");
  const [stockIsActive, setStockIsActive] = useState(true);
  const [stockSaving, setStockSaving] = useState(false);

  // Quick Photo Modal states
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [photoProduct, setPhotoProduct] = useState<ProductItem | null>(null);
  const [photoImages, setPhotoImages] = useState<string[]>([]);
  const [primaryPhoto, setPrimaryPhoto] = useState<string>("");
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoSaving, setPhotoSaving] = useState(false);

  // Action Menu Sheet states (Titik Tiga CRUD)
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [actionMenuProduct, setActionMenuProduct] = useState<ProductItem | null>(null);

  const handleOpenActionMenu = (product: ProductItem) => {
    setActionMenuProduct(product);
    setActionMenuVisible(true);
  };

  const handleOpenStockModal = (product: ProductItem) => {
    setStockProduct(product);
    setStockValue(String(product.stock));
    setStockIsActive(product.isActive);
    setStockModalVisible(true);
  };

  const handleSaveStock = async () => {
    if (!stockProduct) return;
    const parsedStock = Math.max(0, parseInt(stockValue, 10) || 0);
    setStockSaving(true);
    try {
      const res = await updateMarketplaceProduct(
        stockProduct.id,
        { stock: parsedStock, isActive: stockIsActive },
        authAccount?.id
      );
      if (res.success) {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === stockProduct.id
              ? { ...p, stock: parsedStock, isActive: stockIsActive }
              : p
          )
        );
        showAlert("Sukses", `Stok produk "${stockProduct.name}" berhasil diperbarui ke ${parsedStock}.`);
        setStockModalVisible(false);
      } else {
        showAlert("Gagal", res.message || "Gagal memperbarui stok.");
      }
    } catch {
      showAlert("Error", "Gagal memperbarui stok produk.");
    } finally {
      setStockSaving(false);
    }
  };

  const handleOpenPhotoModal = (product: ProductItem) => {
    const imgs = Array.isArray(product.images) && product.images.length > 0
      ? product.images
      : (product.img ? [product.img] : []);
    setPhotoProduct(product);
    setPhotoImages(imgs);
    setPrimaryPhoto(product.img || imgs[0] || "");
    setPhotoModalVisible(true);
  };

  const handlePickPhotoFromGallery = async () => {
    if (photoImages.length >= 6) {
      showAlert("Batas Maksimal", "Maksimal 6 foto per produk.");
      return;
    }
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        showAlert("Izin Ditolak", "Izin akses galeri diperlukan.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: false,
        quality: 0.85,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setPhotoUploading(true);
        const uploadRes = await uploadFileToBackend(
          asset.uri,
          asset.fileName || `product_${Date.now()}.jpg`,
          asset.mimeType || "image/jpeg"
        );
        if (uploadRes?.success && uploadRes?.data?.url) {
          const newUrl = uploadRes.data.url;
          setPhotoImages((prev) => [...prev, newUrl]);
          if (!primaryPhoto) setPrimaryPhoto(newUrl);
        } else {
          showAlert("Gagal", uploadRes?.message || "Gagal mengunggah foto.");
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleTakePhotoForProduct = async () => {
    if (photoImages.length >= 6) {
      showAlert("Batas Maksimal", "Maksimal 6 foto per produk.");
      return;
    }
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        showAlert("Izin Ditolak", "Izin akses kamera diperlukan.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        quality: 0.85,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setPhotoUploading(true);
        const uploadRes = await uploadFileToBackend(
          asset.uri,
          `camera_${Date.now()}.jpg`,
          "image/jpeg"
        );
        if (uploadRes?.success && uploadRes?.data?.url) {
          const newUrl = uploadRes.data.url;
          setPhotoImages((prev) => [...prev, newUrl]);
          if (!primaryPhoto) setPrimaryPhoto(newUrl);
        } else {
          showAlert("Gagal", uploadRes?.message || "Gagal mengunggah foto.");
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleSavePhotos = async () => {
    if (!photoProduct) return;
    const finalPrimary = primaryPhoto || photoImages[0] || "";
    setPhotoSaving(true);
    try {
      const res = await updateMarketplaceProduct(
        photoProduct.id,
        { img: finalPrimary, images: photoImages },
        authAccount?.id
      );
      if (res.success) {
        setProducts((prev) =>
          prev.map((p) =>
            p.id === photoProduct.id
              ? { ...p, img: finalPrimary, images: photoImages }
              : p
          )
        );
        showAlert("Sukses", `Foto produk "${photoProduct.name}" berhasil disimpan.`);
        setPhotoModalVisible(false);
      } else {
        showAlert("Gagal", res.message || "Gagal menyimpan foto produk.");
      }
    } catch {
      showAlert("Error", "Gagal menyimpan foto.");
    } finally {
      setPhotoSaving(false);
    }
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    const targetUrl = photoImages[indexToRemove];
    const updated = photoImages.filter((_, idx) => idx !== indexToRemove);
    setPhotoImages(updated);
    if (primaryPhoto === targetUrl) {
      setPrimaryPhoto(updated[0] || "");
    }
  };

  const handleSetPrimaryPhoto = (url: string) => {
    setPrimaryPhoto(url);
  };

  const handleOpenProductForm = (product: ProductItem | null = null) => {
    setEditingProduct(product);
    setProductFormVisible(true);
  };

  const handleSaveProduct = async (formData: ProductFormData) => {
    if (editingProduct) {
      // Edit mode
      const updatedPayload = {
        name: formData.name,
        description: formData.description,
        cat: formData.cat,
        price: formData.price,
        stock: formData.stock,
        isActive: formData.isActive,
        img: formData.img || (formData.images.length > 0 ? formData.images[0] : editingProduct.img),
        images: formData.images,
      };
      const result = await updateMarketplaceProduct(editingProduct.id, updatedPayload, authAccount?.id);
      if (!result.success || !result.data) {
        showAlert("Gagal", result.message || "Gagal memperbarui produk");
        return;
      }
      setProducts(
        products.map((p) =>
          p.id === editingProduct.id
            ? {
                ...p,
                name: result.data.name,
                description: result.data.description,
                cat: result.data.cat,
                price: result.data.price,
                stock: result.data.stock,
                isActive: result.data.isActive,
                img: result.data.img,
                images: result.data.images || formData.images,
              }
            : p
        )
      );
      showAlert("Sukses", "Produk berhasil diperbarui");
      setProductFormVisible(false);
      setEditingProduct(null);
    } else {
      // Add mode
      const primaryImg =
        formData.img ||
        (formData.images.length > 0
          ? formData.images[0]
          : "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=300&fit=crop&q=80");

      const result = await createMarketplaceProduct({
        ownerId: authAccount?.id || "",
        name: formData.name,
        price: formData.price,
        img: primaryImg,
        images: formData.images.length > 0 ? formData.images : [primaryImg],
        cat: formData.cat,
        description: formData.description,
        stock: formData.stock,
        isActive: formData.isActive,
      }, authAccount?.id);
      if (!result.success || !result.data) {
        showAlert("Gagal", result.message || "Gagal menyimpan produk");
        return;
      }
      const newProduct: ProductItem = {
        id: result.data._id,
        name: result.data.name,
        store: storeInfo.storeName,
        price: result.data.price,
        rating: 0,
        sold: 0,
        img: result.data.img,
        images: result.data.images || formData.images,
        cat: result.data.cat,
        description: result.data.description,
        stock: result.data.stock,
        isActive: result.data.isActive,
      };
      setProducts([newProduct, ...products]);
      showAlert("Sukses", "Produk berhasil disimpan ke database");
      setProductFormVisible(false);
      setEditingProduct(null);
    }
  };

  const handleDeleteProduct = (productId: string | number) => {
    showConfirm({
      title: "Hapus Produk UMKM?",
      message: "Apakah Anda yakin ingin menghapus produk UMKM ini dari etalase toko?",
      type: "danger",
      confirmText: "Hapus",
      cancelText: "Batal",
      onConfirm: async () => {
        setConfirmDialogConfig((prev) => ({ ...prev, visible: false }));
        const result = await deleteMarketplaceProduct(productId, authAccount?.id);
        if (!result.success) {
          showAlert("Gagal", result.message || "Gagal menghapus produk");
          return;
        }
        setProducts((prev) => prev.filter((p) => p.id !== productId));
        showAlert("Sukses", "Produk telah dihapus");
      },
    });
  };

  const handleToggleProductActive = async (product: ProductItem) => {
    const nextActive = !product.isActive;
    const updated = products.map((p) => {
      if (p.id === product.id) {
        return { ...p, isActive: nextActive };
      }
      return p;
    });
    setProducts(updated);
    const result = await updateMarketplaceProduct(product.id, { isActive: nextActive }, authAccount?.id);
    if (!result.success) {
      setProducts(products);
      showAlert("Gagal", result.message || "Gagal memperbarui status produk");
      return;
    }
    showAlert(
      "Sukses",
      nextActive ? "Produk diaktifkan kembali" : "Produk dinonaktifkan sementara"
    );
  };

  const handleToggleStoreStatus = () => {
    const nextStatus = !storeInfo.isOpen;
    showConfirm({
      title: nextStatus ? "Buka Outlet?" : "Tutup Outlet?",
      message: nextStatus
        ? "Outlet akan kembali menerima pesanan customer."
        : "Customer tidak dapat membuat pesanan selama outlet ditutup.",
      type: nextStatus ? "success" : "warning",
      confirmText: nextStatus ? "Buka Outlet" : "Tutup Outlet",
      cancelText: "Batal",
      onConfirm: () => {
        setConfirmDialogConfig((prev) => ({ ...prev, visible: false }));
        setStoreInfo({ ...storeInfo, isOpen: nextStatus });
        showAlert("Sukses", nextStatus ? "Outlet sekarang dibuka." : "Outlet sekarang ditutup.");
      },
    });
  };

  // Helper calculation
  const totalCompletedOrders = orders.filter((o) => o.status === "Selesai");
  const totalRevenueVal = totalCompletedOrders.reduce((sum, o) => sum + o.total, 0);

  const activeOrdersCount = orders.filter((o) => o.status !== "Selesai" && o.status !== "Dibatalkan").length;
  
  // Needs attention products
  const needsAttention = products.filter(
    (p) => !p.isActive || p.stock <= 5 || p.img === "" || p.description === ""
  );

  // Best sellers (sorted by sold count)
  const bestSellers = [...products].sort((a, b) => b.sold - a.sold);

  const showProductActionSheet = (product: ProductItem) => {
    handleOpenActionMenu(product);
  };

  // Stock status counts
  const stockReadyCount = products.filter((p) => p.isActive && p.stock > 5).length;
  const stockLowCount = products.filter((p) => p.isActive && p.stock > 0 && p.stock <= 5).length;
  const stockOutCount = products.filter((p) => !p.isActive || p.stock === 0).length;

  // Filtered products list
  const filteredProducts = products.filter((p) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = p.name ? p.name.toLowerCase().includes(q) : false;
      const matchCat = p.cat ? p.cat.toLowerCase().includes(q) : false;
      if (!matchName && !matchCat) return false;
    }
    if (filterStock === "tersedia") {
      return p.isActive && p.stock > 5;
    }
    if (filterStock === "menipis") {
      return p.isActive && p.stock > 0 && p.stock <= 5;
    }
    if (filterStock === "habis") {
      return !p.isActive || p.stock === 0;
    }
    return true;
  });

  const displayedProducts = showAllProducts ? filteredProducts : filteredProducts.slice(0, 6);

  // Render sub page
  const renderTabContent = () => {
    switch (currentTab) {
      case 0:
        return renderBerandaContent();
      case 1:
        return (
          <Order
            orders={orders}
            setOrders={setOrders}
            onStatusChange={async (orderId, status) => {
              const result = await updateMarketplaceOrderStatus(orderId, status, authAccount);
              if (!result.success) {
                showAlert("Gagal", result.message || "Gagal memperbarui status pesanan");
                return false;
              }
              return true;
            }}
            ownerId={authAccount?.id}
            drivers={drivers}
            onAssignDriver={async (orderId, driverId) => {
              const result = await assignMarketplaceDriver(orderId, driverId);
              if (!result.success) {
                showAlert("Gagal", result.message || "Driver gagal ditugaskan");
                return false;
              }
              return true;
            }}
          />
        );
      case 2:
        return <Riwayat
          orders={orders}
          loading={ordersLoading}
          error={ordersLoadError}
          onRetry={() => setOrdersReloadKey((key) => key + 1)}
        />;
      case 3:
        return (
          <Pendapatan
            orders={orders}
            storeName={storeInfo.storeName}
            withdrawals={withdrawals}
            setWithdrawals={setWithdrawals}
            ownerId={authAccount?.id}
          />
        );
      case 4:
        return <Profile storeInfo={storeInfo} setStoreInfo={setStoreInfo} userId={authAccount?.id} navigate={navigate} />;
      default:
        return renderBerandaContent();
    }
  };

  // Bottom Nav items
  const navItems = [
    { label: "Beranda", icon: Home },
    { label: "Order", icon: ShoppingBag },
    { label: "Riwayat", icon: HistoryIcon },
    { label: "Pendapatan", icon: Wallet },
    { label: "Profil", icon: UserIcon },
  ];

  // Primary Beranda view
  const renderBerandaContent = () => {
    return (
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <RoleHeader
          name={storeInfo.ownerName || "Nama Pemilik"}
          role="Pemilik Marketplace"
          icon={StoreIcon}
          notificationCount={notifications.filter((notification) => !notification.isRead).length}
          onNotificationPress={() => { void refreshNotifications(); setNotifModalVisible(true); }}
          onRolePress={() => navigate("role")}
        />

        {/* Outlet Status Card */}
        <View style={styles.outletCard}>
          <View style={styles.outletHeader}>
            <View>
              <Text style={styles.outletStatusLabel}>
                {storeInfo.isOpen ? "OUTLET AKTIF" : "OUTLET NONAKTIF"}
              </Text>
              <Text style={styles.storeNameText}>{storeInfo.storeName}</Text>
            </View>
            <TouchableOpacity 
              style={styles.outletToggleBtn} 
              onPress={handleToggleStoreStatus}
              activeOpacity={0.8}
            >
              <Text style={styles.outletToggleBtnText}>
                {storeInfo.isOpen ? "Tutup Outlet" : "Buka Outlet"}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.outletStatusDesc}>
            {storeInfo.isOpen
              ? "Toko sedang menerima pesanan customer."
              : "Toko ditutup. Customer tidak dapat membuat pesanan."}
          </Text>

          <View style={styles.outletMetricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Rating</Text>
              <Text style={styles.metricVal}>4,9 ★</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Order hari ini</Text>
              <Text style={styles.metricVal}>{orders.length}</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Estimasi</Text>
              <Text style={styles.metricVal}>11 mnt</Text>
            </View>
          </View>
        </View>

        {/* Summary Ringkasan */}
        <Text style={styles.sectionTitle}>Ringkasan Hari Ini</Text>
        <Text style={styles.sectionSubtitle}>Data order marketplace</Text>

        <View style={styles.summaryGrid}>
          <TouchableOpacity 
            style={styles.summaryCard} 
            onPress={() => setCurrentTab(1)}
            activeOpacity={0.8}
          >
            <ShoppingBag size={18} color="#1B7A4E" />
            <Text style={styles.summaryValue}>{orders.length}</Text>
            <Text style={styles.summaryLabel}>Order - Hari ini</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.summaryCard} 
            onPress={() => setCurrentTab(3)}
            activeOpacity={0.8}
          >
            <Wallet size={18} color="#1B7A4E" />
            <Text style={styles.summaryValue}>{rp(totalRevenueVal)}</Text>
            <Text style={styles.summaryLabel}>Pendapatan - Tercatat</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.summaryCard} 
            onPress={() => setCurrentTab(1)}
            activeOpacity={0.8}
          >
            <TrendingUp size={18} color="#1B7A4E" />
            <Text style={styles.summaryValue}>{activeOrdersCount}</Text>
            <Text style={styles.summaryLabel}>Diproses - Perlu aksi</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.summaryCard} 
            onPress={() => showToast("info", "Ulasan", "Belum ada ulasan yang terhubung.")}
            activeOpacity={0.8}
          >
            <MessageSquare size={18} color="#1B7A4E" />
            <Text style={styles.summaryValue}>—</Text>
            <Text style={styles.summaryLabel}>Rating - Belum ada</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Aksi Cepat</Text>
        <Text style={styles.sectionSubtitle}>Kelola toko lebih cepat</Text>

        <View style={styles.quickActionsRow}>
          <TouchableOpacity 
            style={styles.quickActionCard} 
            onPress={() => handleOpenProductForm(null)}
            activeOpacity={0.8}
          >
            <Plus size={20} color="#1B7A4E" />
            <Text style={styles.quickActionLabel}>Tambah Menu</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickActionCard} 
            onPress={() => setShowAllProducts((prev) => !prev)}
            activeOpacity={0.8}
          >
            <StoreIcon size={20} color="#1B7A4E" />
            <Text style={styles.quickActionLabel}>{showAllProducts ? "Ringkas Produk" : "Kelola Produk"}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickActionCard} 
            onPress={() => setCurrentTab(1)}
            activeOpacity={0.8}
          >
            <ShoppingBag size={20} color="#1B7A4E" />
            <Text style={styles.quickActionLabel}>Lihat Order</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickActionCard} 
            onPress={() => setCurrentTab(3)}
            activeOpacity={0.8}
          >
            <Wallet size={20} color="#1B7A4E" />
            <Text style={styles.quickActionLabel}>Pendapatan</Text>
          </TouchableOpacity>
        </View>

        {/* Needs attention products */}
        {needsAttention.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Perlu Perhatian</Text>
            <Text style={styles.sectionSubtitle}>{needsAttention.length} produk perlu dicek</Text>
            
            <View style={styles.attentionContainer}>
              {needsAttention.slice(0, 3).map((product) => {
                const message = 
                  product.stock === 0 || !product.isActive 
                    ? "Produk tidak tersedia untuk customer" 
                    : product.stock <= 5 
                      ? `Stok tersisa ${product.stock}` 
                      : product.img === "" 
                        ? "Belum memiliki foto" 
                        : "Deskripsi belum diisi";

                return (
                  <View key={product.id} style={styles.attentionRow}>
                    <AlertTriangle size={18} color="#B45309" />
                    <View style={styles.attentionInfo}>
                      <Text style={styles.attentionName}>{product.name}</Text>
                      <Text style={styles.attentionMsg}>{message}</Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.attentionBtn}
                      onPress={() => handleOpenProductForm(product)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.attentionBtnText}>Kelola</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Product Menu Header & Controls */}
        <View style={styles.menuHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Etalase & Menu Produk</Text>
            <Text style={styles.sectionSubtitle}>
              {products.length} menu terdaftar • {stockReadyCount} siap jual
            </Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {/* View Mode Toggle: Grid vs List */}
            <View style={styles.viewToggleWrap}>
              <TouchableOpacity
                style={[
                  styles.viewToggleBtn,
                  viewMode === "grid" && styles.viewToggleBtnActive,
                ]}
                onPress={() => setViewMode("grid")}
                activeOpacity={0.8}
              >
                <LayoutGrid
                  size={16}
                  color={viewMode === "grid" ? "#FFFFFF" : "#6B7280"}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.viewToggleBtn,
                  viewMode === "list" && styles.viewToggleBtnActive,
                ]}
                onPress={() => setViewMode("list")}
                activeOpacity={0.8}
              >
                <List
                  size={16}
                  color={viewMode === "list" ? "#FFFFFF" : "#6B7280"}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity 
              style={styles.addMenuBtn} 
              onPress={() => handleOpenProductForm(null)}
              activeOpacity={0.8}
            >
              <Plus size={16} color="#FFFFFF" />
              <Text style={styles.addMenuBtnText}>Tambah Menu</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Search & Stock Filter Bar */}
        <View style={styles.filterSectionContainer}>
          <View style={styles.searchBarContainer}>
            <Search size={16} color="#9CA3AF" />
            <TextInput
              style={styles.searchInput}
              placeholder="Cari nama menu / kategori..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <X size={16} color="#9CA3AF" />
              </TouchableOpacity>
            )}
          </View>

          {/* Filter Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterPillsScroll}
          >
            <TouchableOpacity
              style={[
                styles.filterPill,
                filterStock === "semua" && styles.filterPillActive,
              ]}
              onPress={() => setFilterStock("semua")}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.filterPillText,
                  filterStock === "semua" && styles.filterPillTextActive,
                ]}
              >
                Semua ({products.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterPill,
                filterStock === "tersedia" && styles.filterPillActiveReady,
              ]}
              onPress={() => setFilterStock("tersedia")}
              activeOpacity={0.7}
            >
              <View style={[styles.filterDot, { backgroundColor: "#1B7A4E" }]} />
              <Text
                style={[
                  styles.filterPillText,
                  filterStock === "tersedia" && styles.filterPillTextActiveReady,
                ]}
              >
                Tersedia ({stockReadyCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterPill,
                filterStock === "menipis" && styles.filterPillActiveLow,
              ]}
              onPress={() => setFilterStock("menipis")}
              activeOpacity={0.7}
            >
              <View style={[styles.filterDot, { backgroundColor: "#B45309" }]} />
              <Text
                style={[
                  styles.filterPillText,
                  filterStock === "menipis" && styles.filterPillTextActiveLow,
                ]}
              >
                Menipis ({stockLowCount})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.filterPill,
                filterStock === "habis" && styles.filterPillActiveOut,
              ]}
              onPress={() => setFilterStock("habis")}
              activeOpacity={0.7}
            >
              <View style={[styles.filterDot, { backgroundColor: "#DC2626" }]} />
              <Text
                style={[
                  styles.filterPillText,
                  filterStock === "habis" && styles.filterPillTextActiveOut,
                ]}
              >
                Habis ({stockOutCount})
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Product Cards: Grid vs List */}
        {displayedProducts.length === 0 ? (
          <View style={styles.emptyProductsCard}>
            <StoreIcon size={34} color="#1B7A4E" />
            <Text style={styles.emptyProductsTitle}>
              {searchQuery || filterStock !== "semua"
                ? "Tidak ada produk yang cocok"
                : "Belum ada menu"}
            </Text>
            <Text style={styles.emptyProductsDesc}>
              {searchQuery || filterStock !== "semua"
                ? "Coba sesuaikan filter atau kata kunci pencarian Anda."
                : "Tambahkan menu pertama agar tampil di etalase pembeli."}
            </Text>
            {(searchQuery || filterStock !== "semua") && (
              <TouchableOpacity
                style={styles.resetFilterBtn}
                onPress={() => {
                  setSearchQuery("");
                  setFilterStock("semua");
                }}
              >
                <Text style={styles.resetFilterBtnText}>Reset Filter</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : viewMode === "grid" ? (
          /* GRID VIEW (2 Kolom Mendatar) */
          <View style={styles.productGridContainer}>
            {displayedProducts.map((product) => {
              const isOut = !product.isActive || product.stock === 0;
              const isLow = product.isActive && product.stock > 0 && product.stock <= 5;
              const statusLabel = isOut ? "Habis" : isLow ? "Menipis" : "Tersedia";
              const statusBg = isOut ? "#FEE2E2" : isLow ? "#FEF3C7" : "#E8F5EE";
              const statusColor = isOut ? "#DC2626" : isLow ? "#B45309" : "#1B7A4E";
              const photoCount = Array.isArray(product.images) && product.images.length > 0 ? product.images.length : (product.img ? 1 : 0);

              return (
                <View key={product.id} style={styles.gridCard}>
                  {/* Image & Badges */}
                  <TouchableOpacity
                    activeOpacity={0.88}
                    onPress={() => showProductActionSheet(product)}
                    style={styles.gridImageWrap}
                  >
                    {product.img !== "" ? (
                      <Image source={{ uri: product.img }} style={styles.gridImage as any} />
                    ) : (
                      <View style={styles.gridImagePlaceholder}>
                        <ImageIcon size={26} color="#1B7A4E" />
                      </View>
                    )}

                    {/* Stock Status Badge */}
                    <View style={[styles.gridStatusBadge, { backgroundColor: statusBg }]}>
                      <Text style={[styles.gridStatusText, { color: statusColor }]}>
                        {statusLabel}
                      </Text>
                    </View>

                    {/* Photo Count Badge */}
                    {photoCount > 1 && (
                      <View style={styles.gridPhotoCountBadge}>
                        <ImageIcon size={10} color="#FFFFFF" />
                        <Text style={styles.gridPhotoCountText}>{photoCount}</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Product Details */}
                  <View style={styles.gridBody}>
                    <Text style={styles.gridCategoryText} numberOfLines={1}>
                      {product.cat || "UMKM"}
                    </Text>
                    <Text style={styles.gridProductName} numberOfLines={2}>
                      {product.name}
                    </Text>
                    <Text style={styles.gridPriceText}>{rp(product.price)}</Text>

                    <View style={styles.gridStockRow}>
                      <Package size={12} color="#6B7280" />
                      <Text style={[styles.gridStockText, isOut && { color: "#DC2626", fontWeight: "700" }]}>
                        Stok: {product.stock}
                      </Text>
                    </View>
                  </View>

                  {/* Quick Action Buttons */}
                  <View style={styles.gridActionsRow}>
                    <TouchableOpacity
                      style={styles.gridActionStockBtn}
                      onPress={() => handleOpenStockModal(product)}
                      activeOpacity={0.7}
                    >
                      <Package size={12} color="#1B7A4E" />
                      <Text style={styles.gridActionStockText}>Stok</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.gridActionPhotoBtn}
                      onPress={() => handleOpenPhotoModal(product)}
                      activeOpacity={0.7}
                    >
                      <Camera size={12} color="#0284C7" />
                      <Text style={styles.gridActionPhotoText}>Foto</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.gridActionMoreBtn}
                      onPress={() => showProductActionSheet(product)}
                      activeOpacity={0.7}
                    >
                      <MoreVertical size={13} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          /* LIST VIEW (Vertikal) */
          <View style={styles.productList}>
            {displayedProducts.map((product) => {
              const isOut = !product.isActive || product.stock === 0;
              const isLow = product.isActive && product.stock > 0 && product.stock <= 5;
              const statusLabel = isOut ? "Habis" : isLow ? "Menipis" : "Tersedia";
              const statusBg = isOut ? "#FEE2E2" : isLow ? "#FEF3C7" : "#E8F5EE";
              const statusColor = isOut ? "#DC2626" : isLow ? "#B45309" : "#1B7A4E";
              const photoCount = Array.isArray(product.images) && product.images.length > 0 ? product.images.length : (product.img ? 1 : 0);

              return (
                <View key={product.id} style={styles.productCard}>
                  <TouchableOpacity
                    onPress={() => handleOpenPhotoModal(product)}
                    activeOpacity={0.8}
                    style={{ position: "relative" }}
                  >
                    {product.img !== "" ? (
                      <Image source={{ uri: product.img }} style={styles.productImg as any} />
                    ) : (
                      <View style={styles.productImgPlaceholder}>
                        <ImageIcon size={20} color="#1B7A4E" />
                      </View>
                    )}
                    {photoCount > 1 && (
                      <View style={styles.listPhotoCountBadge}>
                        <Text style={styles.listPhotoCountText}>{photoCount}</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  <View style={styles.productInfo}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={styles.productCatTag}>{product.cat || "UMKM"}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                        <Text style={[styles.statusBadgeText, { color: statusColor }]}>{statusLabel}</Text>
                      </View>
                    </View>
                    <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                    <Text style={styles.productPrice}>{rp(product.price)}</Text>

                    <View style={styles.listStockQuickRow}>
                      <Text style={styles.productStock}>
                        Stok: <Text style={{ fontWeight: "800", color: isOut ? "#DC2626" : "#111827" }}>{product.stock}</Text>
                      </Text>

                      {/* Inline quick buttons */}
                      <View style={{ flexDirection: "row", gap: 6, marginLeft: "auto" }}>
                        <TouchableOpacity
                          style={styles.listQuickStockBtn}
                          onPress={() => handleOpenStockModal(product)}
                          activeOpacity={0.7}
                        >
                          <Package size={12} color="#1B7A4E" />
                          <Text style={styles.listQuickBtnText}>Atur Stok</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.listQuickPhotoBtn}
                          onPress={() => handleOpenPhotoModal(product)}
                          activeOpacity={0.7}
                        >
                          <Camera size={12} color="#0284C7" />
                          <Text style={styles.listQuickPhotoText}>Foto</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity 
                    style={styles.moreBtn}
                    onPress={() => showProductActionSheet(product)}
                    activeOpacity={0.7}
                  >
                    <MoreVertical size={18} color="#6B7280" />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        )}

        {/* View All / Toggle Button if more than 6 items */}
        {filteredProducts.length > 6 && (
          <TouchableOpacity
            style={styles.toggleShowAllBtn}
            onPress={() => setShowAllProducts((prev) => !prev)}
            activeOpacity={0.8}
          >
            <Text style={styles.toggleShowAllBtnText}>
              {showAllProducts
                ? "Tampilkan Lebih Sedikit (6)"
                : `Lihat Semua Menu (${filteredProducts.length})`}
            </Text>
          </TouchableOpacity>
        )}

        {/* Best sellers */}
        <Text style={styles.sectionTitle}>Produk Terlaris</Text>
        <Text style={styles.sectionSubtitle}>Berdasarkan produk terjual</Text>

        <View style={styles.bestSellersContainer}>
          {products.length === 0 ? (
            <View style={styles.emptySellers}>
              <Text style={styles.emptySellersText}>Belum ada data produk untuk diperingkatkan.</Text>
            </View>
          ) : (
            bestSellers.slice(0, 3).map((product, index) => (
              <View key={product.id} style={styles.sellerRow}>
                <View style={styles.sellerRank}>
                  <Text style={styles.sellerRankText}>{index + 1}</Text>
                </View>
                <Text style={styles.sellerName}>{product.name}</Text>
                <Text style={styles.sellerSoldText}>{product.sold} terjual</Text>
              </View>
            ))
          )}
        </View>

        {/* Reviews */}
        <Text style={styles.sectionTitle}>Rating dan Ulasan</Text>
        <Text style={styles.sectionSubtitle}>Belum terhubung ke data ulasan</Text>
        <View style={styles.emptyReviews}>
          <MessageSquare size={24} color="#9CA3AF" />
          <Text style={styles.emptyReviewsText}>
            Belum ada ulasan customer. Ulasan akan tampil setelah model review tersedia.
          </Text>
        </View>

        {/* Shop Insights */}
        <Text style={styles.sectionTitle}>Insight Toko</Text>
        <Text style={styles.sectionSubtitle}>Dihitung saat data tersedia</Text>
        <View style={styles.insightCard}>
          {products.length > 0 ? (
            <Text style={styles.insightText}>
              {bestSellers[0].name} adalah produk dengan penjualan tertinggi ({bestSellers[0].sold} terjual).
            </Text>
          ) : (
            <Text style={styles.insightText}>Belum cukup data untuk membuat insight toko.</Text>
          )}
          <Text style={[styles.insightText, { color: "#6B7280", marginTop: 6 }]}>
            Data order marketplace saat ini tersedia untuk dipantau dari menu Order.
          </Text>
        </View>
      </ScrollView>
    );
  };

  if (productFormVisible) {
    return (
      <FullPageProductForm
        title={editingProduct ? "Edit Produk Marketplace" : "Tambah Produk Baru"}
        subtitle={
          editingProduct
            ? "Perbarui informasi dan foto produk marketplace Anda"
            : "Lengkapi detail produk dan tambahkan foto produk"
        }
        isEdit={Boolean(editingProduct)}
        initialData={
          editingProduct
            ? {
                id: editingProduct.id,
                name: editingProduct.name,
                description: editingProduct.description,
                cat: editingProduct.cat,
                price: editingProduct.price,
                stock: editingProduct.stock,
                isActive: editingProduct.isActive,
                img: editingProduct.img,
                images:
                  Array.isArray(editingProduct.images) && editingProduct.images.length > 0
                    ? editingProduct.images
                    : editingProduct.img
                    ? [editingProduct.img]
                    : [],
              }
            : undefined
        }
        categories={["Makanan", "UMKM Lokal"]}
        priceLabel="Harga Produk (Rp)"
        pricePlaceholder="Contoh: 25000"
        stockLabel="Jumlah Stok"
        stockPlaceholder="Contoh: 15"
        themeColor="#1B7A4E"
        onCancel={() => {
          setProductFormVisible(false);
          setEditingProduct(null);
        }}
        onSave={handleSaveProduct}
        onDelete={
          editingProduct
            ? () => {
                handleDeleteProduct(editingProduct.id);
                setProductFormVisible(false);
                setEditingProduct(null);
              }
            : undefined
        }
      />
    );
  }

  return (
    <ResponsiveSafeAreaView style={styles.container}>
      {/* Dynamic Tab Body */}
      <View style={styles.tabContentContainer}>{renderTabContent()}</View>

      {/* Custom Bottom Nav Bar */}
      <View style={styles.bottomNavContainer}>
        {navItems.map((item, index) => {
          const active = currentTab === index;
          const IconComp = item.icon;
          return (
            <TouchableOpacity
              key={index}
              style={styles.navItem}
              onPress={() => setCurrentTab(index)}
              activeOpacity={0.7}
            >
              <View style={[styles.navIconBg, active ? styles.navIconBgActive : null]}>
                <IconComp size={20} color={active ? "#1B7A4E" : "#9CA3AF"} />
              </View>
              <Text style={[styles.navLabel, active ? styles.navLabelActive : null]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 1. Modal Notifications Panel */}
      <Modal visible={notifModalVisible} transparent animationType="slide">
        <View style={styles.modalBgBottom}>
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Notifikasi</Text>
              <TouchableOpacity onPress={() => setNotifModalVisible(false)}>
                <X size={20} color="#111827" />
              </TouchableOpacity>
            </View>

            <View style={styles.notifList}>
              {notifications.length > 0 ? (
                notifications.slice(0, 30).map((notification) => (
                  <TouchableOpacity
                    key={String(notification._id)}
                    style={[styles.notifItemRow, !notification.isRead && { backgroundColor: "#F0FDF4" }]}
                    onPress={() => void openNotification(notification)}
                  >
                    <View style={styles.notifIconBg}><ShoppingBag size={18} color="#1B7A4E" /></View>
                    <View style={styles.notifBody}>
                      <Text style={styles.notifRowTitle}>{notification.title}</Text>
                      <Text style={styles.notifRowDesc}>{notification.message}</Text>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.notifRowDesc}>Belum ada notifikasi pesanan.</Text>
              )}
            </View>

            <TouchableOpacity 
              style={styles.sheetBtnClose}
              onPress={() => setNotifModalVisible(false)}
            >
              <Text style={styles.sheetBtnCloseText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 2. Modal Atur Stok Cepat */}
      <Modal
        visible={stockModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setStockModalVisible(false)}
      >
        <View style={styles.modalBgBottom}>
          <View style={styles.quickModalSheet}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Atur Stok Produk</Text>
                <Text style={styles.sheetSubtitle}>
                  Perbarui jumlah stok dan status penjualan
                </Text>
              </View>
              <TouchableOpacity onPress={() => setStockModalVisible(false)}>
                <X size={20} color="#111827" />
              </TouchableOpacity>
            </View>

            {stockProduct && (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
                {/* Product Summary */}
                <View style={styles.stockProductCard}>
                  {stockProduct.img ? (
                    <Image source={{ uri: stockProduct.img }} style={styles.stockProductThumb as any} />
                  ) : (
                    <View style={styles.stockProductPlaceholder}>
                      <Package size={22} color="#1B7A4E" />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.stockProductName} numberOfLines={1}>
                      {stockProduct.name}
                    </Text>
                    <Text style={styles.stockProductPrice}>{rp(stockProduct.price)}</Text>
                    <Text style={styles.stockCurrentText}>
                      Stok saat ini:{" "}
                      <Text style={{ fontWeight: "800", color: "#1B7A4E" }}>
                        {stockProduct.stock}
                      </Text>
                    </Text>
                  </View>
                </View>

                {/* Stock Stepper Input */}
                <Text style={styles.inputSectionLabel}>Jumlah Stok Baru</Text>
                <View style={styles.stepperContainer}>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => {
                      const cur = parseInt(stockValue, 10) || 0;
                      setStockValue(String(Math.max(0, cur - 1)));
                    }}
                  >
                    <Minus size={18} color="#111827" />
                  </TouchableOpacity>

                  <TextInput
                    style={styles.stepperInput}
                    keyboardType="number-pad"
                    value={stockValue}
                    onChangeText={(val) => setStockValue(val.replace(/[^0-9]/g, ""))}
                    selectTextOnFocus
                  />

                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => {
                      const cur = parseInt(stockValue, 10) || 0;
                      setStockValue(String(cur + 1));
                    }}
                  >
                    <Plus size={18} color="#111827" />
                  </TouchableOpacity>
                </View>

                {/* Quick Stock Presets */}
                <Text style={styles.inputSectionLabel}>Preset Tambah Cepat</Text>
                <View style={styles.presetsRow}>
                  <TouchableOpacity
                    style={[styles.presetPill, { borderColor: "#FECACA", backgroundColor: "#FEF2F2" }]}
                    onPress={() => setStockValue("0")}
                  >
                    <Text style={[styles.presetPillText, { color: "#DC2626" }]}>Habis (0)</Text>
                  </TouchableOpacity>

                  {[5, 10, 20, 50, 100].map((addAmount) => (
                    <TouchableOpacity
                      key={addAmount}
                      style={styles.presetPill}
                      onPress={() => {
                        const cur = parseInt(stockValue, 10) || 0;
                        setStockValue(String(cur + addAmount));
                      }}
                    >
                      <Text style={styles.presetPillText}>+{addAmount}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Active Toggle Switch */}
                <View style={styles.switchRowContainer}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.switchTitle}>Status Penjualan</Text>
                    <Text style={styles.switchDesc}>
                      {stockIsActive
                        ? "Produk aktif dan dapat dipesan pelanggan"
                        : "Produk dinonaktifkan sementara dari etalase"}
                    </Text>
                  </View>
                  <Switch
                    value={stockIsActive}
                    onValueChange={setStockIsActive}
                    trackColor={{ false: "#D1D5DB", true: "#A7F3D0" }}
                    thumbColor={stockIsActive ? "#1B7A4E" : "#9CA3AF"}
                  />
                </View>

                {/* Actions */}
                <View style={styles.modalActionButtonsRow}>
                  <TouchableOpacity
                    style={styles.cancelBtnModal}
                    onPress={() => setStockModalVisible(false)}
                    disabled={stockSaving}
                  >
                    <Text style={styles.cancelBtnModalText}>Batal</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.saveBtnModal, stockSaving && { opacity: 0.7 }]}
                    onPress={handleSaveStock}
                    disabled={stockSaving}
                  >
                    {stockSaving ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Check size={16} color="#FFFFFF" />
                        <Text style={styles.saveBtnModalText}>Simpan Stok</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* 3. Modal Atur Foto Produk (CRUD Foto) */}
      <Modal
        visible={photoModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPhotoModalVisible(false)}
      >
        <View style={styles.modalBgBottom}>
          <View style={styles.quickModalSheet}>
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Kelola Foto Produk</Text>
                <Text style={styles.sheetSubtitle}>
                  Atur foto sampul utama & galeri ({photoImages.length}/6 foto)
                </Text>
              </View>
              <TouchableOpacity onPress={() => setPhotoModalVisible(false)}>
                <X size={20} color="#111827" />
              </TouchableOpacity>
            </View>

            {photoProduct && (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 500 }}>
                {/* Primary Photo Hero Preview */}
                <Text style={styles.inputSectionLabel}>Foto Utama (Tampil di Etalase)</Text>
                <View style={styles.primaryPhotoContainer}>
                  {primaryPhoto ? (
                    <Image source={{ uri: primaryPhoto }} style={styles.primaryPhotoHero as any} />
                  ) : photoImages.length > 0 ? (
                    <Image source={{ uri: photoImages[0] }} style={styles.primaryPhotoHero as any} />
                  ) : (
                    <View style={styles.primaryPhotoHeroPlaceholder}>
                      <ImageIcon size={36} color="#9CA3AF" />
                      <Text style={{ fontSize: 12, color: "#6B7280", marginTop: 6 }}>
                        Belum ada foto produk
                      </Text>
                    </View>
                  )}
                  <View style={styles.primaryPhotoHeroBadge}>
                    <Text style={styles.primaryPhotoHeroBadgeText}>Foto Sampul Utama</Text>
                  </View>
                </View>

                {/* Gallery List */}
                <View style={styles.galleryHeaderRow}>
                  <Text style={styles.inputSectionLabel}>Daftar Foto Produk</Text>
                  <Text style={styles.galleryHintText}>Ketuk foto untuk dijadikan utama</Text>
                </View>

                {photoImages.length === 0 ? (
                  <View style={styles.emptyPhotoBox}>
                    <Text style={styles.emptyPhotoText}>
                      Produk ini belum memiliki foto. Tambahkan foto dari kamera atau galeri di bawah.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.photoGridList}>
                    {photoImages.map((uri, idx) => {
                      const isCover = uri === primaryPhoto || (!primaryPhoto && idx === 0);
                      return (
                        <View key={`${uri}_${idx}`} style={styles.photoThumbnailItem}>
                          <TouchableOpacity
                            onPress={() => handleSetPrimaryPhoto(uri)}
                            activeOpacity={0.8}
                          >
                            <Image
                              source={{ uri }}
                              style={[
                                styles.photoThumbnailImg as any,
                                isCover && styles.photoThumbnailImgActive,
                              ]}
                            />
                            {isCover && (
                              <View style={styles.photoCoverBadge}>
                                <Check size={10} color="#FFFFFF" />
                                <Text style={styles.photoCoverBadgeText}>Utama</Text>
                              </View>
                            )}
                          </TouchableOpacity>

                          {/* Delete Photo Button */}
                          <TouchableOpacity
                            style={styles.deletePhotoBtn}
                            onPress={() => handleRemovePhoto(idx)}
                          >
                            <Trash2 size={12} color="#DC2626" />
                          </TouchableOpacity>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* Upload Buttons */}
                <Text style={[styles.inputSectionLabel, { marginTop: 14 }]}>Tambah Foto Baru</Text>
                {photoUploading ? (
                  <View style={styles.uploadingBox}>
                    <ActivityIndicator size="small" color="#1B7A4E" />
                    <Text style={styles.uploadingText}>Mengunggah foto ke Cloudinary...</Text>
                  </View>
                ) : (
                  <View style={styles.uploadButtonsGrid}>
                    <TouchableOpacity
                      style={styles.uploadOptionBtn}
                      onPress={handlePickPhotoFromGallery}
                      activeOpacity={0.8}
                      disabled={photoImages.length >= 6}
                    >
                      <ImageIcon size={18} color="#1B7A4E" />
                      <Text style={styles.uploadOptionText}>Pilih dari Galeri</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.uploadOptionBtn, { borderColor: "#0284C7" }]}
                      onPress={handleTakePhotoForProduct}
                      activeOpacity={0.8}
                      disabled={photoImages.length >= 6}
                    >
                      <Camera size={18} color="#0284C7" />
                      <Text style={[styles.uploadOptionText, { color: "#0284C7" }]}>Ambil Kamera</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {/* Save Photos Buttons */}
                <View style={styles.modalActionButtonsRow}>
                  <TouchableOpacity
                    style={styles.cancelBtnModal}
                    onPress={() => setPhotoModalVisible(false)}
                    disabled={photoSaving || photoUploading}
                  >
                    <Text style={styles.cancelBtnModalText}>Batal</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.saveBtnModal, (photoSaving || photoUploading) && { opacity: 0.7 }]}
                    onPress={handleSavePhotos}
                    disabled={photoSaving || photoUploading}
                  >
                    {photoSaving ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Check size={16} color="#FFFFFF" />
                        <Text style={styles.saveBtnModalText}>Simpan Foto</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* 4. Modal Menu Kelola Produk (CRUD Lengkap Titik Tiga) */}
      <Modal
        visible={actionMenuVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setActionMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalBgBottom}
          activeOpacity={1}
          onPress={() => setActionMenuVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.actionMenuSheet}
            onPress={(e) => e.stopPropagation()}
          >
            {actionMenuProduct && (
              <>
                <View style={styles.actionMenuHeader}>
                  <View style={styles.actionProductCard}>
                    {actionMenuProduct.img ? (
                      <Image
                        source={{ uri: actionMenuProduct.img }}
                        style={styles.actionProductThumb as any}
                      />
                    ) : (
                      <View style={styles.actionProductPlaceholder}>
                        <Package size={22} color="#1B7A4E" />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={styles.actionProductCat}>
                          {actionMenuProduct.cat || "UMKM"}
                        </Text>
                        <View
                          style={[
                            styles.statusBadge,
                            {
                              backgroundColor: !actionMenuProduct.isActive || actionMenuProduct.stock === 0
                                ? "#FEE2E2"
                                : actionMenuProduct.stock <= 5
                                ? "#FEF3C7"
                                : "#E8F5EE",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgeText,
                              {
                                color: !actionMenuProduct.isActive || actionMenuProduct.stock === 0
                                  ? "#DC2626"
                                  : actionMenuProduct.stock <= 5
                                  ? "#B45309"
                                  : "#1B7A4E",
                              },
                            ]}
                          >
                            {!actionMenuProduct.isActive
                              ? "Nonaktif"
                              : actionMenuProduct.stock === 0
                              ? "Habis"
                              : actionMenuProduct.stock <= 5
                              ? "Menipis"
                              : "Tersedia"}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.actionProductName} numberOfLines={1}>
                        {actionMenuProduct.name}
                      </Text>
                      <Text style={styles.actionProductPrice}>
                        {rp(actionMenuProduct.price)} •{" "}
                        <Text style={{ color: "#6B7280", fontWeight: "600" }}>
                          Stok: {actionMenuProduct.stock}
                        </Text>
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.actionCloseBtn}
                      onPress={() => setActionMenuVisible(false)}
                    >
                      <X size={18} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* List of CRUD Options */}
                <View style={styles.actionOptionsList}>
                  {/* 1. Edit Full Form */}
                  <TouchableOpacity
                    style={styles.actionOptionRow}
                    onPress={() => {
                      const prod = actionMenuProduct;
                      setActionMenuVisible(false);
                      handleOpenProductForm(prod);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.actionOptionIconBg, { backgroundColor: "#ECFDF5" }]}>
                      <Edit3 size={18} color="#059669" />
                    </View>
                    <View style={styles.actionOptionTextCol}>
                      <Text style={styles.actionOptionTitle}>Edit Detail Produk</Text>
                      <Text style={styles.actionOptionDesc}>
                        Ubah nama, harga, kategori, deskripsi & semua data produk
                      </Text>
                    </View>
                    <ChevronRight size={18} color="#9CA3AF" />
                  </TouchableOpacity>

                  {/* 2. Quick Stock Management */}
                  <TouchableOpacity
                    style={styles.actionOptionRow}
                    onPress={() => {
                      const prod = actionMenuProduct;
                      setActionMenuVisible(false);
                      handleOpenStockModal(prod);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.actionOptionIconBg, { backgroundColor: "#EFF6FF" }]}>
                      <Package size={18} color="#2563EB" />
                    </View>
                    <View style={styles.actionOptionTextCol}>
                      <Text style={styles.actionOptionTitle}>Atur Jumlah Stok</Text>
                      <Text style={styles.actionOptionDesc}>
                        Tambah/kurang stok cepat, gunakan preset, atau atur stok 0
                      </Text>
                    </View>
                    <ChevronRight size={18} color="#9CA3AF" />
                  </TouchableOpacity>

                  {/* 3. Manage Photos */}
                  <TouchableOpacity
                    style={styles.actionOptionRow}
                    onPress={() => {
                      const prod = actionMenuProduct;
                      setActionMenuVisible(false);
                      handleOpenPhotoModal(prod);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.actionOptionIconBg, { backgroundColor: "#F5F3FF" }]}>
                      <Camera size={18} color="#7C3AED" />
                    </View>
                    <View style={styles.actionOptionTextCol}>
                      <Text style={styles.actionOptionTitle}>Kelola Foto Produk</Text>
                      <Text style={styles.actionOptionDesc}>
                        Ganti foto sampul utama atau upload foto galeri baru
                      </Text>
                    </View>
                    <ChevronRight size={18} color="#9CA3AF" />
                  </TouchableOpacity>

                  {/* 4. Toggle Active/Inactive */}
                  <TouchableOpacity
                    style={styles.actionOptionRow}
                    onPress={() => {
                      const prod = actionMenuProduct;
                      setActionMenuVisible(false);
                      void handleToggleProductActive(prod);
                    }}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.actionOptionIconBg,
                        {
                          backgroundColor: actionMenuProduct.isActive ? "#FEF3C7" : "#DCFCE7",
                        },
                      ]}
                    >
                      <Check
                        size={18}
                        color={actionMenuProduct.isActive ? "#D97706" : "#16A34A"}
                      />
                    </View>
                    <View style={styles.actionOptionTextCol}>
                      <Text style={styles.actionOptionTitle}>
                        {actionMenuProduct.isActive ? "Nonaktifkan Produk" : "Aktifkan Produk"}
                      </Text>
                      <Text style={styles.actionOptionDesc}>
                        {actionMenuProduct.isActive
                          ? "Sembunyikan sementara dari etalase pelanggan"
                          : "Tampilkan kembali di etalase belanja pelanggan"}
                      </Text>
                    </View>
                    <ChevronRight size={18} color="#9CA3AF" />
                  </TouchableOpacity>

                  {/* 5. Delete Product */}
                  <TouchableOpacity
                    style={[styles.actionOptionRow, styles.actionOptionRowDelete]}
                    onPress={() => {
                      const prod = actionMenuProduct;
                      setActionMenuVisible(false);
                      handleDeleteProduct(prod.id);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.actionOptionIconBg, { backgroundColor: "#FEE2E2" }]}>
                      <Trash2 size={18} color="#DC2626" />
                    </View>
                    <View style={styles.actionOptionTextCol}>
                      <Text style={[styles.actionOptionTitle, { color: "#DC2626" }]}>
                        Hapus Produk
                      </Text>
                      <Text style={styles.actionOptionDesc}>
                        Hapus produk secara permanen dari katalog toko
                      </Text>
                    </View>
                    <ChevronRight size={18} color="#DC2626" />
                  </TouchableOpacity>
                </View>

                {/* Cancel Button */}
                <TouchableOpacity
                  style={styles.actionCancelBtn}
                  onPress={() => setActionMenuVisible(false)}
                >
                  <Text style={styles.actionCancelBtnText}>Tutup</Text>
                </TouchableOpacity>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* 5. Custom In-App Toast & Confirmation Dialog (Zero Browser Native Popups!) */}
      <ToastBanner
        visible={toastConfig.visible}
        type={toastConfig.type}
        title={toastConfig.title}
        message={toastConfig.message}
        onClose={() => setToastConfig((prev) => ({ ...prev, visible: false }))}
      />

      <ConfirmDialog
        visible={confirmDialogConfig.visible}
        title={confirmDialogConfig.title}
        message={confirmDialogConfig.message}
        type={confirmDialogConfig.type}
        confirmText={confirmDialogConfig.confirmText}
        cancelText={confirmDialogConfig.cancelText}
        onConfirm={confirmDialogConfig.onConfirm}
        onCancel={() => setConfirmDialogConfig((prev) => ({ ...prev, visible: false }))}
      />
    </ResponsiveSafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7FAF8",
  },
  tabContentContainer: {
    flex: 1,
  },
  bottomNavContainer: {
    height: 72,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingBottom: 6,
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    height: "100%",
  },
  navIconBg: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  navIconBgActive: {
    backgroundColor: "rgba(27, 122, 78, 0.12)",
  },
  navLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "#9CA3AF",
    marginTop: 3,
  },
  navLabelActive: {
    color: "#1B7A4E",
    fontWeight: "800",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 28,
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  headerTitleContainer: {
    flex: 1,
    paddingRight: 10,
  },
  greetingText: {
    fontSize: 23,
    fontWeight: "800",
    color: "#111827",
  },
  subGreetingText: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  notifBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    position: "relative",
  },
  notifBadge: {
    position: "absolute",
    right: 8,
    top: 8,
    backgroundColor: "#B91C1C",
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  notifBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },
  outletCard: {
    borderRadius: 24,
    backgroundColor: "#1B7A4E",
    padding: 20,
    marginBottom: 22,
  },
  outletHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  outletStatusLabel: {
    color: "#DCFCE7",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  storeNameText: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 4,
  },
  outletToggleBtn: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  outletToggleBtnText: {
    color: "#1B7A4E",
    fontSize: 11,
    fontWeight: "800",
  },
  outletStatusDesc: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 13,
    marginBottom: 16,
  },
  outletMetricsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    borderTopWidth: 1,
    borderTopColor: "rgba(255, 255, 255, 0.15)",
    paddingTop: 14,
  },
  metricItem: {
    alignItems: "center",
  },
  metricLabel: {
    color: "#E8F5EE",
    fontSize: 11,
  },
  metricVal: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    marginTop: 4,
  },
  metricDivider: {
    width: 1,
    height: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginTop: 14,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 3,
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 22,
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    width: "48%",
    aspectRatio: 1.62,
    justifyContent: "center",
    gap: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  summaryLabel: {
    fontSize: 11,
    color: "#6B7280",
  },
  quickActionsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 22,
  },
  quickActionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 13,
    paddingHorizontal: 4,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  quickActionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  attentionContainer: {
    backgroundColor: "#FFF9E6",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#FDE68A",
    padding: 16,
    gap: 12,
    marginBottom: 22,
  },
  attentionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  attentionInfo: {
    flex: 1,
  },
  attentionName: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  attentionMsg: {
    fontSize: 11,
    color: "#6B7280",
  },
  attentionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  attentionBtnText: {
    color: "#B45309",
    fontSize: 12,
    fontWeight: "700",
  },
  menuHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
  },
  toggleAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "#E8F5EE",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  toggleAllBtnText: {
    color: "#1B7A4E",
    fontSize: 12,
    fontWeight: "700",
  },
  addMenuBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1B7A4E",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  addMenuBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  productList: {
    gap: 12,
    marginBottom: 22,
  },
  productCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  productImg: {
    width: 68,
    height: 68,
    borderRadius: 12,
  },
  productImgPlaceholder: {
    width: 68,
    height: 68,
    borderRadius: 12,
    backgroundColor: "rgba(27, 122, 78, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  productInfo: {
    flex: 1,
    marginLeft: 12,
    gap: 4,
  },
  productName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  productPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1B7A4E",
  },
  productStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  productStock: {
    fontSize: 12,
    color: "#6B7280",
  },
  multiPhotoBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  multiPhotoText: {
    fontSize: 10,
    color: "#4B5563",
    fontWeight: "600",
  },
  moreBtn: {
    padding: 6,
  },
  emptyProductsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyProductsTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  emptyProductsDesc: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
  },
  bestSellersContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 14,
    gap: 12,
    marginBottom: 22,
  },
  emptySellers: {
    padding: 10,
    alignItems: "center",
  },
  emptySellersText: {
    fontSize: 12,
    color: "#6B7280",
  },
  sellerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sellerRank: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(27, 122, 78, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  sellerRankText: {
    color: "#1B7A4E",
    fontWeight: "800",
    fontSize: 12,
  },
  sellerName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  sellerSoldText: {
    fontSize: 12,
    color: "#6B7280",
  },
  emptyReviews: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 22,
  },
  emptyReviewsText: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
  },
  insightCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    marginBottom: 22,
  },
  insightText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    lineHeight: 18,
  },
  // Modal Bottom sheets styles
  modalBgBottom: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 24,
    maxHeight: "90%",
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingBottom: 12,
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  sheetBtnClose: {
    backgroundColor: "#1B7A4E",
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  sheetBtnCloseText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  // Notif panel styles
  notifList: {
    gap: 12,
  },
  notifItemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  notifIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(27, 122, 78, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  notifBody: {
    flex: 1,
    gap: 2,
  },
  notifRowTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  notifRowDesc: {
    fontSize: 11,
    color: "#6B7280",
  },
  notifTime: {
    fontSize: 10,
    color: "#9CA3AF",
  },
  // Form add product styles
  formContainer: {
    maxHeight: 420,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4B5563",
    marginBottom: 6,
    marginTop: 10,
  },
  textInput: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: "#111827",
    marginBottom: 10,
  },
  textArea: {
    textAlignVertical: "top",
    minHeight: 64,
  },
  categoriesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  catBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  catBtnSelected: {
    backgroundColor: "#E8F5EE",
    borderColor: "#1B7A4E",
  },
  catBtnUnselected: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E7EB",
  },
  catBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  catBtnTextSelected: {
    color: "#1B7A4E",
  },
  catBtnTextUnselected: {
    color: "#374151",
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
    marginBottom: 12,
  },
  switchTextCol: {
    flex: 1,
    paddingRight: 10,
    gap: 2,
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  switchSub: {
    fontSize: 11,
    color: "#6B7280",
  },
  sheetActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
    marginBottom: 20,
  },
  sheetBtn: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetBtnOutline: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  sheetBtnSolid: {
    backgroundColor: "#1B7A4E",
  },
  sheetBtnTextOutline: {
    color: "#4B5563",
    fontSize: 14,
    fontWeight: "700",
  },
  sheetBtnTextSolid: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  imagePreviewWrapper: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 10,
    marginBottom: 12,
    alignItems: "center",
  },
  imagePreview: {
    width: "100%",
    height: 150,
    borderRadius: 12,
    backgroundColor: "#E2E8F0",
  },
  imagePreviewActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
    alignItems: "center",
    width: "100%",
    justifyContent: "space-between",
  },
  changeImageBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#E8F5EE",
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  changeImageText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1B7A4E",
  },
  removeImageBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  uploadOptionsCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    borderStyle: "dashed",
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  uploadPrompt: {
    alignItems: "center",
    marginBottom: 12,
  },
  uploadIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E8F5EE",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  uploadPromptTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1E293B",
  },
  uploadPromptSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
    textAlign: "center",
  },
  uploadButtonsRow: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
  },
  pickGalleryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#1B7A4E",
    paddingVertical: 10,
    borderRadius: 12,
  },
  pickGalleryBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  pickCameraBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#1B7A4E",
    paddingVertical: 10,
    borderRadius: 12,
  },
  pickCameraBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1B7A4E",
  },
  urlInputHint: {
    fontSize: 11,
    color: "#64748B",
    marginBottom: 4,
  },
  urlInput: {
    fontSize: 12,
    paddingVertical: 8,
    marginBottom: 12,
  },
  // View mode switcher
  viewToggleWrap: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  viewToggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewToggleBtnActive: {
    backgroundColor: "#1B7A4E",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },

  // Search & Filter Bar
  filterSectionContainer: {
    marginTop: 10,
    marginBottom: 14,
    gap: 10,
  },
  searchBarContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === "ios" ? 10 : 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#111827",
    paddingVertical: 0,
  },
  filterPillsScroll: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 2,
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: 6,
  },
  filterPillActive: {
    backgroundColor: "#111827",
    borderColor: "#111827",
  },
  filterPillActiveReady: {
    backgroundColor: "#E8F5EE",
    borderColor: "#86EFAC",
  },
  filterPillActiveLow: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FCD34D",
  },
  filterPillActiveOut: {
    backgroundColor: "#FEE2E2",
    borderColor: "#FCA5A5",
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5563",
  },
  filterPillTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  filterPillTextActiveReady: {
    color: "#15803D",
    fontWeight: "700",
  },
  filterPillTextActiveLow: {
    color: "#B45309",
    fontWeight: "700",
  },
  filterPillTextActiveOut: {
    color: "#DC2626",
    fontWeight: "700",
  },
  filterDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  resetFilterBtn: {
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#E8F5EE",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  resetFilterBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1B7A4E",
  },

  // Grid Layout
  productGridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 20,
  },
  gridCard: {
    width: "48.2%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  gridImageWrap: {
    width: "100%",
    height: 120,
    position: "relative",
    backgroundColor: "#F3F4F6",
  },
  gridImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  gridImagePlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F5EE",
  },
  gridStatusBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  gridStatusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  gridPhotoCountBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  gridPhotoCountText: {
    fontSize: 9,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  gridBody: {
    padding: 10,
    flex: 1,
  },
  gridCategoryText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#1B7A4E",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  gridProductName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
    lineHeight: 17,
    minHeight: 34,
  },
  gridPriceText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1B7A4E",
    marginTop: 4,
  },
  gridStockRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  gridStockText: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
  },
  gridActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 4,
    backgroundColor: "#FAFAFA",
  },
  gridActionStockBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: "#E8F5EE",
  },
  gridActionStockText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1B7A4E",
  },
  gridActionPhotoBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: "#F0F9FF",
  },
  gridActionPhotoText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0284C7",
  },
  gridActionMoreBtn: {
    padding: 5,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },

  // List View specific tokens
  listPhotoCountBadge: {
    position: "absolute",
    bottom: 2,
    right: 2,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  listPhotoCountText: {
    fontSize: 9,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  productCatTag: {
    fontSize: 10,
    fontWeight: "700",
    color: "#1B7A4E",
    textTransform: "uppercase",
  },
  listStockQuickRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  listQuickStockBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#E8F5EE",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  listQuickBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1B7A4E",
  },
  listQuickPhotoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#F0F9FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  listQuickPhotoText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0284C7",
  },
  toggleShowAllBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 20,
  },
  toggleShowAllBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1B7A4E",
  },

  // Quick Modal Bottom Sheet Styles
  quickModalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
    maxHeight: "92%",
  },
  sheetSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  stockProductCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 16,
  },
  stockProductThumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: "#E5E7EB",
  },
  stockProductPlaceholder: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: "#E8F5EE",
    alignItems: "center",
    justifyContent: "center",
  },
  stockProductName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  stockProductPrice: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1B7A4E",
    marginTop: 2,
  },
  stockCurrentText: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  inputSectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
  },
  stepperContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    padding: 4,
    marginBottom: 16,
    gap: 12,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  stepperInput: {
    flex: 1,
    textAlign: "center",
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    paddingVertical: 4,
  },
  presetsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  presetPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  presetPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  switchRowContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 20,
    gap: 12,
  },
  switchTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  switchDesc: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  modalActionButtonsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
    marginBottom: 8,
  },
  cancelBtnModal: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  cancelBtnModalText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4B5563",
  },
  saveBtnModal: {
    flex: 2,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#1B7A4E",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  saveBtnModalText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Photo modal specific styles
  primaryPhotoContainer: {
    width: "100%",
    height: 180,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
    position: "relative",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 14,
  },
  primaryPhotoHero: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  primaryPhotoHeroPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F9FAFB",
  },
  primaryPhotoHeroBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "#1B7A4E",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  primaryPhotoHeroBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  galleryHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  galleryHintText: {
    fontSize: 11,
    color: "#6B7280",
  },
  emptyPhotoBox: {
    padding: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 12,
  },
  emptyPhotoText: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 18,
  },
  photoGridList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  photoThumbnailItem: {
    width: 68,
    height: 68,
    position: "relative",
  },
  photoThumbnailImg: {
    width: 68,
    height: 68,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  photoThumbnailImgActive: {
    borderColor: "#1B7A4E",
    borderWidth: 2.5,
  },
  photoCoverBadge: {
    position: "absolute",
    bottom: 2,
    left: 2,
    right: 2,
    backgroundColor: "#1B7A4E",
    borderRadius: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 1,
    gap: 2,
  },
  photoCoverBadgeText: {
    fontSize: 8,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  deletePhotoBtn: {
    position: "absolute",
    top: -5,
    right: -5,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  uploadingBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
    backgroundColor: "#E8F5EE",
    borderRadius: 12,
    marginBottom: 14,
  },
  uploadingText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1B7A4E",
  },
  uploadButtonsGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  uploadOptionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#1B7A4E",
  },
  uploadOptionText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1B7A4E",
  },
  // Action Menu Bottom Sheet (Titik Tiga CRUD)
  actionMenuSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
    maxHeight: "92%",
  },
  actionMenuHeader: {
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingBottom: 14,
    marginBottom: 12,
  },
  actionProductCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  actionProductThumb: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
  },
  actionProductPlaceholder: {
    width: 54,
    height: 54,
    borderRadius: 12,
    backgroundColor: "#E8F5EE",
    alignItems: "center",
    justifyContent: "center",
  },
  actionProductCat: {
    fontSize: 10,
    fontWeight: "800",
    color: "#1B7A4E",
    textTransform: "uppercase",
  },
  actionProductName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
    marginTop: 2,
  },
  actionProductPrice: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1B7A4E",
    marginTop: 2,
  },
  actionCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  actionOptionsList: {
    gap: 8,
  },
  actionOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: "#FAFAFA",
    borderWidth: 1,
    borderColor: "#F3F4F6",
    gap: 12,
  },
  actionOptionRowDelete: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FEE2E2",
  },
  actionOptionIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionOptionTextCol: {
    flex: 1,
  },
  actionOptionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  actionOptionDesc: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  actionCancelBtn: {
    marginTop: 14,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  actionCancelBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4B5563",
  },
});

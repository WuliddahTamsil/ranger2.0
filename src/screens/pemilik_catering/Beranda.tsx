import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import React, { useEffect, useState } from "react";
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
  Edit3,
  Minus,
  Search,
  LayoutGrid,
  List as ListIcon,
  Check,
  Eye,
  EyeOff,
  Package,
  SlidersHorizontal,
  Star,
} from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { rp } from "../../utils/formatters";
import { Nav } from "../../types";
import { AuthAccount } from "../auth/authTypes";
import { RoleHeader } from "../../components/RoleHeader";
import {
  getCateringProductsForOwner,
  createCateringProduct,
  updateCateringProduct,
  deleteCateringProduct,
  updateCateringStatus,
  getCateringOrdersForOwner,
  getDrivers,
  assignCateringDriver,
} from "../../services/api";
import { updateCachedAccount } from "../auth/authService";

// Import other screens
import { Order, OrderData } from "./Order";
import { Riwayat } from "./Riwayat";
import { Pendapatan } from "./Pendapatan";
import { Profile } from "./Profile";
import { FullPageProductForm, ProductFormData } from "../../components/FullPageProductForm";

const DEFAULT_CATERING_IMG =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&h=600&fit=crop&q=80";

const FoodImage: React.FC<{ uri?: string; style?: any }> = ({ uri, style }) => {
  const [hasError, setHasError] = useState(false);
  const isValid = Boolean(
    uri &&
      typeof uri === "string" &&
      uri.trim().length > 0 &&
      !uri.startsWith("blob:")
  );

  if (!isValid || hasError) {
    return (
      <Image
        source={{ uri: DEFAULT_CATERING_IMG }}
        style={style}
        resizeMode="cover"
      />
    );
  }

  return (
    <Image
      source={{ uri }}
      style={style}
      resizeMode="cover"
      onError={() => setHasError(true)}
    />
  );
};

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

interface CateringHomeProps extends Nav {
  authAccount?: AuthAccount | null;
  onUpdateAccount?: (account: AuthAccount) => void;
}

const resolveCateringPaymentFlag = (explicitValue: unknown, fallback: boolean) => {
  if (typeof explicitValue === "boolean") return explicitValue;
  if (typeof explicitValue === "string") {
    const normalized = explicitValue.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return fallback;
};

export const Beranda: React.FC<CateringHomeProps> = ({ navigate, authAccount, onUpdateAccount }) => {
  const [currentTab, setCurrentTab] = useState<number>(0);

  const showAlert = (title: string, message: string) => {
    if (Platform.OS === "web") {
      alert(`${title}: ${message}`);
    } else {
      Alert.alert(title, message);
    }
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    if (Platform.OS === "web") {
      const confirmed = window.confirm(`${title}\n\n${message}`);
      if (confirmed) onConfirm();
    } else {
      Alert.alert(title, message, [
        { text: "Batal", style: "cancel" },
        { text: "Ya", onPress: onConfirm },
      ]);
    }
  };

  // 1. Global Store Info State
  const [storeInfo, setStoreInfo] = useState(() => {
    const hasBankTransferDetails = Boolean(authAccount?.roleData.cateringBankName && authAccount?.roleData.cateringBankAccountNumber && authAccount?.roleData.cateringBankAccountHolder);
    const hasQrisImage = Boolean(authAccount?.roleData.cateringQrisImageUrl);

    return {
      ownerName: authAccount?.name || "",
      storeName: authAccount?.roleData.businessName || "Nama catering belum diatur",
      phone: authAccount?.phone || "",
      email: authAccount?.email || "",
      address: authAccount?.roleData.businessAddress || authAccount?.address || "",
      description: "Menyediakan layanan catering prasmanan dan nasi box tumpeng berkualitas di Kamojang.",
      isOpen: authAccount?.roleData.isDapurOpen === "true",
      isVerified: true,
      profileImage: authAccount?.profilePhoto || null,
      bankName: authAccount?.roleData.cateringBankName || "",
      bankAccountNumber: authAccount?.roleData.cateringBankAccountNumber || "",
      bankAccountHolder: authAccount?.roleData.cateringBankAccountHolder || "",
      qrisImageUrl: authAccount?.roleData.cateringQrisImageUrl || "",
      bankTransferEnabled: resolveCateringPaymentFlag(authAccount?.roleData.cateringBankTransferEnabled, hasBankTransferDetails),
      qrisEnabled: resolveCateringPaymentFlag(authAccount?.roleData.cateringQrisEnabled, hasQrisImage),
      street: authAccount?.roleData.cateringStreet || "",
      city: authAccount?.roleData.cateringCity || "",
      district: authAccount?.roleData.cateringDistrict || "",
      province: authAccount?.roleData.cateringProvince || "",
      postalCode: authAccount?.roleData.cateringPostalCode || "",
      notes: authAccount?.roleData.cateringNotes || "",
      latitude: authAccount?.roleData.cateringLatitude ? Number(authAccount.roleData.cateringLatitude) : undefined,
      longitude: authAccount?.roleData.cateringLongitude ? Number(authAccount.roleData.cateringLongitude) : undefined,
      gmapsUrl: authAccount?.roleData.cateringGmapsUrl || "",
    };
  });

  useEffect(() => {
    if (!authAccount) return;
    const hasBankTransferDetails = Boolean(authAccount.roleData.cateringBankName && authAccount.roleData.cateringBankAccountNumber && authAccount.roleData.cateringBankAccountHolder);
    const hasQrisImage = Boolean(authAccount.roleData.cateringQrisImageUrl);

    setStoreInfo((current) => ({
      ...current,
      ownerName: authAccount.name,
      phone: authAccount.phone,
      email: authAccount.email,
      storeName: authAccount.roleData.businessName || current.storeName,
      address: authAccount.roleData.businessAddress || authAccount.address,
      description: authAccount.roleData.menuSpecialty || current.description,
      isOpen: authAccount.roleData.isDapurOpen === "true",
      profileImage: authAccount.profilePhoto || null,
      bankName: authAccount.roleData.cateringBankName || current.bankName,
      bankAccountNumber: authAccount.roleData.cateringBankAccountNumber || current.bankAccountNumber,
      bankAccountHolder: authAccount.roleData.cateringBankAccountHolder || current.bankAccountHolder,
      qrisImageUrl: authAccount.roleData.cateringQrisImageUrl || current.qrisImageUrl,
      bankTransferEnabled: resolveCateringPaymentFlag(authAccount.roleData.cateringBankTransferEnabled, hasBankTransferDetails),
      qrisEnabled: resolveCateringPaymentFlag(authAccount.roleData.cateringQrisEnabled, hasQrisImage),
      street: authAccount.roleData.cateringStreet || current.street || "",
      city: authAccount.roleData.cateringCity || current.city || "",
      district: authAccount.roleData.cateringDistrict || current.district || "",
      province: authAccount.roleData.cateringProvince || current.province || "",
      postalCode: authAccount.roleData.cateringPostalCode || current.postalCode || "",
      notes: authAccount.roleData.cateringNotes || current.notes || "",
      latitude: authAccount.roleData.cateringLatitude ? Number(authAccount.roleData.cateringLatitude) : current.latitude,
      longitude: authAccount.roleData.cateringLongitude ? Number(authAccount.roleData.cateringLongitude) : current.longitude,
      gmapsUrl: authAccount.roleData.cateringGmapsUrl || current.gmapsUrl || "",
    }));
  }, [authAccount]);

  // 2. Global Products State
  const [products, setProducts] = useState<ProductItem[]>([]);

  useEffect(() => {
    if (!authAccount) return;
    const fetchProducts = async () => {
      const result = await getCateringProductsForOwner(authAccount.id);
      if (result.success && result.data) {
        const mapped = result.data.map((p: any) => ({
          id: p._id,
          name: p.name,
          store: storeInfo.storeName,
          price: p.price,
          rating: p.rating || 4.8,
          sold: p.sold || 0,
          img: p.img,
          images: Array.isArray(p.images) && p.images.length > 0 ? p.images : (p.img ? [p.img] : []),
          cat: p.cat,
          description: p.description,
          stock: p.stock,
          isActive: p.isActive,
        }));
        setProducts(mapped);
      }
    };
    void fetchProducts();
  }, [authAccount, storeInfo.storeName]);

  // 3. Global Orders State
  const [orders, setOrders] = useState<OrderData[]>([]);
  const [ordersLoadError, setOrdersLoadError] = useState("");
  const [ordersReloadKey, setOrdersReloadKey] = useState(0);
  const [drivers, setDrivers] = useState<{ id: string; name: string; phone: string; vehicleType?: string; plateNumber?: string }[]>([]);

  useEffect(() => {
    void getDrivers().then((result) => {
      if (result.success && Array.isArray(result.data)) {
        setDrivers(result.data.map((driver: any) => ({
          id: driver._id,
          name: driver.name,
          phone: driver.phone || "",
          vehicleType: driver.roleData?.vehicleType || "Motor",
          plateNumber: driver.roleData?.plateNumber || "",
        })));
      }
    });
  }, []);

  useEffect(() => {
    if (!authAccount?.id) {
      setOrders([]);
      setOrdersLoadError("");
      return;
    }
    let active = true;
    const fetchOrders = async () => {
      try {
        const result = await getCateringOrdersForOwner(authAccount.id);
        if (!active) return;
        if (!result.success || !Array.isArray(result.data)) {
          setOrdersLoadError(result.message || "Pesanan Catering belum berhasil dimuat. Coba lagi.");
          return;
        }
        setOrdersLoadError("");
        const mapped = result.data.map((o: any) => {
          const frontendStatus = o.status || "Menunggu";

          const hasDriver = Boolean(o.driverId || o.driverName);
          return {
            id: o._id,
            orderCode: o.orderCode || `RNG-CAT-${String(o._id).slice(-8).toUpperCase()}`,
            customer: o.customerName,
            customerPhone: o.customerPhone,
            items: [{ name: o.menuName, quantity: o.portions, price: o.price }],
            total: o.totalAmount,
            subtotal: o.totalAmount - (o.deliveryFee || 0) - (o.serviceFee || 0),
            deliveryFee: o.deliveryFee || 0,
            paymentMethod: o.paymentMethod,
            paymentStatus: o.paymentStatus,
            paymentOption: o.paymentOption,
            paidAmount: o.paidAmount,
            remainingAmount: o.remainingAmount,
            paymentBankName: o.paymentBankName,
            paymentAccountNumber: o.paymentAccountNumber,
            paymentAccountHolder: o.paymentAccountHolder,
            paymentQrisImageUrl: o.paymentQrisImageUrl,
            paymentProofUrl: o.paymentProofUrl || (o.paymentHistory && o.paymentHistory[o.paymentHistory.length - 1]?.proofUrl) || "",
            paymentRejectionReason: o.paymentRejectionReason || "",
            paymentHistory: o.paymentHistory || [],
            paymentDueAt: o.paymentDueAt,
            paymentReminder: o.paymentReminder,
            cateringDate: o.cateringDate,
            cateringTime: o.cateringTime,
            portions: o.portions,
            notes: o.notes,
            time: new Date(o.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
            status: frontendStatus,
            address: o.address || "Alamat pengantaran pelanggan",
            storeName: o.storeName || storeInfo.storeName || "Dapur Catering",
            storeAddress: o.storeAddress || storeInfo.address || "Alamat outlet catering",
            driver: hasDriver ? {
              name: o.driverName || "Driver GEOVERSE",
              vehicle: "Motor",
              plateNumber: o.driverPhone ? `HP: ${o.driverPhone}` : "GEOVERSE Express",
              rating: 4.9,
              stage: o.status === "Selesai" ? "Pesanan selesai" : o.status === "Mengantar" || o.status === "Diambil" || o.status === "Dikirim" ? "Pesanan sedang dikirim" : "Driver menuju outlet catering",
              distance: "1.2 km",
              eta: "5 mnt",
            } : null,
            unreadCustomerMessages: 0,
            unreadDriverMessages: 0,
          };
        });
        setOrders(mapped);
      } catch {
        if (active) setOrdersLoadError("Pesanan Catering belum berhasil dimuat. Periksa koneksi lalu coba lagi.");
      }
    };
    void fetchOrders();
    const interval = setInterval(() => void fetchOrders(), 3500);
    return () => { active = false; clearInterval(interval); };
  }, [authAccount?.id, ordersReloadKey]);

  // 4. Global Withdrawals State
  const [withdrawals, setWithdrawals] = useState<any[]>([]);

  // UI States inside Beranda View
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [productFormVisible, setProductFormVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [showAllProducts, setShowAllProducts] = useState(false);

  // Filter & Layout states
  const [menuSearch, setMenuSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("Semua");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Quick Stock Modal
  const [stockModalVisible, setStockModalVisible] = useState(false);
  const [productForStock, setProductForStock] = useState<ProductItem | null>(null);
  const [stockInputValue, setStockInputValue] = useState("");
  const [isSavingStock, setIsSavingStock] = useState(false);

  // Quick Action Sheet Modal
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [productForAction, setProductForAction] = useState<ProductItem | null>(null);

  // Custom Delete Confirm Modal
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [productToDelete, setProductToDelete] = useState<ProductItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleOpenProductForm = (product: ProductItem | null = null) => {
    setEditingProduct(product);
    setProductFormVisible(true);
  };

  const handleQuickStockChange = async (product: ProductItem, delta: number) => {
    const currentStock = Number(product.stock) || 0;
    const nextStock = Math.max(0, currentStock + delta);
    if (nextStock === currentStock) return;

    // Optimistic UI update
    setProducts((prev) =>
      prev.map((p) => (p.id === product.id ? { ...p, stock: nextStock } : p))
    );

    const res = await updateCateringProduct(product.id, { stock: nextStock });
    if (!res.success) {
      // Revert if failed
      setProducts((prev) =>
        prev.map((p) => (p.id === product.id ? { ...p, stock: currentStock } : p))
      );
      showAlert("Gagal", res.message || "Gagal memperbarui stok");
    }
  };

  const handleOpenStockModal = (product: ProductItem) => {
    setProductForStock(product);
    setStockInputValue(String(product.stock ?? 0));
    setStockModalVisible(true);
  };

  const handleSaveStockModal = async () => {
    if (!productForStock) return;
    const parsed = parseInt(stockInputValue, 10);
    if (isNaN(parsed) || parsed < 0) {
      showAlert("Stok Tidak Valid", "Masukkan angka stok 0 atau lebih.");
      return;
    }

    setIsSavingStock(true);
    const targetId = productForStock.id;
    // Optimistic update
    setProducts((prev) =>
      prev.map((p) => (p.id === targetId ? { ...p, stock: parsed } : p))
    );

    const res = await updateCateringProduct(targetId, { stock: parsed });
    setIsSavingStock(false);
    if (res.success) {
      setStockModalVisible(false);
      setProductForStock(null);
      showAlert("Sukses", `Stok berhasil diatur menjadi ${parsed}`);
    } else {
      showAlert("Gagal", res.message || "Gagal memperbarui stok");
    }
  };

  const handleOpenActionModal = (product: ProductItem) => {
    setProductForAction(product);
    setActionModalVisible(true);
  };

  const handleRequestDelete = (product: ProductItem) => {
    setProductToDelete(product);
    setDeleteModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    const targetId = productToDelete.id;
    const res = await deleteCateringProduct(targetId);
    setIsDeleting(false);
    if (res.success) {
      setProducts((prev) => prev.filter((p) => p.id !== targetId));
      setDeleteModalVisible(false);
      setProductToDelete(null);
      showAlert("Sukses", "Menu berhasil dihapus dari daftar");
    } else {
      showAlert("Gagal", res.message || "Gagal menghapus menu");
    }
  };

  const handleSaveProduct = async (formData: ProductFormData) => {
    if (!authAccount) return;

    if (editingProduct) {
      // Edit mode
      const updatedData = {
        name: formData.name,
        description: formData.description,
        cat: formData.cat,
        price: formData.price,
        stock: formData.stock,
        isActive: formData.isActive,
        img: formData.img || (formData.images.length > 0 ? formData.images[0] : editingProduct.img),
        images: formData.images,
      };

      const res = await updateCateringProduct(editingProduct.id, updatedData);
      if (res.success && res.data) {
        const updated = products.map((p) => {
          if (p.id === editingProduct.id) {
            return {
              ...p,
              name: res.data.name,
              description: res.data.description,
              cat: res.data.cat,
              price: res.data.price,
              stock: res.data.stock,
              isActive: res.data.isActive,
              img: res.data.img,
              images: res.data.images || updatedData.images,
            };
          }
          return p;
        });
        setProducts(updated);
        showAlert("Sukses", "Menu berhasil diperbarui");
        setProductFormVisible(false);
        setEditingProduct(null);
      } else {
        showAlert("Gagal", res.message || "Gagal memperbarui menu");
      }
    } else {
      // Add mode
      const primaryImg =
        formData.img ||
        (formData.images.length > 0
          ? formData.images[0]
          : "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=300&fit=crop&q=80");

      const newProductData = {
        ownerId: authAccount.id,
        name: formData.name,
        price: formData.price,
        img: primaryImg,
        images: formData.images.length > 0 ? formData.images : [primaryImg],
        cat: formData.cat,
        description: formData.description,
        stock: formData.stock,
        isActive: formData.isActive,
      };

      const res = await createCateringProduct(newProductData);
      if (res.success && res.data) {
        const newProduct: ProductItem = {
          id: res.data._id,
          name: res.data.name,
          store: storeInfo.storeName,
          price: res.data.price,
          rating: 0,
          sold: 0,
          img: res.data.img,
          images: res.data.images || newProductData.images,
          cat: res.data.cat,
          description: res.data.description,
          stock: res.data.stock,
          isActive: res.data.isActive,
        };
        setProducts([newProduct, ...products]);
        showAlert("Sukses", "Menu baru berhasil ditambahkan");
        setProductFormVisible(false);
        setEditingProduct(null);
      } else {
        showAlert("Gagal", res.message || "Gagal menambahkan menu");
      }
    }
  };

  const handleDeleteProduct = (productId: string | number) => {
    const found = products.find((p) => p.id === productId);
    if (found) {
      handleRequestDelete(found);
    } else {
      showConfirm(
        "Hapus Menu?",
        "Apakah Anda yakin ingin menghapus menu ini dari daftar?",
        async () => {
          const res = await deleteCateringProduct(productId);
          if (res.success) {
            setProducts(products.filter((p) => p.id !== productId));
            showAlert("Sukses", "Menu telah dihapus");
          } else {
            showAlert("Gagal", res.message || "Gagal menghapus menu");
          }
        }
      );
    }
  };

  const handleToggleProductActive = async (product: ProductItem) => {
    const nextActive = !product.isActive;
    const res = await updateCateringProduct(product.id, { isActive: nextActive });
    if (res.success && res.data) {
      const updated = products.map((p) => {
        if (p.id === product.id) {
          return { ...p, isActive: res.data.isActive };
        }
        return p;
      });
      setProducts(updated);
      showAlert(
        "Sukses",
        res.data.isActive ? "Menu diaktifkan kembali" : "Menu dinonaktifkan sementara"
      );
    } else {
      showAlert("Gagal", res.message || "Gagal mengubah status menu");
    }
  };

  const handleToggleStoreStatus = () => {
    if (!authAccount) return;
    const nextStatus = !storeInfo.isOpen;

    showConfirm(
      nextStatus ? "Buka Dapur?" : "Tutup Dapur?",
      nextStatus
        ? "Dapur akan kembali menerima pesanan customer."
        : "Customer tidak dapat membuat pesanan selama dapur ditutup.",
      async () => {
        const res = await updateCateringStatus(authAccount.id, nextStatus);
        if (res.success && res.data) {
          const updatedRoleData = { ...authAccount.roleData };
          updatedRoleData.isDapurOpen = nextStatus ? "true" : "false";

          const updatedAccount: AuthAccount = {
            ...authAccount,
            roleData: updatedRoleData,
          };
          setStoreInfo({ ...storeInfo, isOpen: nextStatus });
          await updateCachedAccount(updatedAccount);
          onUpdateAccount?.(updatedAccount);
          showAlert("Sukses", nextStatus ? "Dapur sekarang dibuka." : "Dapur sekarang ditutup.");
        } else {
          showAlert("Gagal", res.message || "Gagal mengubah status dapur");
        }
      }
    );
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
            ownerId={authAccount?.id}
            drivers={drivers}
            onAssignDriver={async (orderId, driverId) => {
              const result = await assignCateringDriver(orderId, driverId);
              if (!result.success) {
                showAlert("Gagal", result.message || "Driver gagal ditugaskan");
                return false;
              }
              showAlert("Sukses", "Driver berhasil ditugaskan untuk pesanan catering ini!");
              return true;
            }}
          />
        );
      case 2:
        return <Riwayat orders={orders} loadError={ordersLoadError} onRetry={() => setOrdersReloadKey((key) => key + 1)} />;
      case 3:
        return (
          <Pendapatan
            orders={orders}
            storeName={storeInfo.storeName}
            withdrawals={withdrawals}
            setWithdrawals={setWithdrawals}
          />
        );
      case 4:
        return <Profile storeInfo={storeInfo} setStoreInfo={setStoreInfo} userId={authAccount?.id} authAccount={authAccount} onUpdateAccount={onUpdateAccount} navigate={navigate} />;
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
          role="Pemilik Catering"
          icon={StoreIcon}
          notificationCount={orders.filter((order) => order.status === "Menunggu").length}
          onNotificationPress={() => setNotifModalVisible(true)}
          onRolePress={() => navigate("role")}
        />

        {/* Kitchen Status Card */}
        <View style={styles.outletCard}>
          <View style={styles.outletHeader}>
            <View>
              <Text style={styles.outletStatusLabel}>
                {storeInfo.isOpen ? "DAPUR AKTIF" : "DAPUR NONAKTIF"}
              </Text>
              <Text style={styles.storeNameText}>{storeInfo.storeName}</Text>
            </View>
            <TouchableOpacity 
              style={styles.outletToggleBtn} 
              onPress={handleToggleStoreStatus}
              activeOpacity={0.8}
            >
              <Text style={styles.outletToggleBtnText}>
                {storeInfo.isOpen ? "Tutup Dapur" : "Buka Dapur"}
              </Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.outletStatusDesc}>
            {storeInfo.isOpen
              ? "Dapur sedang menerima pesanan customer."
              : "Dapur ditutup. Customer tidak dapat membuat pesanan."}
          </Text>

          <View style={styles.outletMetricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Rating</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 3, marginTop: 4 }}>
                <Star size={12} color="#F59E0B" fill="#F59E0B" />
                <Text style={styles.metricVal}>4.9</Text>
              </View>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Order hari ini</Text>
              <Text style={styles.metricVal}>{orders.length}</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Menu aktif</Text>
              <Text style={styles.metricVal}>{products.filter((p) => p.isActive).length}</Text>
            </View>
          </View>
        </View>

        {/* Summary Ringkasan */}
        <Text style={styles.sectionTitle}>Ringkasan Hari Ini</Text>
        <Text style={styles.sectionSubtitle}>Data order catering</Text>

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
            onPress={() => Alert.alert("Ulasan", "Belum ada ulasan yang terhubung.")}
            activeOpacity={0.8}
          >
            <MessageSquare size={18} color="#1B7A4E" />
            <Text style={styles.summaryValue}>—</Text>
            <Text style={styles.summaryLabel}>Rating - Belum ada</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Aksi Cepat</Text>
        <Text style={styles.sectionSubtitle}>Kelola dapur lebih cepat</Text>

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
            <Text style={styles.quickActionLabel}>{showAllProducts ? "Ringkas Menu" : "Kelola Menu"}</Text>
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
            <Text style={styles.sectionSubtitle}>{needsAttention.length} menu perlu dicek</Text>
            
            <View style={styles.attentionContainer}>
              {needsAttention.slice(0, 3).map((product) => {
                const message = 
                  product.stock === 0 || !product.isActive 
                    ? "Menu tidak tersedia untuk customer" 
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

        {/* Product Menu List Header */}
        <View style={styles.menuHeaderSection}>
          <View style={styles.menuHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Menu & Katalog Catering</Text>
              <Text style={styles.sectionSubtitle}>
                {products.length} menu terdaftar • {products.filter((p) => p.isActive && p.stock > 0).length} siap dipesan
              </Text>
            </View>

            <View style={styles.menuHeaderActions}>
              {/* Layout Switcher (Grid / List) */}
              <View style={styles.layoutSwitcher}>
                <TouchableOpacity
                  style={[styles.switchOption, viewMode === "grid" && styles.switchOptionActive]}
                  onPress={() => setViewMode("grid")}
                  activeOpacity={0.8}
                >
                  <LayoutGrid size={16} color={viewMode === "grid" ? "#1B7A4E" : "#6B7280"} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.switchOption, viewMode === "list" && styles.switchOptionActive]}
                  onPress={() => setViewMode("list")}
                  activeOpacity={0.8}
                >
                  <ListIcon size={16} color={viewMode === "list" ? "#1B7A4E" : "#6B7280"} />
                </TouchableOpacity>
              </View>

              {/* Tambah Menu Button */}
              <TouchableOpacity
                style={styles.addMenuBtn}
                onPress={() => handleOpenProductForm(null)}
                activeOpacity={0.85}
              >
                <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.addMenuBtnText}>Tambah Menu</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Search Bar */}
          {products.length > 0 && (
            <View style={styles.searchBarWrapper}>
              <Search size={16} color="#9CA3AF" />
              <TextInput
                style={styles.searchInput}
                placeholder="Cari nama atau deskripsi menu..."
                placeholderTextColor="#9CA3AF"
                value={menuSearch}
                onChangeText={setMenuSearch}
              />
              {menuSearch.trim().length > 0 && (
                <TouchableOpacity onPress={() => setMenuSearch("")} hitSlop={8}>
                  <X size={16} color="#9CA3AF" />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Category Filter Pills */}
          {products.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryFilterRow}
            >
              {["Semua", "Nasi Box", "Prasmanan", "Catering Harian", "Kue & Snack", "Catering Acara"].map(
                (category) => {
                  const isSelected = selectedCategory === category;
                  const count =
                    category === "Semua"
                      ? products.length
                      : products.filter((p) => p.cat === category).length;
                  return (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.categoryFilterChip,
                        isSelected && styles.categoryFilterChipSelected,
                      ]}
                      onPress={() => setSelectedCategory(category)}
                      activeOpacity={0.8}
                    >
                      <Text
                        style={[
                          styles.categoryFilterChipText,
                          isSelected && styles.categoryFilterChipTextSelected,
                        ]}
                      >
                        {category} {count > 0 ? `(${count})` : ""}
                      </Text>
                    </TouchableOpacity>
                  );
                }
              )}
            </ScrollView>
          )}

          {/* Status Filter Row */}
          {products.length > 0 && (
            <View style={styles.statusFilterRow}>
              {[
                { key: "Semua", label: "Semua Status" },
                { key: "Tersedia", label: "Tersedia" },
                { key: "Habis", label: "Habis / Nonaktif" },
              ].map((filter) => {
                const isSelected = selectedStatusFilter === filter.key;
                return (
                  <TouchableOpacity
                    key={filter.key}
                    style={[
                      styles.statusFilterChip,
                      isSelected && styles.statusFilterChipSelected,
                    ]}
                    onPress={() => setSelectedStatusFilter(filter.key)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.statusFilterChipText,
                        isSelected && styles.statusFilterChipTextSelected,
                      ]}
                    >
                      {filter.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Product Cards Container */}
        <View style={styles.productListWrapper}>
          {products.length === 0 ? (
            <View style={styles.emptyProductsCard}>
              <View style={styles.emptyIconCircle}>
                <StoreIcon size={34} color="#1B7A4E" />
              </View>
              <Text style={styles.emptyProductsTitle}>Belum ada menu catering</Text>
              <Text style={styles.emptyProductsDesc}>
                Mulai buat menu catering pertama Anda dengan foto, harga, dan porsi yang tersedia agar tampil di aplikasi customer.
              </Text>
              <TouchableOpacity
                style={styles.emptyAddBtn}
                onPress={() => handleOpenProductForm(null)}
                activeOpacity={0.85}
              >
                <Plus size={16} color="#FFFFFF" />
                <Text style={styles.emptyAddBtnText}>Tambah Menu Sekarang</Text>
              </TouchableOpacity>
            </View>
          ) : (() => {
            const filteredProducts = products.filter((p) => {
              if (selectedCategory !== "Semua" && p.cat !== selectedCategory) {
                return false;
              }
              if (selectedStatusFilter === "Tersedia" && (!p.isActive || p.stock === 0)) {
                return false;
              }
              if (selectedStatusFilter === "Habis" && p.isActive && p.stock > 0) {
                return false;
              }
              if (menuSearch.trim()) {
                const q = menuSearch.toLowerCase();
                const matchName = (p.name || "").toLowerCase().includes(q);
                const matchDesc = (p.description || "").toLowerCase().includes(q);
                const matchCat = (p.cat || "").toLowerCase().includes(q);
                return matchName || matchDesc || matchCat;
              }
              return true;
            });

            if (filteredProducts.length === 0) {
              return (
                <View style={styles.noMatchCard}>
                  <Search size={26} color="#9CA3AF" />
                  <Text style={styles.noMatchTitle}>Tidak ada menu yang cocok</Text>
                  <Text style={styles.noMatchDesc}>
                    Coba sesuaikan kata kunci pencarian atau ubah filter kategori.
                  </Text>
                  <TouchableOpacity
                    style={styles.resetFilterBtn}
                    onPress={() => {
                      setMenuSearch("");
                      setSelectedCategory("Semua");
                      setSelectedStatusFilter("Semua");
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.resetFilterBtnText}>Reset Semua Filter</Text>
                  </TouchableOpacity>
                </View>
              );
            }

            if (viewMode === "grid") {
              return (
                <View style={styles.productGridContainer}>
                  {filteredProducts.map((product) => {
                    const isAvailable = product.isActive && product.stock > 0;
                    const isLowStock = isAvailable && product.stock <= 5;
                    const statusText = !product.isActive
                      ? "Nonaktif"
                      : product.stock === 0
                      ? "Habis"
                      : isLowStock
                      ? `Sisa ${product.stock}`
                      : "Tersedia";
                    const statusBg = !product.isActive
                      ? "#F3F4F6"
                      : product.stock === 0
                      ? "#FEE2E2"
                      : isLowStock
                      ? "#FEF3C7"
                      : "#E8F5EE";
                    const statusColor = !product.isActive
                      ? "#6B7280"
                      : product.stock === 0
                      ? "#DC2626"
                      : isLowStock
                      ? "#D97706"
                      : "#1B7A4E";
                    const hasMultiplePhotos =
                      Array.isArray(product.images) && product.images.length > 1;

                    return (
                      <View key={product.id} style={styles.gridCard}>
                        {/* Image Banner */}
                        <View style={styles.gridCardImageWrapper}>
                          <FoodImage uri={product.img} style={styles.gridCardImg} />

                          {/* Category Badge Top-Left */}
                          <View style={styles.gridCategoryBadge}>
                            <Text style={styles.gridCategoryBadgeText}>
                              {product.cat || "Nasi Box"}
                            </Text>
                          </View>

                          {/* Status Badge Top-Right */}
                          <View style={[styles.gridStatusBadge, { backgroundColor: statusBg }]}>
                            <Text style={[styles.gridStatusBadgeText, { color: statusColor }]}>
                              {statusText}
                            </Text>
                          </View>

                          {/* Multiple Photos Badge Bottom-Left */}
                          {hasMultiplePhotos && (
                            <View style={styles.gridPhotoCountBadge}>
                              <ImageIcon size={10} color="#FFFFFF" />
                              <Text style={styles.gridPhotoCountText}>
                                {product.images?.length} Foto
                              </Text>
                            </View>
                          )}
                        </View>

                        {/* Card Body */}
                        <View style={styles.gridCardBody}>
                          <Text style={styles.gridCardTitle} numberOfLines={2}>
                            {product.name}
                          </Text>

                          <View style={styles.gridCardPriceRow}>
                            <Text style={styles.gridCardPrice}>{rp(product.price)}</Text>
                            <Text style={styles.gridCardUnit}>/ porsi</Text>
                          </View>

                          {/* Description Snippet */}
                          <Text style={styles.gridCardDesc} numberOfLines={3}>
                            {product.description?.trim()
                              ? product.description
                              : "Menu catering lezat dan higienis siap dipesan."}
                          </Text>

                          {/* Inline Stock Controller */}
                          <View style={styles.gridStockBox}>
                            <View style={styles.gridStockLabelRow}>
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                                <Package size={13} color="#1B7A4E" />
                                <Text style={styles.gridStockLabel}>Kelola Stok</Text>
                              </View>
                              <TouchableOpacity
                                onPress={() => handleOpenStockModal(product)}
                                style={styles.gridStockBadgeBtn}
                                activeOpacity={0.7}
                              >
                                <Text style={styles.gridStockBadgeText}>Atur ({product.stock})</Text>
                              </TouchableOpacity>
                            </View>

                            <View style={styles.gridStepperRow}>
                              <TouchableOpacity
                                style={[
                                  styles.miniStepperBtn,
                                  product.stock <= 0 && { opacity: 0.4 },
                                ]}
                                onPress={() => handleQuickStockChange(product, -1)}
                                disabled={product.stock <= 0}
                                activeOpacity={0.7}
                              >
                                <Minus size={14} color="#1B7A4E" />
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={styles.stockNumberPill}
                                onPress={() => handleOpenStockModal(product)}
                                activeOpacity={0.7}
                              >
                                <Text style={styles.stockNumberText}>{product.stock}</Text>
                                <Text style={styles.stockUnitText}>pax</Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={styles.miniStepperBtn}
                                onPress={() => handleQuickStockChange(product, 1)}
                                activeOpacity={0.7}
                              >
                                <Plus size={14} color="#1B7A4E" />
                              </TouchableOpacity>
                            </View>
                          </View>

                          {/* Direct Action Buttons */}
                          <View style={styles.gridCardActionsRow}>
                            <TouchableOpacity
                              style={styles.directEditBtn}
                              onPress={() => handleOpenProductForm(product)}
                              activeOpacity={0.8}
                            >
                              <Edit3 size={13} color="#1B7A4E" />
                              <Text style={styles.directEditBtnText}>Edit</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.directManageBtn}
                              onPress={() => handleOpenActionModal(product)}
                              activeOpacity={0.8}
                            >
                              <SlidersHorizontal size={14} color="#374151" />
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.directDeleteBtn}
                              onPress={() => handleRequestDelete(product)}
                              activeOpacity={0.8}
                            >
                              <Trash2 size={14} color="#DC2626" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              );
            }

            // List View
            return (
              <View style={styles.productListContainer}>
                {filteredProducts.map((product) => {
                  const isAvailable = product.isActive && product.stock > 0;
                  const isLowStock = isAvailable && product.stock <= 5;
                  const statusText = !product.isActive
                    ? "Nonaktif"
                    : product.stock === 0
                    ? "Habis"
                    : isLowStock
                    ? `Sisa ${product.stock}`
                    : "Tersedia";
                  const statusBg = !product.isActive
                    ? "#F3F4F6"
                    : product.stock === 0
                    ? "#FEE2E2"
                    : isLowStock
                    ? "#FEF3C7"
                    : "#E8F5EE";
                  const statusColor = !product.isActive
                    ? "#6B7280"
                    : product.stock === 0
                    ? "#DC2626"
                    : isLowStock
                    ? "#D97706"
                    : "#1B7A4E";

                  return (
                    <View key={product.id} style={styles.listCard}>
                      <View style={styles.listCardLeft}>
                        <FoodImage uri={product.img} style={styles.listCardImg} />
                        <View style={[styles.listStatusBadge, { backgroundColor: statusBg }]}>
                          <Text style={[styles.listStatusBadgeText, { color: statusColor }]}>
                            {statusText}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.listCardRight}>
                        <View style={styles.listCardHeaderRow}>
                          <View style={{ flex: 1, marginRight: 6 }}>
                            <Text style={styles.listCategoryText}>
                              {product.cat || "Nasi Box"}
                            </Text>
                            <Text style={styles.listCardTitle} numberOfLines={1}>
                              {product.name}
                            </Text>
                          </View>
                          <Text style={styles.listCardPrice}>{rp(product.price)}</Text>
                        </View>

                        <Text style={styles.listCardDesc} numberOfLines={2}>
                          {product.description?.trim()
                            ? product.description
                            : "Menu catering lezat dan higienis siap dipesan."}
                        </Text>

                        {/* Stock & Actions Row */}
                        <View style={styles.listBottomRow}>
                          <View style={styles.listStepperGroup}>
                            <TouchableOpacity
                              style={[
                                styles.miniStepperBtn,
                                product.stock <= 0 && { opacity: 0.4 },
                              ]}
                              onPress={() => handleQuickStockChange(product, -1)}
                              disabled={product.stock <= 0}
                              activeOpacity={0.7}
                            >
                              <Minus size={12} color="#1B7A4E" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleOpenStockModal(product)}>
                              <Text style={styles.listStockText}>
                                Stok: <Text style={{ fontWeight: "800", color: "#111827" }}>{product.stock}</Text>
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.miniStepperBtn}
                              onPress={() => handleQuickStockChange(product, 1)}
                              activeOpacity={0.7}
                            >
                              <Plus size={12} color="#1B7A4E" />
                            </TouchableOpacity>
                          </View>

                          <View style={styles.listActionsGroup}>
                            <TouchableOpacity
                              style={styles.listEditBtn}
                              onPress={() => handleOpenProductForm(product)}
                              activeOpacity={0.8}
                            >
                              <Edit3 size={12} color="#1B7A4E" />
                              <Text style={styles.listEditBtnText}>Edit</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.directManageBtn}
                              onPress={() => handleOpenActionModal(product)}
                              activeOpacity={0.8}
                            >
                              <SlidersHorizontal size={13} color="#374151" />
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.directDeleteBtn}
                              onPress={() => handleRequestDelete(product)}
                              activeOpacity={0.8}
                            >
                              <Trash2 size={13} color="#DC2626" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            );
          })()}
        </View>

        {/* Best sellers */}
        <Text style={styles.sectionTitle}>Menu Terlaris</Text>
        <Text style={styles.sectionSubtitle}>Berdasarkan porsi terjual</Text>

        <View style={styles.bestSellersContainer}>
          {products.length === 0 ? (
            <View style={styles.emptySellers}>
              <Text style={styles.emptySellersText}>Belum ada data menu untuk diperingkatkan.</Text>
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

        {/* Kitchen Insights */}
        <Text style={styles.sectionTitle}>Insight Dapur</Text>
        <Text style={styles.sectionSubtitle}>Dihitung saat data tersedia</Text>
        <View style={styles.insightCard}>
          {products.length > 0 ? (
            <Text style={styles.insightText}>
              {bestSellers[0].name} adalah menu dengan penjualan tertinggi ({bestSellers[0].sold} terjual).
            </Text>
          ) : (
            <Text style={styles.insightText}>Belum cukup data untuk membuat insight dapur.</Text>
          )}
          <Text style={[styles.insightText, { color: "#6B7280", marginTop: 6 }]}>
            Data order catering saat ini tersedia untuk dipantau dari menu Order.
          </Text>
        </View>
      </ScrollView>
    );
  };

  if (productFormVisible) {
    return (
      <FullPageProductForm
        title={editingProduct ? "Edit Menu Catering" : "Tambah Menu Catering"}
        subtitle={
          editingProduct
            ? "Perbarui informasi dan foto menu catering Anda"
            : "Lengkapi detail menu dan tambahkan foto produk"
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
        categories={["Catering Harian", "Nasi Box", "Prasmanan", "Kue & Snack", "Catering Acara"]}
        priceLabel="Harga per Porsi (Rp)"
        pricePlaceholder="Contoh: 25000"
        stockLabel="Stok / Porsi Tersedia"
        stockPlaceholder="Contoh: 20"
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
              <TouchableOpacity 
                style={styles.notifItemRow} 
                onPress={() => {
                  setNotifModalVisible(false);
                  setCurrentTab(1);
                }}
              >
                <View style={styles.notifIconBg}>
                  <ShoppingBag size={18} color="#1B7A4E" />
                </View>
                <View style={styles.notifBody}>
                  <Text style={styles.notifRowTitle}>Pesanan Baru</Text>
                  <Text style={styles.notifRowDesc}>Pesanan catering terbaru tersedia untuk diproses.</Text>
                </View>
                <Text style={styles.notifTime}>Baru saja</Text>
              </TouchableOpacity>

              <View style={styles.notifItemRow}>
                <View style={styles.notifIconBg}>
                  <AlertTriangle size={18} color="#1B7A4E" />
                </View>
                <View style={styles.notifBody}>
                  <Text style={styles.notifRowTitle}>Stok perlu dicek</Text>
                  <Text style={styles.notifRowDesc}>Periksa menu dengan stok menipis di Beranda.</Text>
                </View>
                <Text style={styles.notifTime}>20 mnt lalu</Text>
              </View>

              <View style={styles.notifItemRow}>
                <View style={styles.notifIconBg}>
                  <MessageSquare size={18} color="#1B7A4E" />
                </View>
                <View style={styles.notifBody}>
                  <Text style={styles.notifRowTitle}>Ulasan customer</Text>
                  <Text style={styles.notifRowDesc}>Belum ada data ulasan yang dapat ditampilkan.</Text>
                </View>
                <Text style={styles.notifTime}>1 jam lalu</Text>
              </View>
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

      {/* 2. Modal Quick Stock Editor */}
      <Modal visible={stockModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdropCenter}>
          <View style={styles.stockModalCard}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={styles.stockIconBg}>
                  <Package size={20} color="#1B7A4E" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>Atur Stok Menu</Text>
                  <Text style={styles.modalSubtitle} numberOfLines={1}>
                    {productForStock?.name}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setStockModalVisible(false)} hitSlop={10}>
                <X size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Current Product Mini Summary */}
            {productForStock && (
              <View style={styles.productMiniPreview}>
                <FoodImage uri={productForStock.img} style={styles.miniPreviewImg} />
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.miniPreviewName} numberOfLines={1}>
                    {productForStock.name}
                  </Text>
                  <Text style={styles.miniPreviewPrice}>
                    {rp(productForStock.price)} / porsi
                  </Text>
                  <Text style={styles.miniPreviewCategory}>
                    Kategori: {productForStock.cat || "Nasi Box"}
                  </Text>
                </View>
              </View>
            )}

            {/* Stepper & Input */}
            <View style={styles.stockStepperContainer}>
              <Text style={styles.stockInputLabel}>Jumlah Porsi Tersedia</Text>
              <View style={styles.stepperControlRow}>
                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => {
                    const current = parseInt(stockInputValue, 10) || 0;
                    setStockInputValue(String(Math.max(0, current - 1)));
                  }}
                  activeOpacity={0.7}
                >
                  <Minus size={20} color="#1B7A4E" />
                </TouchableOpacity>

                <TextInput
                  style={styles.stockInput}
                  keyboardType="numeric"
                  value={stockInputValue}
                  onChangeText={(val) => setStockInputValue(val.replace(/[^0-9]/g, ""))}
                  placeholder="0"
                />

                <TouchableOpacity
                  style={styles.stepperBtn}
                  onPress={() => {
                    const current = parseInt(stockInputValue, 10) || 0;
                    setStockInputValue(String(current + 1));
                  }}
                  activeOpacity={0.7}
                >
                  <Plus size={20} color="#1B7A4E" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Quick Preset Buttons */}
            <Text style={styles.presetsLabel}>Preset Cepat:</Text>
            <View style={styles.presetsRow}>
              {[
                { label: "+5", add: 5 },
                { label: "+10", add: 10 },
                { label: "+20", add: 20 },
                { label: "+50", add: 50 },
                { label: "Habis (0)", setVal: 0 },
              ].map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.presetChip,
                    item.setVal === 0 && { backgroundColor: "#FEE2E2", borderColor: "#FCA5A5" },
                  ]}
                  onPress={() => {
                    if (item.setVal !== undefined) {
                      setStockInputValue(String(item.setVal));
                    } else if (item.add !== undefined) {
                      const cur = parseInt(stockInputValue, 10) || 0;
                      setStockInputValue(String(cur + item.add));
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.presetChipText,
                      item.setVal === 0 && { color: "#DC2626" },
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Actions */}
            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setStockModalVisible(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelBtnText}>Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, isSavingStock && { opacity: 0.7 }]}
                onPress={handleSaveStockModal}
                disabled={isSavingStock}
                activeOpacity={0.85}
              >
                {isSavingStock ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Check size={18} color="#FFFFFF" strokeWidth={2.5} />
                    <Text style={styles.modalSaveBtnText}>Simpan Stok</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* 3. Modal Kelola Menu (Custom Action Sheet) */}
      <Modal visible={actionModalVisible} transparent animationType="slide">
        <View style={styles.modalBgBottom}>
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>Kelola Menu Catering</Text>
                <Text style={styles.sheetSubtitle} numberOfLines={1}>
                  {productForAction?.name}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setActionModalVisible(false)} hitSlop={10}>
                <X size={20} color="#111827" />
              </TouchableOpacity>
            </View>

            {productForAction && (
              <View style={styles.actionProductCard}>
                <FoodImage uri={productForAction.img} style={styles.actionProductImg} />
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={styles.actionProductName}>{productForAction.name}</Text>
                  <Text style={styles.actionProductPrice}>{rp(productForAction.price)} / porsi</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 }}>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            productForAction.isActive && productForAction.stock > 0
                              ? "#E8F5EE"
                              : "#FEE2E2",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          {
                            color:
                              productForAction.isActive && productForAction.stock > 0
                                ? "#1B7A4E"
                                : "#B91C1C",
                          },
                        ]}
                      >
                        {productForAction.isActive && productForAction.stock > 0
                          ? "Tersedia"
                          : "Habis / Nonaktif"}
                      </Text>
                    </View>
                    <Text style={styles.actionProductStock}>Stok: {productForAction.stock} pax</Text>
                  </View>
                </View>
              </View>
            )}

            <View style={styles.actionList}>
              {/* 1. Edit Menu */}
              <TouchableOpacity
                style={styles.actionRowBtn}
                onPress={() => {
                  const target = productForAction;
                  setActionModalVisible(false);
                  if (target) handleOpenProductForm(target);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconCircle, { backgroundColor: "#E8F5EE" }]}>
                  <Edit3 size={18} color="#1B7A4E" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionItemTitle}>Edit Informasi & Foto</Text>
                  <Text style={styles.actionItemDesc}>Ubah nama, harga, deskripsi, kategori, dan foto</Text>
                </View>
                <ChevronRight size={18} color="#9CA3AF" />
              </TouchableOpacity>

              {/* 2. Ubah Stok Cepat */}
              <TouchableOpacity
                style={styles.actionRowBtn}
                onPress={() => {
                  const target = productForAction;
                  setActionModalVisible(false);
                  if (target) handleOpenStockModal(target);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconCircle, { backgroundColor: "#FEF3C7" }]}>
                  <Package size={18} color="#B45309" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionItemTitle}>Atur Jumlah Stok</Text>
                  <Text style={styles.actionItemDesc}>Update porsi yang siap dipesan customer</Text>
                </View>
                <ChevronRight size={18} color="#9CA3AF" />
              </TouchableOpacity>

              {/* 3. Toggle Status Aktif/Nonaktif */}
              <TouchableOpacity
                style={styles.actionRowBtn}
                onPress={() => {
                  const target = productForAction;
                  setActionModalVisible(false);
                  if (target) handleToggleProductActive(target);
                }}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.actionIconCircle,
                    { backgroundColor: productForAction?.isActive ? "#F3F4F6" : "#E8F5EE" },
                  ]}
                >
                  {productForAction?.isActive ? (
                    <EyeOff size={18} color="#4B5563" />
                  ) : (
                    <Eye size={18} color="#1B7A4E" />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionItemTitle}>
                    {productForAction?.isActive ? "Nonaktifkan Menu Sementara" : "Aktifkan Menu Kembali"}
                  </Text>
                  <Text style={styles.actionItemDesc}>
                    {productForAction?.isActive
                      ? "Sembunyikan menu dari katalog customer"
                      : "Tampilkan menu agar bisa dipesan kembali"}
                  </Text>
                </View>
                <ChevronRight size={18} color="#9CA3AF" />
              </TouchableOpacity>

              {/* 4. Hapus Menu */}
              <TouchableOpacity
                style={[styles.actionRowBtn, { borderBottomWidth: 0 }]}
                onPress={() => {
                  const target = productForAction;
                  setActionModalVisible(false);
                  if (target) handleRequestDelete(target);
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIconCircle, { backgroundColor: "#FEE2E2" }]}>
                  <Trash2 size={18} color="#DC2626" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.actionItemTitle, { color: "#DC2626" }]}>Hapus Menu Ini</Text>
                  <Text style={styles.actionItemDesc}>Hapus menu secara permanen dari dapur catering</Text>
                </View>
                <ChevronRight size={18} color="#DC2626" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.sheetBtnClose}
              onPress={() => setActionModalVisible(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.sheetBtnCloseText}>Tutup</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 4. Modal Konfirmasi Hapus Menu (In-App) */}
      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={styles.modalBackdropCenter}>
          <View style={styles.deleteModalCard}>
            <View style={styles.deleteWarningIconBg}>
              <Trash2 size={28} color="#DC2626" />
            </View>

            <Text style={styles.deleteModalTitle}>Hapus Menu Catering?</Text>
            <Text style={styles.deleteModalDesc}>
              Apakah Anda yakin ingin menghapus{" "}
              <Text style={{ fontWeight: "800", color: "#111827" }}>
                "{productToDelete?.name}"
              </Text>
              ? Tindakan ini tidak dapat dibatalkan dan menu akan dihapus permanen dari sistem.
            </Text>

            <View style={styles.deleteModalActionRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setDeleteModalVisible(false)}
                disabled={isDeleting}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelBtnText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.deleteConfirmBtn, isDeleting && { opacity: 0.7 }]}
                onPress={handleConfirmDelete}
                disabled={isDeleting}
                activeOpacity={0.85}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Trash2 size={16} color="#FFFFFF" />
                    <Text style={styles.deleteConfirmBtnText}>Ya, Hapus Sekarang</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    color: "#E8F5EE",
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
  menuHeaderSection: {
    marginTop: 18,
    marginBottom: 14,
    gap: 12,
  },
  menuHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  menuHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  layoutSwitcher: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    padding: 3,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  switchOption: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 7,
  },
  switchOptionActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  addMenuBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1B7A4E",
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 10,
    gap: 5,
  },
  addMenuBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  searchBarWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#111827",
    paddingVertical: 0,
  },
  categoryFilterRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 2,
  },
  categoryFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  categoryFilterChipSelected: {
    backgroundColor: "#1B7A4E",
    borderColor: "#1B7A4E",
  },
  categoryFilterChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4B5563",
  },
  categoryFilterChipTextSelected: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  statusFilterRow: {
    flexDirection: "row",
    gap: 6,
  },
  statusFilterChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  statusFilterChipSelected: {
    backgroundColor: "#E8F5EE",
    borderColor: "#A7F3D0",
  },
  statusFilterChipText: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "600",
  },
  statusFilterChipTextSelected: {
    color: "#1B7A4E",
    fontWeight: "700",
  },
  productListWrapper: {
    marginBottom: 24,
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
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(27, 122, 78, 0.1)",
    alignItems: "center",
    justifyContent: "center",
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
    lineHeight: 18,
    maxWidth: 320,
  },
  emptyAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1B7A4E",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
    marginTop: 6,
  },
  emptyAddBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  noMatchCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  noMatchTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
  },
  noMatchDesc: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
  },
  resetFilterBtn: {
    marginTop: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#E8F5EE",
  },
  resetFilterBtnText: {
    color: "#1B7A4E",
    fontSize: 12,
    fontWeight: "700",
  },

  // Grid Catalog Cards
  productGridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 14,
  },
  gridCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
    width: "48.5%",
    minWidth: 260,
    flexGrow: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  gridCardImageWrapper: {
    width: "100%",
    height: 145,
    backgroundColor: "#F3F4F6",
    position: "relative",
  },
  gridCardImg: {
    width: "100%",
    height: "100%",
  },
  gridCategoryBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  gridCategoryBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  gridStatusBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  gridStatusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  gridPhotoCountBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  gridPhotoCountText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
  },
  gridCardBody: {
    padding: 12,
    gap: 6,
  },
  gridCardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
    lineHeight: 19,
  },
  gridCardPriceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  gridCardPrice: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1B7A4E",
  },
  gridCardUnit: {
    fontSize: 11,
    color: "#6B7280",
  },
  gridCardDesc: {
    fontSize: 11,
    color: "#4B5563",
    lineHeight: 16,
    minHeight: 32,
  },
  gridStockBox: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#DCFCE7",
    borderRadius: 12,
    padding: 8,
    gap: 6,
    marginTop: 4,
  },
  gridStockLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  gridStockLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#15803D",
  },
  gridStockBadgeBtn: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  gridStockBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#166534",
  },
  gridStepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  miniStepperBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    alignItems: "center",
    justifyContent: "center",
  },
  stockNumberPill: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 3,
    paddingHorizontal: 8,
  },
  stockNumberText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  stockUnitText: {
    fontSize: 11,
    color: "#6B7280",
  },
  gridCardActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  directEditBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F5EE",
    paddingVertical: 7,
    borderRadius: 9,
    gap: 5,
  },
  directEditBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1B7A4E",
  },
  directManageBtn: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  directDeleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },

  // List Cards
  productListContainer: {
    gap: 12,
  },
  listCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  listCardLeft: {
    width: 90,
    height: 90,
    borderRadius: 14,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#F3F4F6",
  },
  listCardImg: {
    width: "100%",
    height: "100%",
  },
  listStatusBadge: {
    position: "absolute",
    bottom: 4,
    left: 4,
    right: 4,
    paddingVertical: 2,
    borderRadius: 4,
    alignItems: "center",
  },
  listStatusBadgeText: {
    fontSize: 9,
    fontWeight: "800",
  },
  listCardRight: {
    flex: 1,
    gap: 4,
  },
  listCardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  listCategoryText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#1B7A4E",
    textTransform: "uppercase",
  },
  listCardTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  listCardPrice: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1B7A4E",
  },
  listCardDesc: {
    fontSize: 11,
    color: "#4B5563",
    lineHeight: 15,
  },
  listBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  listStepperGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  listStockText: {
    fontSize: 11,
    color: "#6B7280",
  },
  listActionsGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  listEditBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5EE",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  listEditBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1B7A4E",
  },

  // Modal Central / Card Styles
  modalBackdropCenter: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  stockModalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    width: "100%",
    maxWidth: 420,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingBottom: 12,
    marginBottom: 14,
  },
  stockIconBg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#E8F5EE",
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    maxWidth: 220,
  },
  productMiniPreview: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 10,
    gap: 12,
    marginBottom: 14,
  },
  miniPreviewImg: {
    width: 50,
    height: 50,
    borderRadius: 10,
  },
  miniPreviewName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  miniPreviewPrice: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1B7A4E",
  },
  miniPreviewCategory: {
    fontSize: 11,
    color: "#6B7280",
  },
  stockStepperContainer: {
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#DCFCE7",
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    marginBottom: 14,
    gap: 10,
  },
  stockInputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#166534",
  },
  stepperControlRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  stepperBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  stockInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#1B7A4E",
    borderRadius: 14,
    width: 100,
    height: 48,
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
  },
  presetsLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 8,
  },
  presetsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
  },
  modalActionRow: {
    flexDirection: "row",
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#4B5563",
  },
  modalSaveBtn: {
    flex: 1.5,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#1B7A4E",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  modalSaveBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Action Sheet Modal
  sheetSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  actionProductCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 14,
    padding: 10,
    gap: 12,
    marginBottom: 16,
  },
  actionProductImg: {
    width: 52,
    height: 52,
    borderRadius: 10,
  },
  actionProductName: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  actionProductPrice: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1B7A4E",
  },
  actionProductStock: {
    fontSize: 11,
    color: "#6B7280",
  },
  actionList: {
    gap: 4,
    marginBottom: 8,
  },
  actionRowBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  actionIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  actionItemTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  actionItemDesc: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 1,
  },

  // Delete Confirm Modal
  deleteModalCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 24,
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  deleteWarningIconBg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  deleteModalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
  },
  deleteModalDesc: {
    fontSize: 13,
    color: "#4B5563",
    textAlign: "center",
    lineHeight: 19,
  },
  deleteModalActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
    width: "100%",
  },
  deleteConfirmBtn: {
    flex: 1.5,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#DC2626",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  deleteConfirmBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
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
    backgroundColor: "#FFF7ED",
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#FFEDD5",
  },
  changeImageText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#EA580C",
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
    paddingVertical: 10,
    borderRadius: 12,
  },
  pickCameraBtnText: {
    fontSize: 12,
    fontWeight: "700",
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
});

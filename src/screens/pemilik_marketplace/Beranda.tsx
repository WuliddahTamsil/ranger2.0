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
} from "../../services/api";
import { subscribeToUserRealtime } from "../../services/userRealtime";

// Import other screens
import { Order, OrderData } from "./Order";
import { Riwayat } from "./Riwayat";
import { Pendapatan } from "./Pendapatan";
import { Profile } from "./Profile";
import { FullPageProductForm, ProductFormData } from "../../components/FullPageProductForm";

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
  const showAlert = (title: string, message: string) => {
    if (Platform.OS === "web") alert(`${title}: ${message}`);
    else Alert.alert(title, message);
  };

  // 1. Global Store Info State
  const [storeInfo, setStoreInfo] = useState(() => ({
    ownerName: authAccount?.name || "",
    storeName: authAccount?.roleData.businessName || "Nama toko belum diatur",
    phone: authAccount?.phone || "",
    email: authAccount?.email || "",
    address: authAccount?.roleData.businessAddress || authAccount?.address || "",
    description: "Menyediakan sembako berkualitas dan kebutuhan sehari-hari warga Kamojang.",
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
      storeName: authAccount.roleData.businessName || current.storeName,
      address: authAccount.roleData.businessAddress || authAccount.address,
      description: authAccount.roleData.businessDescription || current.description,
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
          address: order.address || "Alamat pelanggan belum tersedia",
          storeName: order.storeName || "Mitra Marketplace",
          storeAddress: order.storeAddress || "Alamat toko belum tersedia",
          driverPhone: order.driverPhone || "",
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
    const interval = setInterval(() => void loadOrders(), 3500);
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
    void subscribeToUserRealtime(() => void refreshNotifications(), () => void refreshNotifications()).then((stop) => {
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
      const result = await updateMarketplaceProduct(editingProduct.id, updatedPayload);
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
      });
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
    Alert.alert("Hapus Menu?", "Apakah Anda yakin ingin menghapus menu ini dari daftar?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: async () => {
          const result = await deleteMarketplaceProduct(productId);
          if (!result.success) {
            showAlert("Gagal", result.message || "Gagal menghapus produk");
            return;
          }
          setProducts(products.filter((p) => p.id !== productId));
          showAlert("Sukses", "Produk telah dihapus");
        },
      },
    ]);
  };

  const handleToggleProductActive = (product: ProductItem) => {
    const updated = products.map((p) => {
      if (p.id === product.id) {
        return { ...p, isActive: !p.isActive };
      }
      return p;
    });
    setProducts(updated);
    Alert.alert(
      "Sukses",
      product.isActive ? "Menu dinonaktifkan sementara" : "Menu diaktifkan kembali"
    );
  };

  const handleToggleStoreStatus = () => {
    const nextStatus = !storeInfo.isOpen;
    Alert.alert(
      nextStatus ? "Buka Outlet?" : "Tutup Outlet?",
      nextStatus
        ? "Outlet akan kembali menerima pesanan customer."
        : "Customer tidak dapat membuat pesanan selama outlet ditutup.",
      [
        { text: "Batal", style: "cancel" },
        {
          text: nextStatus ? "Buka Outlet" : "Tutup Outlet",
          onPress: () => {
            setStoreInfo({ ...storeInfo, isOpen: nextStatus });
            Alert.alert("Sukses", nextStatus ? "Outlet sekarang dibuka." : "Outlet sekarang ditutup.");
          },
        },
      ]
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
            onStatusChange={async (orderId, status) => {
              const result = await updateMarketplaceOrderStatus(orderId, status);
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

        {/* Product Menu List */}
        <View style={styles.menuHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>Menu Produk</Text>
            <Text style={styles.sectionSubtitle}>{products.length} menu terdaftar</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {products.length > 3 && (
              <TouchableOpacity
                style={styles.toggleAllBtn}
                onPress={() => setShowAllProducts((prev) => !prev)}
                activeOpacity={0.8}
              >
                <Text style={styles.toggleAllBtnText}>
                  {showAllProducts ? "Tampilkan 3" : `Lihat Semua (${products.length})`}
                </Text>
              </TouchableOpacity>
            )}
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

        <View style={styles.productList}>
          {products.length === 0 ? (
            <View style={styles.emptyProductsCard}>
              <StoreIcon size={34} color="#1B7A4E" />
              <Text style={styles.emptyProductsTitle}>Belum ada menu</Text>
              <Text style={styles.emptyProductsDesc}>Tambahkan menu pertama agar tampil di marketplace customer.</Text>
            </View>
          ) : (
            (showAllProducts ? products : products.slice(0, 3)).map((product) => {
              const status = !product.isActive || product.stock === 0 
                ? "Habis" 
                : product.stock <= 5 
                  ? "Stok menipis" 
                  : "Tersedia";
              const statusColor = status === "Tersedia" ? "#1B7A4E" : status === "Stok menipis" ? "#B45309" : "#B91C1C";
              const statusBg = status === "Tersedia" ? "#E8F5EE" : status === "Stok menipis" ? "#FEF3C7" : "#FEE2E2";

              return (
                <View key={product.id} style={styles.productCard}>
                  {product.img !== "" ? (
                    <Image source={{ uri: product.img }} style={styles.productImg as any} />
                  ) : (
                    <View style={styles.productImgPlaceholder}>
                      <ImageIcon size={20} color="#1B7A4E" />
                    </View>
                  )}
                  
                  <View style={styles.productInfo}>
                    <Text style={styles.productName}>{product.name}</Text>
                    <Text style={styles.productPrice}>{rp(product.price)}</Text>
                    <View style={styles.productStatusRow}>
                      <View style={[styles.statusBadge, { backgroundColor: statusBg }]}>
                        <Text style={[styles.statusBadgeText, { color: statusColor }]}>{status}</Text>
                      </View>
                      <Text style={styles.productStock}>Stok {product.stock}</Text>
                      {Array.isArray(product.images) && product.images.length > 1 && (
                        <View style={styles.multiPhotoBadge}>
                          <ImageIcon size={10} color="#6B7280" />
                          <Text style={styles.multiPhotoText}>{product.images.length} foto</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Actions vertical dot menu */}
                  <TouchableOpacity 
                    style={styles.moreBtn}
                    onPress={() => {
                      Alert.alert(
                        "Kelola Menu",
                        product.name,
                        [
                          { text: "Batal", style: "cancel" },
                          { text: "Edit Menu", onPress: () => handleOpenProductForm(product) },
                          { 
                            text: product.isActive ? "Nonaktifkan" : "Aktifkan", 
                            onPress: () => handleToggleProductActive(product) 
                          },
                          { text: "Hapus Menu", style: "destructive", onPress: () => handleDeleteProduct(product.id) }
                        ]
                      );
                    }}
                    activeOpacity={0.7}
                  >
                    <MoreVertical size={18} color="#6B7280" />
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </View>

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
        categories={["Makanan", "Fashion", "Minuman", "Kesehatan", "Kerajinan", "Elektronik", "Lainnya"]}
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
});

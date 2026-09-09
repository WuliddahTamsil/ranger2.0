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
  const [storeInfo, setStoreInfo] = useState(() => ({
    ownerName: authAccount?.name || "",
    storeName: authAccount?.roleData.businessName || "Nama catering belum diatur",
    phone: authAccount?.phone || "",
    email: authAccount?.email || "",
    address: authAccount?.roleData.businessAddress || authAccount?.address || "",
    description: "Menyediakan layanan catering prasmanan dan nasi box tumpeng berkualitas di Kamojang.",
    isOpen: authAccount?.roleData.isDapurOpen === "true",
    isVerified: true,
    profileImage: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=300&h=300&fit=crop&q=80",
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
      description: authAccount.roleData.menuSpecialty || current.description,
      isOpen: authAccount.roleData.isDapurOpen === "true",
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
    if (!authAccount) return;
    const fetchOrders = async () => {
      const result = await getCateringOrdersForOwner(authAccount.id);
      if (result.success && result.data) {
        const mapped = result.data.map((o: any) => {
          let frontendStatus = o.status;
          if (o.status === "Dikirim" || o.status === "Mengantar") {
            frontendStatus = "Diambil";
          } else if (o.status === "Menuju Pickup" || o.status === "Sampai Pickup") {
            frontendStatus = "Siap";
          }

          const hasDriver = Boolean(o.driverId || o.driverName);
          return {
            id: o._id,
            customer: o.customerName,
            customerPhone: o.customerPhone,
            items: [{ name: o.menuName, quantity: o.portions, price: o.price }],
            total: o.totalAmount,
            subtotal: o.totalAmount - (o.deliveryFee || 0) - (o.serviceFee || 0),
            deliveryFee: o.deliveryFee || 0,
            time: new Date(o.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
            status: frontendStatus,
            address: o.address || "Jl. Telang Indah, Kamal",
            storeName: o.storeName || storeInfo.storeName || "Dapur Catering",
            storeAddress: o.storeAddress || storeInfo.address || "Kamal, Bangkalan, Madura",
            driver: hasDriver ? {
              name: o.driverName || "Driver Rangers",
              vehicle: "Motor",
              plateNumber: o.driverPhone ? `HP: ${o.driverPhone}` : "Rangers Express",
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
      }
    };
    void fetchOrders();
    const interval = setInterval(() => void fetchOrders(), 3500);
    return () => clearInterval(interval);
  }, [authAccount]);

  // 4. Global Withdrawals State
  const [withdrawals, setWithdrawals] = useState<any[]>([
    {
      id: "WDR-9812",
      amount: 850000,
      method: "GoPay",
      destination: "0812-9876-5432",
      createdAt: "09 Agu, 12:40",
      status: "Sukses",
    },
  ]);

  // UI States inside Beranda View
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [productFormVisible, setProductFormVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [showAllProducts, setShowAllProducts] = useState(false);

  const handleOpenProductForm = (product: ProductItem | null = null) => {
    setEditingProduct(product);
    setProductFormVisible(true);
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
        return <Riwayat orders={orders} />;
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
        return <Profile storeInfo={storeInfo} setStoreInfo={setStoreInfo} navigate={navigate} />;
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

        {/* Product Menu List */}
        <View style={styles.menuHeaderRow}>
          <View>
            <Text style={styles.sectionTitle}>Menu Catering</Text>
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
              <Text style={styles.emptyProductsDesc}>Tambahkan menu pertama agar tampil di halaman customer.</Text>
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
    <SafeAreaView style={styles.container}>
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
    </SafeAreaView>
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
    backgroundColor: "rgba(255, 112, 67, 0.1)",
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

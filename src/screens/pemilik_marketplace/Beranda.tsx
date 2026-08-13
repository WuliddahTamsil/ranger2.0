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
} from "react-native";
import {
  Home,
  ShoppingBag,
  History as HistoryIcon,
  Wallet,
  User as UserIcon,
  Bell,
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
} from "lucide-react-native";
import { rp } from "../../utils/formatters";
import { Nav } from "../../types";
import { AuthAccount } from "../auth/authTypes";

// Import other screens
import { Order, OrderData } from "./Order";
import { Riwayat } from "./Riwayat";
import { Pendapatan } from "./Pendapatan";
import { Profile } from "./Profile";

interface ProductItem {
  id: number;
  name: string;
  store: string;
  price: number;
  rating: number;
  sold: number;
  img: string;
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
    profileImage: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300&h=300&fit=crop&q=80",
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
    }));
  }, [authAccount]);

  // 2. Global Products State
  const [products, setProducts] = useState<ProductItem[]>([
    {
      id: 1,
      name: "Nasi Timbel Komplit",
      store: "Toko Sembako Berkah",
      price: 25000,
      rating: 4.8,
      sold: 12,
      img: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=300&h=300&fit=crop&q=80",
      cat: "Makanan",
      description: "Nasi timbel khas Sunda lengkap dengan ayam bakar, tahu, tempe, lalapan segar dan sambal goang pedas.",
      stock: 15,
      isActive: true,
    },
    {
      id: 2,
      name: "Batik Kawung Premium",
      store: "Toko Sembako Berkah",
      price: 185000,
      rating: 4.9,
      sold: 8,
      img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=300&fit=crop&q=80",
      cat: "Fashion",
      description: "Batik tulis motif kawung klasik premium dengan kain primissima sutra yang halus dan dingin dipakai.",
      stock: 4,
      isActive: true,
    },
    {
      id: 3,
      name: "Tas Anyaman Rotan",
      store: "Toko Sembako Berkah",
      price: 75000,
      rating: 4.7,
      sold: 16,
      img: "https://images.unsplash.com/photo-1547949003-9792a18a2601?w=300&h=300&fit=crop&q=80",
      cat: "Kerajinan",
      description: "Tas anyaman rotan bulat estetis, dibuat handmade oleh pengrajin lokal Kamojang PGE.",
      stock: 0,
      isActive: true,
    },
  ]);

  // 3. Global Orders State
  const [orders, setOrders] = useState<OrderData[]>([
    {
      id: "MKT-2408",
      customer: "Bambang Wijaya",
      customerPhone: "0812 3456 7890",
      items: [{ name: "Nasi Timbel Komplit", quantity: 2, price: 25000 }],
      total: 50000,
      subtotal: 50000,
      deliveryFee: 0,
      time: "10:24",
      status: "Menunggu",
      driver: null,
      unreadCustomerMessages: 1,
      unreadDriverMessages: 0,
    },
    {
      id: "MKT-2407",
      customer: "Siti Aminah",
      customerPhone: "0821 9876 5432",
      items: [
        { name: "Ayam Bakar Madu", quantity: 1, price: 28000 },
        { name: "Es Jeruk", quantity: 2, price: 8000 },
      ],
      total: 44000,
      subtotal: 44000,
      deliveryFee: 0,
      time: "09:48",
      status: "Diproses",
      driver: {
        name: "Driver Rangers",
        vehicle: "Motor",
        plateNumber: "B 1234 XYZ",
        rating: 4.9,
        stage: "Driver menuju outlet",
        distance: "1,2 km",
        eta: "5 menit",
      },
      unreadCustomerMessages: 0,
      unreadDriverMessages: 1,
    },
    {
      id: "MKT-2406",
      customer: "Rani Setiawati",
      customerPhone: "0857 1122 3344",
      items: [{ name: "Nasi Timbel Komplit", quantity: 3, price: 25000 }],
      total: 75000,
      subtotal: 75000,
      deliveryFee: 0,
      time: "09:15",
      status: "Selesai",
      driver: {
        name: "Andi Kurniawan",
        vehicle: "Motor",
        plateNumber: "D 4455 AB",
        rating: 4.8,
        stage: "Pesanan selesai",
        distance: "0 km",
        eta: "-",
      },
      unreadCustomerMessages: 0,
      unreadDriverMessages: 0,
    },
  ]);

  // 4. Global Withdrawals State
  const [withdrawals, setWithdrawals] = useState<any[]>([
    {
      id: "WDR-1234",
      amount: 150000,
      method: "GoPay",
      destination: "0812-3456-7890",
      createdAt: "08 Agu, 14:20",
      status: "Sukses",
    },
  ]);

  // UI States inside Beranda View
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [productFormVisible, setProductFormVisible] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);

  // Form states for product
  const [prodName, setProdName] = useState("");
  const [prodDesc, setProdDesc] = useState("");
  const [prodCat, setProdCat] = useState("Makanan");
  const [prodPrice, setProdPrice] = useState("");
  const [prodStock, setProdStock] = useState("");
  const [prodActive, setProdActive] = useState(true);
  const [prodImg, setProdImg] = useState("");

  const handleOpenProductForm = (product: ProductItem | null = null) => {
    if (product) {
      setEditingProduct(product);
      setProdName(product.name);
      setProdDesc(product.description);
      setProdCat(product.cat);
      setProdPrice(product.price.toString());
      setProdStock(product.stock.toString());
      setProdActive(product.isActive);
      setProdImg(product.img);
    } else {
      setEditingProduct(null);
      setProdName("");
      setProdDesc("");
      setProdCat("Makanan");
      setProdPrice("");
      setProdStock("");
      setProdActive(true);
      setProdImg("");
    }
    setProductFormVisible(true);
  };

  const handleSaveProduct = () => {
    if (prodName.trim() === "" || prodPrice.trim() === "" || prodStock.trim() === "") {
      Alert.alert("Error", "Mohon isi semua field wajib");
      return;
    }

    const priceNum = parseInt(prodPrice);
    const stockNum = parseInt(prodStock);

    if (isNaN(priceNum) || priceNum <= 0) {
      Alert.alert("Error", "Harga produk harus lebih dari 0.");
      return;
    }
    if (isNaN(stockNum) || stockNum < 0) {
      Alert.alert("Error", "Stok produk tidak boleh negatif.");
      return;
    }

    if (editingProduct) {
      // Edit mode
      const updated = products.map((p) => {
        if (p.id === editingProduct.id) {
          return {
            ...p,
            name: prodName.trim(),
            description: prodDesc.trim(),
            cat: prodCat,
            price: priceNum,
            stock: stockNum,
            isActive: prodActive,
            img: prodImg || p.img,
          };
        }
        return p;
      });
      setProducts(updated);
      Alert.alert("Sukses", "Menu berhasil diperbarui");
    } else {
      // Add mode
      const newProduct: ProductItem = {
        id: Date.now(),
        name: prodName.trim(),
        store: storeInfo.storeName,
        price: priceNum,
        rating: 0,
        sold: 0,
        img: prodImg || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&h=300&fit=crop&q=80",
        cat: prodCat,
        description: prodDesc.trim(),
        stock: stockNum,
        isActive: prodActive,
      };
      setProducts([newProduct, ...products]);
      Alert.alert("Sukses", "Menu baru berhasil ditambahkan");
    }

    setProductFormVisible(false);
  };

  const handleDeleteProduct = (productId: number) => {
    Alert.alert("Hapus Menu?", "Apakah Anda yakin ingin menghapus menu ini dari daftar?", [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: () => {
          setProducts(products.filter((p) => p.id !== productId));
          Alert.alert("Sukses", "Menu telah dihapus");
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
        return <Order orders={orders} setOrders={setOrders} />;
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
        {/* Header */}
        <View style={styles.topHeader}>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.greetingText}>Halo, {storeInfo.ownerName}</Text>
            <Text style={styles.subGreetingText}>Selamat datang kembali di marketplace Anda.</Text>
          </View>
          <TouchableOpacity 
            style={styles.notifBtn} 
            onPress={() => setNotifModalVisible(true)}
            activeOpacity={0.7}
          >
            <Bell size={20} color="#1B7A4E" />
            <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeText}>3</Text>
            </View>
          </TouchableOpacity>
        </View>

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
            onPress={() => Alert.alert("Kelola Produk", "Gunakan kartu produk di bawah untuk edit, stok, dan status.")}
            activeOpacity={0.8}
          >
            <StoreIcon size={20} color="#1B7A4E" />
            <Text style={styles.quickActionLabel}>Kelola Produk</Text>
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
          <TouchableOpacity 
            style={styles.addMenuBtn} 
            onPress={() => handleOpenProductForm(null)}
            activeOpacity={0.8}
          >
            <Plus size={16} color="#FFFFFF" />
            <Text style={styles.addMenuBtnText}>Tambah Menu</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.productList}>
          {products.length === 0 ? (
            <View style={styles.emptyProductsCard}>
              <StoreIcon size={34} color="#1B7A4E" />
              <Text style={styles.emptyProductsTitle}>Belum ada menu</Text>
              <Text style={styles.emptyProductsDesc}>Tambahkan menu pertama agar tampil di marketplace customer.</Text>
            </View>
          ) : (
            products.slice(0, 3).map((product) => {
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
                  <Text style={styles.notifRowDesc}>Pesanan marketplace terbaru tersedia untuk diproses.</Text>
                </View>
                <Text style={styles.notifTime}>Baru saja</Text>
              </TouchableOpacity>

              <View style={styles.notifItemRow}>
                <View style={styles.notifIconBg}>
                  <AlertTriangle size={18} color="#1B7A4E" />
                </View>
                <View style={styles.notifBody}>
                  <Text style={styles.notifRowTitle}>Stok perlu dicek</Text>
                  <Text style={styles.notifRowDesc}>Periksa produk dengan stok menipis di Beranda.</Text>
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

      {/* 2. Modal Add/Edit Product Form Sheet */}
      <Modal visible={productFormVisible} transparent animationType="slide">
        <View style={styles.modalBgBottom}>
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{editingProduct ? "Edit Menu" : "Tambah Menu"}</Text>
              <TouchableOpacity onPress={() => setProductFormVisible(false)}>
                <X size={20} color="#111827" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer}>
              <Text style={styles.inputLabel}>Foto Menu URL (Opsional)</Text>
              <TextInput
                style={styles.textInput}
                value={prodImg}
                onChangeText={setProdImg}
                placeholder="https://unsplash.com/..."
              />

              <Text style={styles.inputLabel}>Nama Menu</Text>
              <TextInput
                style={styles.textInput}
                value={prodName}
                onChangeText={setProdName}
                placeholder="Nama Menu Produk"
              />

              <Text style={styles.inputLabel}>Deskripsi</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={prodDesc}
                onChangeText={setProdDesc}
                placeholder="Tulis deskripsi menu..."
                multiline
                numberOfLines={2}
              />

              <Text style={styles.inputLabel}>Kategori</Text>
              <View style={styles.categoriesRow}>
                {["Makanan", "Minuman", "Fashion", "Kesehatan", "Kerajinan"].map((cat) => {
                  const selected = prodCat === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.catBtn,
                        selected ? styles.catBtnSelected : styles.catBtnUnselected,
                      ]}
                      onPress={() => setProdCat(cat)}
                    >
                      <Text
                        style={[
                          styles.catBtnText,
                          selected ? styles.catBtnTextSelected : styles.catBtnTextUnselected,
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.inputLabel}>Harga (Rp)</Text>
              <TextInput
                style={styles.textInput}
                value={prodPrice}
                onChangeText={setProdPrice}
                placeholder="Contoh: 25000"
                keyboardType="numeric"
              />

              <Text style={styles.inputLabel}>Stok</Text>
              <TextInput
                style={styles.textInput}
                value={prodStock}
                onChangeText={setProdStock}
                placeholder="Contoh: 15"
                keyboardType="numeric"
              />

              <View style={styles.switchRow}>
                <View style={styles.switchTextCol}>
                  <Text style={styles.switchLabel}>Menu Tersedia</Text>
                  <Text style={styles.switchSub}>Menu nonaktif atau stok 0 tidak dapat dipesan customer.</Text>
                </View>
                <Switch
                  value={prodActive}
                  onValueChange={setProdActive}
                  trackColor={{ false: "#D1D5DB", true: "#DCFCE7" }}
                  thumbColor={prodActive ? "#1B7A4E" : "#9CA3AF"}
                />
              </View>

              <View style={styles.sheetActions}>
                <TouchableOpacity
                  style={[styles.sheetBtn, styles.sheetBtnOutline]}
                  onPress={() => setProductFormVisible(false)}
                >
                  <Text style={styles.sheetBtnTextOutline}>Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sheetBtn, styles.sheetBtnSolid]}
                  onPress={handleSaveProduct}
                >
                  <Text style={styles.sheetBtnTextSolid}>Simpan Menu</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
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
    paddingTop: 16,
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
});

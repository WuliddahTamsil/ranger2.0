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
  Alert,
} from "react-native";
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
  Star,
  Plus,
  Minus,
  CheckCircle,
  Heart,
} from "lucide-react-native";
import { rp } from "../../utils/formatters";
import { PRODUCTS, RESTAURANTS, LAUNDRIES, KOS_LIST, NOTIFS } from "../../constants/mockData";
import { Nav, OrderItem } from "../../types";
import { AuthAccount } from "../auth/authTypes";

// Import other customer screens
import { Jelajah } from "./Jelajah";
import { Pesanan } from "./Pesanan";
import { Inbox, CustomerNotification, CustomerChatThread } from "./Inbox";
import { Profile } from "./Profile";
import { hydrateCustomerChatThreads, subscribeCustomerChatThreads } from "./customerInboxStore";
import { getAllActiveCateringProducts, getMarketplaceProducts, getMarketplaceOrdersForCustomer, getCateringOrdersForCustomer } from "../../services/api";

interface CartItem {
  id: number | string;
  name: string;
  price: number;
  qty: number;
  store: string;
  img: string;
  ownerId?: string;
}

interface CustomerHomeProps extends Nav {
  authAccount?: AuthAccount | null;
}

export const Beranda: React.FC<CustomerHomeProps> = ({ navigate, authAccount }) => {
  const [currentTab, setCurrentTab] = useState<number>(0);

  // Global customer profile states
  const [customerName, setCustomerName] = useState(authAccount?.name || "");
  const [customerPhone, setCustomerPhone] = useState(authAccount?.phone || "");
  const [customerAddress, setCustomerAddress] = useState(authAccount?.address || "");
  const [customerLocation, setCustomerLocation] = useState(authAccount?.address || "");

  useEffect(() => {
    if (!authAccount) return;
    setCustomerName(authAccount.name);
    setCustomerPhone(authAccount.phone);
    setCustomerAddress(authAccount.address);
    setCustomerLocation(authAccount.address);
  }, [authAccount]);

  // Global Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartModalVisible, setCartModalVisible] = useState(false);
  const [products, setProducts] = useState<any[]>(PRODUCTS);

  useEffect(() => {
    let active = true;
    Promise.all([getMarketplaceProducts(), getAllActiveCateringProducts()]).then(([marketplace, catering]) => {
      if (!active) return;
      const marketplaceProducts = marketplace.success ? marketplace.data.map((product: any) => ({
        id: product._id,
        name: product.name,
        store: product.ownerId?.roleData?.businessName || product.ownerId?.name || "The Ranger Marketplace",
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
      })) : [];
      const cateringProducts = catering.success ? catering.data.map((product: any) => ({
        id: product._id,
        name: product.name,
        store: product.ownerId?.roleData?.businessName || product.ownerId?.name || "Pemilik Catering",
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
        cat: product.cat || "Makanan",
        ownerId: product.ownerId?._id || product.ownerId,
      })) : [];
      const liveProducts = [...marketplaceProducts, ...cateringProducts];
      if (liveProducts.length > 0) setProducts(liveProducts);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!authAccount?.id) return;
    const loadBackendOrders = async () => {
      const [marketplaceResult, cateringResult] = await Promise.all([
        getMarketplaceOrdersForCustomer(authAccount.id),
        getCateringOrdersForCustomer(authAccount.id),
      ]);
      if (!activeOrderLoader) return;
      const marketplaceOrders = marketplaceResult.success ? marketplaceResult.data.map((order: any) => ({
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
        items: order.items,
        notes: order.notes,
        address: order.address,
      })) : [];
      const cateringOrders = cateringResult.success ? cateringResult.data.map((order: any) => ({
        id: order._id,
        type: "Catering",
        iconName: "Coffee",
        color: "#EA580C",
        item: order.menuName,
        detail: `${order.portions} porsi`,
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
        cateringDate: order.cateringDate,
        cateringTime: order.cateringTime,
        cateringPortions: order.portions,
        notes: order.notes,
        address: order.address,
      })) : [];
      setOrders([...marketplaceOrders, ...cateringOrders]);
    };
    let activeOrderLoader = true;
    void loadBackendOrders();
    const interval = setInterval(() => void loadBackendOrders(), 10000);
    return () => {
      activeOrderLoader = false;
      clearInterval(interval);
    };
  }, [authAccount?.id]);

  // Global Orders State
  const [orders, setOrders] = useState<OrderItem[]>([]);

  // Global Notifications State
  const [notifications, setNotifications] = useState<CustomerNotification[]>(
    NOTIFS.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      msg: n.msg,
      time: n.time,
      read: n.read,
    }))
  );

  // Global Chat Threads State
  const [chatThreads, setChatThreads] = useState<CustomerChatThread[]>([
    {
      id: "ch_001",
      orderId: "RNG001",
      participantType: "driver",
      participantName: "Pak Asep (Driver)",
      lastMessage: "Pak, saya sudah di depan pagar ya.",
      updatedAt: "11:05",
      unreadCount: 1,
    },
    {
      id: "ch_002",
      orderId: "RNG003",
      participantType: "merchant",
      participantName: "Catering Bu Haji Nani",
      lastMessage: "Nasi Box 20 pax sedang disiapkan ya kak.",
      updatedAt: "10:30",
      unreadCount: 0,
    },
  ]);

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
  const [reviews, setReviews] = useState<any[]>([
    { id: "REV-101", orderId: "RNG002", rating: 5, comment: "Laundry sangat cepat dan wangi!" },
  ]);

  // Global Wishlist/Liked products State
  const [wishlist, setWishlist] = useState<number[]>([2, 5]); // IDs of liked products

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

    const orderId = `RNG0${orders.length + 1}`;
    const firstItem = cart[0];
    const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
    const totalPrice = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

    const newOrder: OrderItem = {
      id: orderId,
      type: "Marketplace",
      iconName: "Store",
      color: "#1B7A4E",
      item: firstItem.name,
      detail: totalQty > 1 ? `${firstItem.store} · +${totalQty - 1} item lainnya` : firstItem.store,
      status: "Diproses",
      statusColor: "orange",
      date: "Hari ini",
      total: totalPrice,
    };

    // Add automated driver notification
    const newNotif: CustomerNotification = {
      id: Date.now(),
      type: "order",
      title: "Pesanan Diproses ⏳",
      msg: `Pesanan #${orderId} sedang diproses oleh merchant partner`,
      time: "Baru saja",
      read: false,
    };
    setNotifications([newNotif, ...notifications]);

    setCart([]);
    setCartModalVisible(false);
    Alert.alert("Checkout Sukses", `Pesanan #${orderId} berhasil dibuat. Silakan pantau pengiriman di tab Pesanan.`, [
      { text: "Tutup" },
      { text: "Lihat Pesanan", onPress: () => setCurrentTab(2) },
    ]);
  };

  const handleToggleLike = (id: number) => {
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

  // Nav configuration
  const navItems = [
    { label: "Beranda", icon: Home },
    { label: "Jelajah", icon: Map },
    { label: "Riwayat", icon: ShoppingBag },
    { label: "Inbox", icon: MessageCircle },
    { label: "Profile", icon: UserIcon },
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
            rating={(4.8).toString()}
            navigate={navigate}
          />
        );
      default:
        return renderBerandaContent();
    }
  };

  // Main Beranda layout panel
  const renderBerandaContent = () => {
    return (
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top green bar */}
        <View style={styles.topBar}>
          <View style={styles.headerBgCircle1 as any} />
          <View style={styles.headerBgCircle2 as any} />
          <View style={styles.locationCol}>
            <Text style={styles.locationLabel}>Halo, {customerName.split(" ")[0]} 👋</Text>
            <Text style={styles.locationQuest}>Temukan layanan UMKM lokal terbaik untuk harimu</Text>
            <View style={styles.mapPinRow}>
              <MapPin size={12} color="#A7F3D0" />
              <Text style={styles.mapPinVal} numberOfLines={1}>
                {customerLocation} · {customerAddress}
              </Text>
            </View>
          </View>

          <View style={styles.actionBtnGroup}>
            <TouchableOpacity 
              style={styles.headerBtn}
              onPress={() => setCartModalVisible(true)}
              activeOpacity={0.7}
            >
              <ShoppingBag size={18} color="#FFFFFF" />
              {totalCartCount > 0 && (
                <View style={styles.badgeCount}>
                  <Text style={styles.badgeCountText}>{totalCartCount}</Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.headerBtn}
              onPress={() => setCurrentTab(3)} // Redirect to inbox notifications
              activeOpacity={0.7}
            >
              <Bell size={18} color="#FFFFFF" />
              {notifications.filter((n) => !n.read).length > 0 && (
                <View style={[styles.badgeCount, { backgroundColor: "#EF4444" }]}>
                  <Text style={styles.badgeCountText}>
                    {notifications.filter((n) => !n.read).length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Search bar simulation */}
        <TouchableOpacity 
          style={styles.searchBarBtn}
          onPress={() => setCurrentTab(1)} // Redirect to explore tab
          activeOpacity={0.8}
        >
          <Search size={18} color="#9CA3AF" />
          <Text style={styles.searchPlaceholderText}>Cari layanan UMKM, catering, laundry, atau kos...</Text>
        </TouchableOpacity>

        {/* Promo slide card */}
        <View style={styles.promoBanner}>
          <Text style={styles.promoLabel}>PROMO HARI INI</Text>
          <Text style={styles.promoTitle}>Diskon 20% UMKM Kamojang</Text>
          <Text style={styles.promoSub}>Klaim voucher PGE 2.0 di halaman pembayaran</Text>
        </View>

        {/* Service grid row */}
        <Text style={styles.sectionTitle}>Layanan Utama</Text>
        <View style={styles.servicesGrid}>
          {/* Marketplace -> Kanyaah Mart */}
          <TouchableOpacity style={styles.serviceItem} onPress={() => navigate("c_marketplace")} activeOpacity={0.75}>
            <View style={[styles.serviceIconBg, { backgroundColor: "#E8F5EE" }]}>
              <Store size={22} color="#1B7A4E" />
            </View>
            <Text style={styles.serviceText}>Kanyaah{"\n"}Mart</Text>
          </TouchableOpacity>

          {/* Catering -> Kanyaah Catering */}
          <TouchableOpacity style={styles.serviceItem} onPress={() => openServiceDetail({ id: "catering", name: "Catering", description: "Pesan makanan catering untuk kebutuhan harian, acara, atau keluarga.", price: "Harga sesuai menu", provider: "Pemilik Catering The Ranger", rating: 4.8, action: () => navigate("c_catering"), images: products.filter((p) => p.cat === "Makanan").slice(0, 3).map((p) => p.img) })} activeOpacity={0.75}>
            <View style={[styles.serviceIconBg, { backgroundColor: "#FFEDD5" }]}>
              <Coffee size={22} color="#EA580C" />
            </View>
            <Text style={styles.serviceText}>Kanyaah{"\n"}Catering</Text>
          </TouchableOpacity>

          {/* Laundry -> Kanyaah Laundry */}
          <TouchableOpacity style={styles.serviceItem} onPress={() => openServiceDetail({ id: "laundry", name: "Laundry", description: "Layanan laundry praktis dengan pilihan proses sesuai kebutuhanmu.", price: "Mulai dari harga layanan", provider: "Mitra Laundry The Ranger", rating: 4.8, action: () => navigate("c_laundry"), images: [] })} activeOpacity={0.75}>
            <View style={[styles.serviceIconBg, { backgroundColor: "#E0F2FE" }]}>
              <Wind size={22} color="#0284C7" />
            </View>
            <Text style={styles.serviceText}>Kanyaah{"\n"}Laundry</Text>
          </TouchableOpacity>

          {/* Kos -> Kanyaah Homestay */}
          <TouchableOpacity style={styles.serviceItem} onPress={() => openServiceDetail({ id: "kos", name: "Homestay", description: "Temukan tempat tinggal yang nyaman dan sesuai kebutuhanmu.", price: "Harga sesuai kamar", provider: "Mitra Homestay The Ranger", rating: 4.8, action: () => navigate("c_kos"), images: [] })} activeOpacity={0.75}>
            <View style={[styles.serviceIconBg, { backgroundColor: "#F3E8FF" }]}>
              <Building size={22} color="#9333EA" />
            </View>
            <Text style={styles.serviceText}>Kanyaah{"\n"}Homestay</Text>
          </TouchableOpacity>
        </View>

        {/* Nearby Stores horizontal lists */}
        <Text style={styles.sectionTitle}>Marketplace Terdekat</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScrollList}>
          {[...new Set(products.map((product) => product.store))].map((store) => {
            const rating = getStoreRating(store);
            return (
              <TouchableOpacity
                key={store}
                style={styles.storeCard}
                onPress={() => setMarketModalVisible(true)}
              >
                <View style={styles.storeCardHeader}>
                  <View style={styles.avatarMiniBg}>
                    <Store size={16} color="#1B7A4E" />
                  </View>
                  <View style={styles.storeCardBody}>
                    <Text style={styles.storeCardTitle} numberOfLines={1}>{store}</Text>
                    <Text style={styles.storeCardRating}>★ {rating} · Buka sekarang</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Selected products grid lists */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Menu & Produk Pilihan</Text>
          <TouchableOpacity onPress={() => setCurrentTab(1)}>
            <Text style={styles.seeAllText}>Lihat semua</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.productsGrid}>
          {filteredMarketProducts.slice(0, 4).map((p: any) => {
            const isLiked = wishlist.includes(p.id);
            return (
              <TouchableOpacity key={p.id} style={styles.productCard} onPress={() => openProductDetail(p)} activeOpacity={0.9}>
                <Image source={{ uri: p.img }} style={styles.productImg as any} />
                
                <TouchableOpacity 
                  style={styles.heartIconBtn}
                  onPress={() => handleToggleLike(p.id)}
                >
                  <Heart size={14} color={isLiked ? "#EF4444" : "#9CA3AF"} fill={isLiked ? "#EF4444" : "none"} />
                </TouchableOpacity>

                <View style={styles.productCardBody}>
                  <Text style={styles.productStoreName} numberOfLines={1}>{p.store}</Text>
                  <Text style={styles.productItemName} numberOfLines={1}>{p.name}</Text>
                  
                  <View style={styles.productCardFooter}>
                    <Text style={styles.productPriceText}>{rp(p.price)}</Text>
                    <TouchableOpacity 
                      style={styles.addButtonMini}
                      onPress={() => {
                        handleAddToCart(p);
                        Alert.alert("Sukses", `${p.name} dimasukkan ke keranjang belanja.`);
                      }}
                    >
                      <Plus size={12} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Active Tab Panel */}
      <View style={styles.tabContainer}>{renderTabContent()}</View>

      {/* Fixed bottom navigation bar */}
      <View style={styles.bottomNav}>
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
                <IconComp size={18} color={active ? "#1B7A4E" : "#9CA3AF"} />
              </View>
              <Text style={[styles.navLabel, active ? styles.navLabelActive : null]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* MODAL 1: MARKETPLACE */}
      <Modal visible={marketModalVisible} transparent animationType="slide">
        <View style={styles.modalBgBottom}>
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>The Ranger Marketplace</Text>
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
            {selectedService && <><View style={styles.sheetHeader}><Text style={styles.sheetTitle}>{selectedService.name}</Text><TouchableOpacity onPress={() => setSelectedService(null)}><X size={20} color="#111827" /></TouchableOpacity></View><ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.detailScroll}><ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false}>{(selectedService.images.length ? selectedService.images : [products[0]?.img]).filter(Boolean).map((image: string, index: number) => <View key={index} style={styles.carouselSlide}><Image source={{ uri: image }} style={styles.detailImage} /><Text style={styles.imageCounter}>{index + 1}/{selectedService.images.length || 1}</Text></View>)}</ScrollView><Text style={styles.detailProductName}>{selectedService.name}</Text><Text style={styles.detailDescription}>{selectedService.description}</Text><View style={styles.storeInfoCard}><Store size={20} color="#1B7A4E" /><View style={{ flex: 1 }}><Text style={styles.storeInfoName}>{selectedService.provider}</Text><Text style={styles.mutedText}>{selectedService.price}</Text></View></View><View style={styles.detailRatingRow}><Text style={styles.ratingStars}>★ {selectedService.rating}</Text><Text style={styles.mutedText}>Layanan The Ranger</Text></View><Text style={styles.detailSectionTitle}>Ulasan Pengguna</Text><Text style={styles.mutedText}>Ulasan akan tampil setelah customer menyelesaikan pesanan.</Text></ScrollView><TouchableOpacity style={styles.detailAddButton} onPress={() => { const action = selectedService.action; setSelectedService(null); action(); }}><Text style={styles.checkoutBtnText}>Lihat Layanan</Text><ChevronRight size={17} color="#FFFFFF" /></TouchableOpacity></>}
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
                    <Text style={styles.totalLabel}>Total Pembayaran</Text>
                    <Text style={styles.totalValText}>{rp(totalCartPrice)}</Text>
                  </View>

                  <TouchableOpacity 
                    style={styles.checkoutBtn}
                    onPress={handleCheckout}
                  >
                    <CheckCircle size={16} color="#FFFFFF" />
                    <Text style={styles.checkoutBtnText}>Checkout Sekarang</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F7F5",
  },
  tabContainer: {
    flex: 1,
  },
  bottomNav: {
    height: 72,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingBottom: 6,
    elevation: 10,
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -4 },
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    height: "100%",
  },
  navIconBg: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  navIconBgActive: {
    backgroundColor: "rgba(27, 122, 78, 0.1)",
  },
  navLabel: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 4,
    fontWeight: "500",
  },
  navLabelActive: {
    color: "#1B7A4E",
    fontWeight: "800",
  },
  scrollContent: {
    paddingBottom: 36,
  },
  topBar: {
    backgroundColor: "#1B7A4E",
    paddingHorizontal: 20,
    paddingTop: 44,
    paddingBottom: 28,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    borderBottomLeftRadius: 34,
    borderBottomRightRadius: 34,
    position: "relative",
    overflow: "hidden",
  },
  headerBgCircle1: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(255,255,255,0.1)",
    top: -52,
    right: -40,
  },
  headerBgCircle2: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: "rgba(255,255,255,0.06)",
    bottom: -36,
    left: -34,
  },
  locationCol: {
    flex: 1,
    paddingRight: 16,
    gap: 2,
    zIndex: 2,
  },
  locationLabel: {
    color: "#A7F3D0",
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  locationQuest: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    marginTop: 2,
  },
  mapPinRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    alignSelf: "flex-start",
  },
  mapPinVal: {
    fontSize: 10,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  actionBtnGroup: {
    flexDirection: "row",
    gap: 8,
    zIndex: 2,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  badgeCount: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#EF4444",
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: "#1B7A4E",
  },
  badgeCountText: {
    color: "#FFFFFF",
    fontSize: 8,
    fontWeight: "900",
  },
  searchBarBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 18,
    height: 52,
    marginHorizontal: 20,
    marginTop: -24,
    gap: 10,
    elevation: 8,
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  searchPlaceholderText: {
    fontSize: 13,
    color: "#94A3B8",
    fontWeight: "500",
  },
  promoBanner: {
    backgroundColor: "#ECFDF5",
    borderRadius: 20,
    padding: 18,
    marginHorizontal: 20,
    marginTop: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  promoLabel: {
    color: "#047857",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },
  promoTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#064E3B",
  },
  promoSub: {
    fontSize: 12,
    color: "#166534",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1E293B",
    marginHorizontal: 20,
    marginTop: 26,
    marginBottom: 12,
  },
  servicesGrid: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 10,
  },
  serviceItem: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingVertical: 14,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 112,
    gap: 8,
    elevation: 3,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  serviceIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  serviceText: {
    fontSize: 10.5,
    fontWeight: "800",
    color: "#1E293B",
    textAlign: "center",
    lineHeight: 14,
  },
  horizontalScrollList: {
    paddingHorizontal: 20,
    gap: 12,
  },
  storeCard: {
    width: 178,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingVertical: 14,
    paddingHorizontal: 14,
    elevation: 3,
    shadowColor: "#0F172A",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  storeCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatarMiniBg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#E8F5EE",
    alignItems: "center",
    justifyContent: "center",
  },
  storeCardBody: {
    flex: 1,
    gap: 1,
  },
  storeCardTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1E293B",
  },
  storeCardRating: {
    fontSize: 10,
    color: "#475569",
    fontWeight: "700",
  },
  storeCardStatus: {
    fontSize: 9,
    color: "#22C55E",
    fontWeight: "800",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#1B7A4E",
    marginTop: 0,
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
  heartIconBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#FFFFFF",
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 2,
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
    color: "#1B7A4E",
  },
  addButtonMini: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: "#1B7A4E",
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

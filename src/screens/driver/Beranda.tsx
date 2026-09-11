import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StyleSheet,
  SafeAreaView,
  Image,
  Modal,
  Alert,
} from "react-native";
import {
  Home,
  ShoppingBag,
  TrendingUp,
  Wallet,
  User as UserIcon,
  Bell,
  Navigation,
  MapPin,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Truck,
  ArrowRight,
  ChevronRight,
  X,
} from "lucide-react-native";
import { rp } from "../../utils/formatters";
import { Nav } from "../../types";
import { AuthAccount } from "../auth/authTypes";
import { RoleHeader } from "../../components/RoleHeader";
import {
  getMarketplaceOrdersForDriver,
  updateMarketplaceOrderStatus,
  assignMarketplaceDriver,
  getCateringOrdersForDriver,
  updateCateringOrderStatus,
  assignCateringDriver,
  getNotifications,
  markNotificationRead,
} from "../../services/api";
import {
  fetchDriverLaundryJobs,
  takeLaundryPickupJob,
  pickedUpLaundryByDriver,
  arrivedLaundryAtStore,
  takeLaundryDeliveryJob,
  completeLaundryDelivery,
} from "../../services/laundryService";

// Import other screens
import { Order, DriverOrder } from "./Order";
import { Pendapatan } from "./Pendapatan";
import { Keuangan, TransactionRecord } from "./Keuangan";
import { Profile } from "./Profile";

interface DriverHomeProps extends Nav {
  authAccount?: AuthAccount | null;
}

type DriverDocumentStatus = "Terverifikasi" | "Menunggu Verifikasi" | "Belum Lengkap";

const getDriverDocumentStatus = (account: AuthAccount | null | undefined, key: string): DriverDocumentStatus => {
  const document = account?.documents?.[key];
  if (!document) return "Belum Lengkap";
  if (account?.status === "verified" || document.status === "verified") return "Terverifikasi";
  return "Menunggu Verifikasi";
};

export const Beranda: React.FC<DriverHomeProps> = ({ navigate, authAccount }) => {
  const [currentTab, setCurrentTab] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [driverNotifs, setDriverNotifs] = useState<any[]>([]);

  useEffect(() => {
    if (!authAccount?.id || !notifModalVisible) return;
    void getNotifications(authAccount.id).then((res) => {
      if (res.success && Array.isArray(res.data)) {
        setDriverNotifs(res.data);
      }
    });
  }, [authAccount?.id, notifModalVisible]);

  // 1. Global Driver Info State
  const [driverInfo, setDriverInfo] = useState(() => ({
    name: authAccount?.name || "",
    phone: authAccount?.phone || "",
    email: authAccount?.email || "",
    profilePhoto: authAccount?.profilePhoto,
    rating: 0,
    avatarLetter: authAccount?.name?.trim().charAt(0).toUpperCase() || "?",
    vehicle: {
      type: authAccount?.roleData.vehicleType || "Belum diisi",
      brand: authAccount?.roleData.vehicleBrand || "Belum diisi",
      plate: authAccount?.roleData.plateNumber || "Belum diisi",
      year: authAccount?.roleData.vehicleYear || "Belum diisi",
      verified: authAccount?.status === "verified",
    },
    documents: {
      ktp: getDriverDocumentStatus(authAccount, "ktp"),
      sim: getDriverDocumentStatus(authAccount, "sim"),
      stnk: getDriverDocumentStatus(authAccount, "stnk"),
    },
    payment: {
      bankName: authAccount?.roleData.bankName || "",
      accountNo: authAccount?.roleData.accountNo || "",
      holderName: authAccount?.name?.toUpperCase() || "",
      gopayNo: authAccount?.roleData.gopayNo || "",
    }
  }));

  useEffect(() => {
    if (!authAccount) return;
    setDriverInfo((current) => ({
      ...current,
      name: authAccount.name,
      phone: authAccount.phone,
      email: authAccount.email,
      profilePhoto: authAccount.profilePhoto,
      avatarLetter: authAccount.name.trim().charAt(0).toUpperCase() || "?",
      vehicle: {
        ...current.vehicle,
        type: authAccount.roleData.vehicleType || current.vehicle.type,
        brand: authAccount.roleData.vehicleBrand || current.vehicle.brand,
        plate: authAccount.roleData.plateNumber || current.vehicle.plate,
        year: authAccount.roleData.vehicleYear || current.vehicle.year,
        verified: authAccount.status === "verified",
      },
      documents: {
        ktp: getDriverDocumentStatus(authAccount, "ktp"),
        sim: getDriverDocumentStatus(authAccount, "sim"),
        stnk: getDriverDocumentStatus(authAccount, "stnk"),
      },
      payment: {
        ...current.payment,
        bankName: authAccount.roleData.bankName || current.payment.bankName,
        accountNo: authAccount.roleData.accountNo || current.payment.accountNo,
        holderName: authAccount.name.toUpperCase(),
        gopayNo: authAccount.roleData.gopayNo || current.payment.gopayNo,
      },
    }));
  }, [authAccount]);

  // 2. Global Balance State
  const [balance, setBalance] = useState<number>(0);

  // 3. Global Orders State
  const [orders, setOrders] = useState<DriverOrder[]>([]);

  useEffect(() => {
    if (!authAccount?.id) {
      setOrders([]);
      return;
    }
    const loadOrders = async () => {
      const [mktRes, catRes, laundryJobs] = await Promise.all([
        getMarketplaceOrdersForDriver(authAccount.id),
        getCateringOrdersForDriver(authAccount.id),
        fetchDriverLaundryJobs(),
      ]);

      const normalizeStatus = (rawStatus: string): DriverOrder["status"] => {
        if (rawStatus === "Menuju Pickup") return "Menuju Pickup";
        if (rawStatus === "Sampai Pickup") return "Sampai Pickup";
        if (rawStatus === "Diambil" || rawStatus === "Mengantar" || rawStatus === "Dikirim") return "Mengantar";
        if (rawStatus === "Selesai") return "Selesai";
        if (rawStatus === "Dibatalkan") return "Dibatalkan";
        return "Menunggu";
      };

      const mktOrders: DriverOrder[] = (mktRes.success && Array.isArray(mktRes.data)) ? mktRes.data.map((order: any) => ({
        id: order._id,
        customer: order.customerName,
        phone: order.customerPhone || "",
        type: "Marketplace" as const,
        time: new Date(order.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        from: order.storeAddress || order.storeName || "Lokasi pickup belum tersedia",
        to: order.address || "Alamat tujuan belum tersedia",
        dist: order.distance ? `${order.distance} km` : "Jarak belum tersedia",
        distanceKm: Number(order.distanceKm ?? order.distance ?? 0),
        pay: Number(order.totalAmount || 0),
        driverShare: Number(order.driverEarnings ?? order.driverFee ?? order.driverTip ?? order.deliveryFee ?? 0),
        completedAt: order.updatedAt || order.createdAt,
        status: normalizeStatus(order.status),
        items: order.items,
        storeName: order.storeName || "Toko marketplace",
        storeAddress: order.storeAddress || "Alamat toko belum tersedia",
        storePhone: order.storePhone || order.merchantPhone || "",
        ownerId: order.ownerId,
        addressSnapshot: order.addressSnapshot || null,
      })) : [];

      const catOrders: DriverOrder[] = (catRes.success && Array.isArray(catRes.data)) ? catRes.data.map((order: any) => ({
        id: order._id,
        customer: order.customerName,
        phone: order.customerPhone || "",
        type: "Catering" as const,
        time: new Date(order.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
        from: order.storeAddress || order.storeName || "Lokasi pickup belum tersedia",
        to: order.address || "Alamat tujuan belum tersedia",
        dist: order.distance ? `${order.distance} km` : "Jarak belum tersedia",
        distanceKm: Number(order.distanceKm ?? order.distance ?? 0),
        pay: Number(order.totalAmount || 0),
        driverShare: Number(order.driverEarnings ?? order.driverFee ?? order.driverTip ?? order.deliveryFee ?? 0),
        completedAt: order.updatedAt || order.createdAt,
        status: normalizeStatus(order.status),
        items: [{ name: `${order.menuName || "Pesanan catering"}${order.portions ? ` (${order.portions} pax)` : ""}`, quantity: Number(order.portions || 1), price: Number(order.price || 0) }],
        storeName: order.storeName || "Dapur catering",
        storeAddress: order.storeAddress || "Alamat dapur belum tersedia",
        storePhone: order.storePhone || order.merchantPhone || "",
        ownerId: order.ownerId,
        addressSnapshot: order.addressSnapshot || null,
      })) : [];

      const lndOrders: DriverOrder[] = Array.isArray(laundryJobs) ? laundryJobs.map((lnd: any) => {
        const isPickupJob =
          lnd.status === "MENUNGGU_DRIVER_JEMPUT" ||
          lnd.status === "DRIVER_MENUJU_CUSTOMER" ||
          lnd.status === "DRIVER_MENUJU_LAUNDRY";

        let orderStatus: DriverOrder["status"] = "Menunggu";
        if (lnd.status === "DRIVER_MENUJU_CUSTOMER") orderStatus = "Menuju Pickup";
        else if (lnd.status === "DRIVER_MENUJU_LAUNDRY" || lnd.status === "DRIVER_MENGANTAR_BALIK") orderStatus = "Mengantar";
        else if (lnd.status === "SELESAI") orderStatus = "Selesai";

        return {
          id: lnd._id || lnd.id,
          customer: lnd.customerName,
          phone: lnd.customerPhone || "",
          type: "Laundry" as const,
          time: new Date(lnd.createdAt || Date.now()).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
          from: isPickupJob ? lnd.pickupAddress : lnd.storeName,
          to: isPickupJob ? lnd.storeName : lnd.deliveryAddress,
          dist: "1.2 km",
          distanceKm: 1.2,
          pay: Number(lnd.totalAmount || 0),
          driverShare: isPickupJob ? Number(lnd.deliveryFeePickup || 4000) : Number(lnd.deliveryFeeDrop || 4000),
          completedAt: lnd.updatedAt || lnd.createdAt,
          status: orderStatus,
          items: [
            {
              name: isPickupJob ? `[Jemput Pakaian Kotor] ${lnd.serviceName}` : `[Antar Pakaian Bersih] ${lnd.serviceName}`,
              quantity: 1,
              price: Number(lnd.laundryCost || 0),
            },
          ],
          storeName: lnd.storeName,
          storeAddress: lnd.storeName,
          storePhone: "0812-3456-7890",
          ownerId: lnd.ownerId,
          addressSnapshot: lnd.addressSnapshot || null,
        };
      }) : [];

      setOrders([...mktOrders, ...catOrders, ...lndOrders]);
    };
    void loadOrders();
    const interval = setInterval(() => void loadOrders(), 4000);
    return () => clearInterval(interval);
  }, [authAccount?.id]);

  // 4. Global Transactions State
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);

  // Pendapatan dan riwayat order selalu dihitung dari order selesai yang dikirim API.
  useEffect(() => {
    const completedTransactions: TransactionRecord[] = orders
      .filter((order) => order.status === "Selesai")
      .map((order) => {
        const completedAt = order.completedAt || order.createdAt;
        const date = completedAt ? new Date(completedAt) : new Date();
        return {
          id: `order-income-${order.id}`,
          type: "in",
          title: `Pendapatan order ${order.id}`,
          description: `Pengantaran ${order.type} selesai`,
          amount: Number(order.driverShare || 0),
          time: Number.isNaN(date.getTime()) ? "Waktu belum tersedia" : date.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" }),
          status: "Sukses",
        };
      });

    setTransactions((current) => {
      const manualTransactions = current.filter((transaction) => !transaction.id.startsWith("order-income-"));
      return [...completedTransactions, ...manualTransactions];
    });

    const earned = completedTransactions.reduce((sum, transaction) => sum + transaction.amount, 0);
    const manualNet = transactions
      .filter((transaction) => !transaction.id.startsWith("order-income-"))
      .reduce((sum, transaction) => sum + (transaction.type === "in" ? transaction.amount : -transaction.amount), 0);
    setBalance(earned + manualNet);
  }, [orders]);

  // Handler quick update status from Beranda active order card
  const handleUpdateStatus = async (orderId: string, nextStatus: DriverOrder["status"]) => {
    let alertMsg = "";

    const targetOrder = orders.find((o) => o.id === orderId);
    if (targetOrder) {
      if (targetOrder.type === "Laundry") {
        if (nextStatus === "Menuju Pickup") {
          if (targetOrder.items?.[0]?.name?.includes("Jemput")) {
            await takeLaundryPickupJob(orderId, {
              driverId: authAccount?.id || "drv_1",
              driverName: authAccount?.name || "Kurir",
              driverPhone: authAccount?.phone || "081234567890",
            });
          } else {
            await takeLaundryDeliveryJob(orderId, {
              driverId: authAccount?.id || "drv_1",
              driverName: authAccount?.name || "Kurir",
              driverPhone: authAccount?.phone || "081234567890",
            });
          }
        } else if (nextStatus === "Sampai Pickup" || nextStatus === "Mengantar") {
          await pickedUpLaundryByDriver(orderId);
        } else if (nextStatus === "Selesai") {
          if (targetOrder.items?.[0]?.name?.includes("Jemput")) {
            await arrivedLaundryAtStore(orderId);
          } else {
            await completeLaundryDelivery(orderId);
          }
        }
      } else if (targetOrder.type === "Catering") {
        await updateCateringOrderStatus(orderId, nextStatus);
      } else {
        await updateMarketplaceOrderStatus(orderId, nextStatus);
      }
    }

    const updated = orders.map((o) => {
      if (o.id === orderId) {
        if (nextStatus === "Menuju Pickup") {
          alertMsg = "Menuju lokasi merchant untuk mengambil pesanan.";
        } else if (nextStatus === "Selesai") {
          alertMsg = `Pengantaran selesai! Pendapatan ${rp(o.driverShare)} ditambahkan ke saldo.`;
        } else if (nextStatus === "Dibatalkan") {
          alertMsg = "Order berhasil ditolak.";
        }
        return { ...o, status: nextStatus, completedAt: nextStatus === "Selesai" ? new Date().toISOString() : o.completedAt };
      }
      return o;
    });

    setOrders(updated);

    Alert.alert("Status Diperbarui", alertMsg);
  };

  const activeOrder = orders.find((o) => ["Menunggu", "Menuju Pickup", "Sampai Pickup", "Mengantar"].includes(o.status));

  // Tab views mapper
  const renderTabContent = () => {
    switch (currentTab) {
      case 0:
        return renderBerandaContent();
      case 1:
        return (
          <Order
            orders={orders}
            setOrders={setOrders}
            balance={balance}
            setBalance={setBalance}
            transactions={transactions}
            setTransactions={setTransactions}
            isOnline={isOnline}
            onStatusChange={async (orderId, status) => {
              const targetOrder = orders.find((o) => o.id === orderId);
              if (targetOrder?.type === "Laundry") {
                if (status === "Menuju Pickup") {
                  await takeLaundryPickupJob(orderId, {
                    driverId: authAccount?.id || "drv_1",
                    driverName: authAccount?.name || "Kurir",
                    driverPhone: authAccount?.phone || "081234567890",
                  });
                } else if (status === "Sampai Pickup" || status === "Mengantar") {
                  await pickedUpLaundryByDriver(orderId);
                } else if (status === "Selesai") {
                  if (targetOrder.items?.[0]?.name?.includes("Jemput")) {
                    await arrivedLaundryAtStore(orderId);
                  } else {
                    await completeLaundryDelivery(orderId);
                  }
                }
                return true;
              }
              const result = targetOrder?.type === "Catering"
                ? await updateCateringOrderStatus(orderId, status)
                : await updateMarketplaceOrderStatus(orderId, status);
              if (!result.success) {
                Alert.alert("Gagal", result.message || "Status order gagal diperbarui");
                return false;
              }
              return true;
            }}
            onAcceptOrder={async (orderId) => {
              const targetOrder = orders.find((o) => o.id === orderId);
              if (targetOrder?.type === "Laundry") {
                if (targetOrder.items?.[0]?.name?.includes("Jemput")) {
                  await takeLaundryPickupJob(orderId, {
                    driverId: authAccount?.id || "drv_1",
                    driverName: authAccount?.name || "Kurir",
                    driverPhone: authAccount?.phone || "081234567890",
                  });
                } else {
                  await takeLaundryDeliveryJob(orderId, {
                    driverId: authAccount?.id || "drv_1",
                    driverName: authAccount?.name || "Kurir",
                    driverPhone: authAccount?.phone || "081234567890",
                  });
                }
                return true;
              }
              const result = targetOrder?.type === "Catering"
                ? await assignCateringDriver(orderId, authAccount?.id || "")
                : await assignMarketplaceDriver(orderId, authAccount?.id || "");
              if (!result.success) {
                Alert.alert("Gagal", result.message || "Order gagal diterima");
                return false;
              }
              return true;
            }}
            driverId={authAccount?.id}
          />
        );
      case 2:
        return <Pendapatan orders={orders} />;
      case 3:
        return (
          <Keuangan
            balance={balance}
            setBalance={setBalance}
            transactions={transactions}
            setTransactions={setTransactions}
          />
        );
      case 4:
        return <Profile driverInfo={driverInfo} setDriverInfo={setDriverInfo} userId={authAccount?.id} navigate={navigate} />;
      default:
        return renderBerandaContent();
    }
  };

  // Nav items configuration
  const navItems = [
    { label: "Beranda", icon: Home },
    { label: "Order", icon: ShoppingBag },
    { label: "Pendapatan", icon: TrendingUp },
    { label: "Keuangan", icon: Wallet },
    { label: "Profil", icon: UserIcon },
  ];

  // Dashboard content of Beranda Tab
  const renderBerandaContent = () => {
    const today = new Date();
    const isToday = (value?: string) => {
      if (!value) return false;
      const date = new Date(value);
      return !Number.isNaN(date.getTime()) && date.toDateString() === today.toDateString();
    };
    const completedToday = orders.filter((order) => order.status === "Selesai" && isToday(order.completedAt || order.createdAt));
    const todayOrders = completedToday.length;
    const todayRevenue = completedToday.reduce((sum, order) => sum + Number(order.driverShare || 0), 0);
    const todayDistance = completedToday.reduce((sum, order) => sum + Number(order.distanceKm || 0), 0);

    return (
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <RoleHeader
          name={driverInfo.name || "Nama Driver"}
          role="Driver"
          icon={Truck}
          notificationCount={driverNotifs.filter((notification) => !notification.read).length}
          onNotificationPress={() => setNotifModalVisible(true)}
          onRolePress={() => navigate("role")}
        />

        <View style={[styles.topHeader, styles.hiddenHeader]}>
          <View style={styles.greetingCol}>
            <Text style={styles.greetingText}>Halo, {driverInfo.name}</Text>
            <Text style={styles.subGreetingText}>
              {driverInfo.vehicle.type} · {driverInfo.vehicle.brand} ({driverInfo.vehicle.plate})
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.notifBtn}
            onPress={() => setNotifModalVisible(true)}
            activeOpacity={0.7}
          >
            <Bell size={20} color="#1B7A4E" />
            <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeText}>{driverNotifs.filter((notification) => !notification.read).length}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Online/Offline Status Toggle Card */}
        <View style={[styles.statusCard, isOnline ? styles.statusCardOnline : styles.statusCardOffline]}>
          <View style={styles.statusInfo}>
            <Text style={styles.statusTitle}>
              {isOnline ? "Status: Online 🟢" : "Status: Offline 🔴"}
            </Text>
            <Text style={styles.statusSub}>
              {isOnline ? "Anda siap menerima order pengantaran baru." : "Nyalakan status untuk mulai bekerja."}
            </Text>
          </View>
          <Switch
            value={isOnline}
            onValueChange={setIsOnline}
            trackColor={{ false: "#D1D5DB", true: "#E8F5EE" }}
            thumbColor={isOnline ? "#1B7A4E" : "#9CA3AF"}
          />
        </View>

        {/* Daily Summary Metrics Grid */}
        <Text style={styles.sectionTitle}>Performa Hari Ini</Text>
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <View style={[styles.summaryIconBg, { backgroundColor: "#E8F5EE" }]}>
              <Wallet size={18} color="#1B7A4E" />
            </View>
            <Text style={styles.summaryValue}>{rp(todayRevenue)}</Text>
            <Text style={styles.summaryLabel}>Pendapatan</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={[styles.summaryIconBg, { backgroundColor: "#EFF6FF" }]}>
              <ShoppingBag size={18} color="#2563EB" />
            </View>
            <Text style={styles.summaryValue}>{todayOrders} Selesai</Text>
            <Text style={styles.summaryLabel}>Total Orderan</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={[styles.summaryIconBg, { backgroundColor: "#FEF3C7" }]}>
              <Navigation size={18} color="#D97706" />
            </View>
            <Text style={styles.summaryValue}>{todayDistance > 0 ? `${todayDistance.toFixed(1)} km` : "Belum ada"}</Text>
            <Text style={styles.summaryLabel}>Jarak Tempuh</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={[styles.summaryIconBg, { backgroundColor: "#F3E8FF" }]}>
              <CheckCircle2 size={18} color="#7E22CE" />
            </View>
            <Text style={styles.summaryValue}>{driverInfo.rating > 0 ? `${driverInfo.rating} ★` : "Belum ada"}</Text>
            <Text style={styles.summaryLabel}>Rating Anda</Text>
          </View>
        </View>

        {/* Active Order Card Area */}
        <Text style={styles.sectionTitle}>Orderan Aktif</Text>
        {isOnline && activeOrder ? (
          <View style={styles.activeOrderCard}>
            <View style={styles.activeOrderHeader}>
              <View style={styles.activeOrderBadge}>
                <Truck size={14} color="#1B7A4E" />
                <Text style={styles.activeOrderBadgeText}>{activeOrder.type} Delivery</Text>
              </View>
              <Text style={styles.activeOrderId}>#{activeOrder.id}</Text>
            </View>

            <Text style={styles.activeOrderCustomer}>{activeOrder.customer}</Text>

            <View style={styles.routeBox}>
              <View style={styles.routeRow}>
                <MapPin size={14} color="#1B7A4E" />
                <Text style={styles.routeText} numberOfLines={1}>Pickup: {activeOrder.from}</Text>
              </View>
              <View style={styles.routeRow}>
                <MapPin size={14} color="#D97706" />
                <Text style={styles.routeText} numberOfLines={1}>Tujuan: {activeOrder.to}</Text>
              </View>
            </View>

            <View style={styles.activeOrderFooter}>
              <View>
                <Text style={styles.activeOrderDist}>{activeOrder.dist} · Bersih</Text>
                <Text style={styles.activeOrderPrice}>{rp(activeOrder.driverShare)}</Text>
              </View>

              {activeOrder.status === "Menunggu" ? (
                <View style={styles.btnRow}>
                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.btnDecline]}
                    onPress={() => handleUpdateStatus(activeOrder.id, "Dibatalkan")}
                  >
                    <XCircle size={14} color="#B91C1C" />
                    <Text style={styles.btnTextDecline}>Tolak</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.btnAccept]}
                    onPress={() => handleUpdateStatus(activeOrder.id, "Menuju Pickup")}
                  >
                    <CheckCircle2 size={14} color="#FFFFFF" />
                    <Text style={styles.btnTextAccept}>Terima</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity 
                  style={styles.detailBtn}
                  onPress={() => {
                    setCurrentTab(1);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.detailBtnText}>Lihat Detail</Text>
                  <ArrowRight size={14} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.emptyOrderCard}>
            <Truck size={32} color="#9CA3AF" />
            <Text style={styles.emptyOrderTitle}>
              {!isOnline ? "Status Anda sedang OFFLINE" : "Belum ada order masuk"}
            </Text>
            <Text style={styles.emptyOrderSub}>
              {!isOnline 
                ? "Nyalakan status online untuk mulai menerima orderan baru." 
                : "Tetap online. Order baru dari Catering / Laundry akan muncul otomatis."}
            </Text>
          </View>
        )}

        {/* Quick Actions Shortcuts */}
        <Text style={styles.sectionTitle}>Aksi Cepat</Text>
        <View style={styles.quickActionsGrid}>
          <TouchableOpacity style={styles.quickActionItem} onPress={() => setCurrentTab(1)}>
            <View style={styles.quickIconBg}>
              <ShoppingBag size={18} color="#1B7A4E" />
            </View>
            <Text style={styles.quickLabel}>Order Saya</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionItem} onPress={() => setCurrentTab(2)}>
            <View style={styles.quickIconBg}>
              <TrendingUp size={18} color="#1B7A4E" />
            </View>
            <Text style={styles.quickLabel}>Pendapatan</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionItem} onPress={() => setCurrentTab(3)}>
            <View style={styles.quickIconBg}>
              <Wallet size={18} color="#1B7A4E" />
            </View>
            <Text style={styles.quickLabel}>Riwayat Saldo</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickActionItem} onPress={() => setCurrentTab(4)}>
            <View style={styles.quickIconBg}>
              <UserIcon size={18} color="#1B7A4E" />
            </View>
            <Text style={styles.quickLabel}>Profil Driver</Text>
          </TouchableOpacity>
        </View>

        {/* Bantuan Card */}
        <View style={styles.helpCard}>
          <HelpCircle size={22} color="#1B7A4E" />
          <View style={styles.helpBody}>
            <Text style={styles.helpTitle}>Butuh Bantuan Mitra?</Text>
            <Text style={styles.helpSub}>Pusat bantuan darurat dan pelaporan masalah 24 jam.</Text>
          </View>
          <ChevronRight size={16} color="#9CA3AF" />
        </View>
      </ScrollView>
    );
  };

  return (
    <ResponsiveSafeAreaView style={styles.container}>
      {/* Tab content view */}
      <View style={styles.tabContainer}>{renderTabContent()}</View>

      {/* Bottom Nav Bar */}
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
                <IconComp size={20} color={active ? "#1B7A4E" : "#9CA3AF"} />
              </View>
              <Text style={[styles.navLabel, active ? styles.navLabelActive : null]}>
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Notifications Modal */}
      <Modal visible={notifModalVisible} transparent animationType="slide">
        <View style={styles.modalBgBottom}>
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Pusat Notifikasi</Text>
              <TouchableOpacity onPress={() => setNotifModalVisible(false)}>
                <X size={20} color="#111827" />
              </TouchableOpacity>
            </View>

            <View style={styles.notifList}>
              {driverNotifs.length > 0 ? (
                driverNotifs.map((n) => (
                  <View key={n._id} style={styles.notifRow}>
                    <View style={styles.notifIconBg}>
                      {n.type === "order_new" ? (
                        <Truck size={18} color="#1B7A4E" />
                      ) : (
                        <Wallet size={18} color="#1B7A4E" />
                      )}
                    </View>
                    <View style={styles.notifBody}>
                      <Text style={styles.notifRowTitle}>{n.title}</Text>
                      <Text style={styles.notifRowDesc}>{n.message}</Text>
                    </View>
                    <Text style={styles.notifTime}>
                      {new Date(n.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                    </Text>
                  </View>
                ))
              ) : (
                <View style={{ paddingVertical: 20, alignItems: "center" }}>
                  <Bell size={28} color="#9CA3AF" />
                  <Text style={{ color: "#6B7280", marginTop: 8, fontSize: 13 }}>Belum ada notifikasi baru</Text>
                </View>
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
  tabContainer: {
    flex: 1,
  },
  bottomNav: {
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
  },
  navIconBgActive: {
    backgroundColor: "rgba(27, 122, 78, 0.12)",
  },
  navLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 3,
    fontWeight: "500",
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
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  hiddenHeader: {
    display: "none",
  },
  greetingCol: {
    flex: 1,
    paddingRight: 12,
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
  statusCard: {
    borderRadius: 22,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  statusCardOnline: {
    backgroundColor: "#E8F5EE",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  statusCardOffline: {
    backgroundColor: "#F3F4F6",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  statusInfo: {
    flex: 1,
    paddingRight: 10,
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  statusSub: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 12,
    width: "48%",
    aspectRatio: 1.5,
    justifyContent: "center",
    gap: 4,
  },
  summaryIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#111827",
  },
  summaryLabel: {
    fontSize: 11,
    color: "#6B7280",
  },
  activeOrderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "#1B7A4E",
    padding: 16,
    marginBottom: 20,
  },
  activeOrderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  activeOrderBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5EE",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  activeOrderBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#1B7A4E",
  },
  activeOrderId: {
    fontSize: 13,
    fontWeight: "700",
    color: "#9CA3AF",
  },
  activeOrderCustomer: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginTop: 12,
  },
  routeBox: {
    marginTop: 10,
    gap: 6,
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  routeText: {
    fontSize: 13,
    color: "#4B5563",
    fontWeight: "600",
    flex: 1,
  },
  activeOrderFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  activeOrderDist: {
    fontSize: 11,
    color: "#6B7280",
  },
  activeOrderPrice: {
    fontSize: 16,
    fontWeight: "900",
    color: "#1B7A4E",
    marginTop: 2,
  },
  detailBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1B7A4E",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  detailBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  btnRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 38,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 4,
  },
  btnDecline: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  btnAccept: {
    backgroundColor: "#1B7A4E",
  },
  btnTextDecline: {
    color: "#B91C1C",
    fontSize: 11,
    fontWeight: "800",
  },
  btnTextAccept: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  emptyOrderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 20,
  },
  emptyOrderTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  emptyOrderSub: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
    paddingHorizontal: 12,
  },
  quickActionsGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
  },
  quickActionItem: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  quickIconBg: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: "#E8F5EE",
    alignItems: "center",
    justifyContent: "center",
  },
  quickLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
  },
  helpCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  helpBody: {
    flex: 1,
    marginLeft: 12,
    gap: 2,
  },
  helpTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  helpSub: {
    fontSize: 11,
    color: "#6B7280",
  },
  // Modal sheets
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
    fontWeight: "800",
  },
  // Notif list
  notifList: {
    gap: 12,
  },
  notifRow: {
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
    backgroundColor: "#E8F5EE",
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
});

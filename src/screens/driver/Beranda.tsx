import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import React, { useEffect, useRef, useState } from "react";
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
  ActivityIndicator,
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
  Phone,
  MessageSquare,
  Star,
  Bike,
  XCircle,
  HelpCircle,
  Truck,
  ArrowRight,
  ChevronRight,
  X,
  Store,
  Clock,
} from "lucide-react-native";
import { rp } from "../../utils/formatters";
import { Nav } from "../../types";
import { AuthAccount } from "../auth/authTypes";
import { RoleHeader } from "../../components/RoleHeader";
import { SafeCallModal } from "../../components/SafeCallModal";
import { CustomerChatModal } from "../customer/CustomerChatModal";
import { updateUserProfile } from "../../services/api";
import {
  getMarketplaceOrdersForDriver,
  updateMarketplaceOrderStatus,
  acceptMarketplaceOrder,
  declineMarketplaceOrder,
  assignMarketplaceDriver,
  getCateringOrdersForDriver,
  updateCateringOrderStatus,
  assignCateringDriver,
  declineCateringDriver,
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
import {
  fetchDriverRides,
  acceptRide,
  declineRide,
  updateRideStatus,
  RideStatus,
} from "../../services/rideService";
import {
  fetchAvailableSendOrders,
  acceptSendOrder,
  verifySendPickupCode,
  verifySendDeliveryOtp,
} from "../../services/sendService";
import { subscribeToUserRealtime } from "../../services/userRealtime";

// Import other screens
import { Order, DriverOrder } from "./Order";
import { Pendapatan } from "./Pendapatan";
import { Keuangan, TransactionRecord } from "./Keuangan";
import { Profile } from "./Profile";

const mapMarketplaceDriverStatus = (rawStatus: string): DriverOrder["status"] => {
  if (["Menuju Pickup", "Sampai Pickup", "Selesai", "Dibatalkan", "Siap"].includes(rawStatus)) return rawStatus as DriverOrder["status"];
  if (["Diambil", "Mengantar", "Dikirim"].includes(rawStatus)) return "Mengantar";
  return "Menunggu";
};

const mapMarketplaceDriverOrder = (order: any): DriverOrder => ({
  id: String(order._id || order.id),
  orderCode: order.orderCode || `#RNG-DEL-${String(order._id || order.id).slice(-8)}`,
  orderCategory: "DELIVERY",
  serviceType: "KANYAAH_MARKETPLACE",
  driverId: order.driverId || null,
  rawStatus: order.status || "Menunggu",
  customer: order.customerName || "Pelanggan",
  phone: order.customerPhone || "",
  type: "Marketplace",
  paymentMethod: order.paymentMethod || "COD",
  paymentStatus: order.paymentStatus || (order.paymentMethod === "COD" ? "Menunggu" : "Lunas"),
  time: order.createdAt ? new Date(order.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "",
  from: order.storeAddress || order.storeName || "Lokasi pickup belum tersedia",
  to: order.address || "Alamat tujuan belum tersedia",
  dist: "Jarak belum tersedia",
  pay: Number(order.totalAmount || 0),
  driverShare: Number(order.driverEarnings ?? order.driverFee ?? order.driverTip ?? order.deliveryFee ?? 0),
  completedAt: order.updatedAt || order.createdAt,
  status: mapMarketplaceDriverStatus(String(order.status || "Menunggu")),
  deliveryProofUrl: order.deliveryProofUrl || "",
  items: order.items || [],
  storeName: order.storeName || "Toko Marketplace",
  storeAddress: order.storeAddress || "Alamat toko belum tersedia",
  storePhone: order.storePhone || order.merchantPhone || "",
  ownerId: String(order.ownerId?._id || order.ownerId || ""),
  addressSnapshot: order.addressSnapshot || null,
});

const mapCateringDriverOrder = (order: any): DriverOrder => ({
  id: String(order._id || order.id),
  orderCode: order.orderCode || `#RNG-CAT-${String(order._id || order.id).slice(-8)}`,
  orderCategory: "DELIVERY",
  serviceType: "KANYAAH_CATERING",
  driverId: order.driverId || null,
  rawStatus: order.status || "Menunggu",
  paymentMethod: order.paymentMethod || "COD",
  paymentStatus: order.paymentStatus || "Menunggu Pembayaran",
  customer: order.customerName || "Pelanggan",
  phone: order.customerPhone || "",
  type: "Catering",
  time: order.createdAt ? new Date(order.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "",
  from: order.storeAddress || order.storeName || "Lokasi pickup belum tersedia",
  to: order.address || "Alamat tujuan belum tersedia",
  dist: order.distance ? `${order.distance} km` : "Jarak belum tersedia",
  distanceKm: Number(order.distanceKm ?? order.distance ?? 0),
  pay: Number(order.totalAmount || 0),
  driverShare: Number(order.driverEarnings ?? order.driverFee ?? order.driverTip ?? order.deliveryFee ?? 0),
  completedAt: order.updatedAt || order.createdAt,
  status: order.status === "Siap" ? "Siap"
    : order.status === "Menuju Pickup" ? "Menuju Pickup"
    : order.status === "Sampai Pickup" ? "Sampai Pickup"
    : ["Diambil", "Mengantar", "Dikirim"].includes(order.status) ? "Mengantar"
    : order.status === "Selesai" ? "Selesai"
    : order.status === "Dibatalkan" ? "Dibatalkan" : "Menunggu",
  items: [{ name: `${order.menuName || "Pesanan catering"}${order.portions ? ` (${order.portions} pax)` : ""}`, quantity: Number(order.portions || 1), price: Number(order.price || 0) }],
  storeName: order.storeName || "Dapur catering",
  storeAddress: order.storeAddress || "Alamat dapur belum tersedia",
  storePhone: order.storePhone || order.merchantPhone || "",
  ownerId: order.ownerId,
  addressSnapshot: order.addressSnapshot || null,
});

const mapRideDriverOrder = (order: any): DriverOrder => ({
  id: String(order._id || order.id),
  orderCode: order.orderCode || `#RNG-RIDE-${String(order._id || order.id).slice(-8)}`,
  orderCategory: "RIDE",
  serviceType: "KANYAAH_RIDE",
  vehicleType: order.vehicleType || "MOTOR",
  estimatedDuration: order.estimatedDuration || 15,
  driverId: order.driverId || null,
  rawStatus: order.status || "SEARCHING_DRIVER",
  paymentMethod: order.paymentMethod || "Bayar Tunai",
  paymentStatus: order.paymentStatus || "Menunggu Pembayaran",
  customer: order.customerName || "Penumpang",
  phone: order.customerPhone || "",
  type: "Kanyaah Ride",
  time: order.createdAt ? new Date(order.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "",
  from: order.pickup?.address || "Titik Penjemputan",
  to: order.destination?.address || "Titik Tujuan",
  dist: order.estimatedDistance ? `${order.estimatedDistance} km` : "Jarak belum tersedia",
  distanceKm: Number(order.estimatedDistance || 0),
  pay: Number(order.totalAmount || 0),
  driverShare: Number(order.driverEarnings || (order.totalAmount ? order.totalAmount * 0.8 : 0)),
  completedAt: order.updatedAt || order.createdAt,
  status: order.status === "SEARCHING_DRIVER" ? "Menunggu"
    : order.status === "DRIVER_ASSIGNED" || order.status === "DRIVER_ON_THE_WAY" ? "Menuju Pickup"
    : order.status === "DRIVER_ARRIVED" ? "Sampai Pickup"
    : order.status === "TRIP_STARTED" ? "Mengantar"
    : order.status === "COMPLETED" ? "Selesai"
    : order.status === "CANCELLED" ? "Dibatalkan" : "Menunggu",
  items: [
    {
      name: `Antar Jemput Penumpang (${order.vehicleType === "car" ? "Kanyaah Car" : "Kanyaah Motor"})`,
      quantity: 1,
      price: Number(order.totalAmount || 0),
    },
  ],
  storeName: order.pickup?.placeName || "Titik Jemput: " + (order.pickup?.address || ""),
  storeAddress: order.pickup?.address || "",
  storePhone: order.customerPhone || "",
  ownerId: order.customerId,
  notes: order.customerNote || "",
  pickup: order.pickup,
  destination: order.destination,
  addressSnapshot: null,
});

const mapSendDriverOrder = (order: any): DriverOrder => ({
  id: String(order._id || order.id),
  orderCode: order.orderCode || `#RNG-SEND-${String(order._id || order.id).slice(-8)}`,
  orderCategory: "DELIVERY",
  serviceType: "KANYAAH_SEND",
  driverId: order.driverId || null,
  rawStatus: order.status || "SEARCHING_DRIVER",
  customer: order.sender?.name || "Pengirim",
  phone: order.sender?.phone || "",
  type: "Kanyaah Send",
  paymentMethod: order.paymentMethod || "QRIS",
  paymentStatus: order.paymentStatus || "Lunas",
  time: order.createdAt ? new Date(order.createdAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "",
  from: order.sender?.address || "Titik Pickup Pengirim",
  to: order.recipient?.address || "Titik Tujuan Penerima",
  dist: order.distanceKm ? `${order.distanceKm} km` : "Jarak belum tersedia",
  distanceKm: Number(order.distanceKm || 0),
  pay: Number(order.pricing?.estimatedFare || 0),
  driverShare: Number(order.pricing?.driverEarnings || (order.pricing?.estimatedFare ? Math.round(order.pricing.estimatedFare * 0.8) : 0)),
  completedAt: order.deliveredAt || order.updatedAt || order.createdAt,
  status:
    order.status === "SEARCHING_DRIVER" ? "Menunggu"
    : order.status === "DRIVER_ASSIGNED" ? "Siap"
    : order.status === "DRIVER_ON_THE_WAY_TO_PICKUP" ? "Menuju Pickup"
    : order.status === "DRIVER_ARRIVED_AT_PICKUP" || order.status === "PICKUP_VERIFICATION" ? "Sampai Pickup"
    : order.status === "PICKED_UP" || order.status === "IN_TRANSIT" || order.status === "ARRIVED_AT_DESTINATION" || order.status === "DELIVERY_VERIFICATION" ? "Mengantar"
    : order.status === "DELIVERED" || order.status === "COMPLETED" ? "Selesai"
    : order.status === "CANCELLED" ? "Dibatalkan" : "Menunggu",
  items: [
    {
      name: `Kirim Paket: ${order.package?.name || "Barang"} (${order.package?.weightKg || 1} kg, ${order.package?.category || "Paket"})`,
      quantity: Number(order.package?.quantity || 1),
      price: Number(order.pricing?.estimatedFare || 0),
      notes: order.package?.notes || "",
    },
  ],
  storeName: "Pengirim: " + (order.sender?.name || ""),
  storeAddress: order.sender?.address || "",
  storePhone: order.sender?.phone || "",
  ownerId: order.customerId,
  notes: `Penerima: ${order.recipient?.name} (${order.recipient?.phone}) | Alamat: ${order.recipient?.address}`,
  pickup: order.sender ? { address: order.sender.address, latitude: order.sender.latitude, longitude: order.sender.longitude } : undefined,
  destination: order.recipient ? { address: order.recipient.address, latitude: order.recipient.latitude, longitude: order.recipient.longitude } : undefined,
  deliveryProofUrl: order.deliveryProofUrls?.[0] || "",
  addressSnapshot: null,
});

interface DriverHomeProps extends Nav {
  authAccount?: AuthAccount | null;
}

type DriverDocumentStatus = "Terverifikasi" | "Menunggu Verifikasi" | "Belum Lengkap";

const getDriverDocumentStatus = (account: AuthAccount | null | undefined, key: string): DriverDocumentStatus => {
  const document = account?.documents?.[key];
  if (!document) return "Belum Lengkap";
  if (document.status === "verified") return "Terverifikasi";
  if (document.status === "pending") return "Menunggu Verifikasi";
  return "Belum Lengkap";
};

export const Beranda: React.FC<DriverHomeProps> = ({ navigate, authAccount }) => {
  const [currentTab, setCurrentTab] = useState<number>(0);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [notifModalVisible, setNotifModalVisible] = useState<boolean>(false);
  const [driverNotifs, setDriverNotifs] = useState<any[]>([]);
  const homeActionLock = useRef(new Set<string>());
  const [homeActionOrderId, setHomeActionOrderId] = useState<string | null>(null);
  const [safeCallVisible, setSafeCallVisible] = useState<boolean>(false);
  const [safeCallTarget, setSafeCallTarget] = useState<{ name: string; role: string; phone: string; orderCode: string } | null>(null);
  const [chatModalVisible, setChatModalVisible] = useState<boolean>(false);
  const [chatTargetOrder, setChatTargetOrder] = useState<DriverOrder | null>(null);

  // Auto load driver notifications
  useEffect(() => {
    if (!authAccount?.id) return;
    let active = true;
    const loadNotifs = async () => {
      const result = await getNotifications(authAccount.id);
      if (!active) return;
      if (result.success && Array.isArray(result.data)) {
        setDriverNotifs(result.data);
      }
    };
    void loadNotifs();
    const interval = setInterval(() => void loadNotifs(), 8000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [authAccount?.id]);

  // 1. Global Driver Info State
  const [driverInfo, setDriverInfo] = useState(() => ({
    name: authAccount?.name || "Driver Rangers",
    phone: authAccount?.phone || "",
    email: authAccount?.email || "",
    profilePhoto: authAccount?.profilePhoto || undefined,
    avatarLetter: authAccount?.name ? authAccount.name.trim().charAt(0).toUpperCase() : "D",
    rating: typeof authAccount?.driverRating === "number" && authAccount.driverRating > 0 ? authAccount.driverRating : 5.0,
    vehicle: {
      type: authAccount?.roleData?.vehicleType || (authAccount as any)?.vehicleType || "Motor",
      brand: authAccount?.roleData?.vehicleBrand || (authAccount as any)?.vehicleBrand || "Motor",
      plate: authAccount?.roleData?.plateNumber || (authAccount as any)?.plateNumber || "",
      year: authAccount?.roleData?.vehicleYear || (authAccount as any)?.vehicleYear || "",
      verified: authAccount?.status === "verified",
    },
    documents: {
      ktp: getDriverDocumentStatus(authAccount, "ktp"),
      sim: getDriverDocumentStatus(authAccount, "sim"),
      stnk: getDriverDocumentStatus(authAccount, "stnk"),
    },
    payment: {
      bankName: authAccount?.roleData?.bankName || (authAccount as any)?.bankName || "BCA",
      accountNo: authAccount?.roleData?.accountNo || (authAccount as any)?.accountNo || "",
      holderName: (authAccount?.name || "DRIVER RANGERS").toUpperCase(),
      gopayNo: authAccount?.roleData?.gopayNo || authAccount?.phone || "",
    }
  }));

  useEffect(() => {
    if (!authAccount) return;
    setDriverInfo((current) => ({
      ...current,
      name: authAccount.name || current.name,
      phone: authAccount.phone || current.phone,
      email: authAccount.email || current.email,
      profilePhoto: authAccount.profilePhoto || current.profilePhoto,
      avatarLetter: authAccount.name ? authAccount.name.trim().charAt(0).toUpperCase() : current.avatarLetter,
      rating: typeof authAccount.driverRating === "number" && authAccount.driverRating > 0 ? authAccount.driverRating : current.rating,
      vehicle: {
        ...current.vehicle,
        type: authAccount.roleData?.vehicleType || (authAccount as any)?.vehicleType || current.vehicle.type,
        brand: authAccount.roleData?.vehicleBrand || (authAccount as any)?.vehicleBrand || current.vehicle.brand,
        plate: authAccount.roleData?.plateNumber || (authAccount as any)?.plateNumber || current.vehicle.plate,
        year: authAccount.roleData?.vehicleYear || (authAccount as any)?.vehicleYear || current.vehicle.year,
        verified: authAccount.status === "verified",
      },
      documents: {
        ktp: getDriverDocumentStatus(authAccount, "ktp"),
        sim: getDriverDocumentStatus(authAccount, "sim"),
        stnk: getDriverDocumentStatus(authAccount, "stnk"),
      },
      payment: {
        ...current.payment,
        bankName: authAccount.roleData?.bankName || (authAccount as any)?.bankName || current.payment.bankName,
        accountNo: authAccount.roleData?.accountNo || (authAccount as any)?.accountNo || current.payment.accountNo,
        holderName: (authAccount.name || current.name).toUpperCase(),
        gopayNo: authAccount.roleData?.gopayNo || authAccount.phone || current.payment.gopayNo,
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
    setOrders([]);
    let active = true;
    let loading = false;
    const loadOrders = async () => {
      if (loading) return;
      loading = true;
      try {
        const [mktRes, catRes, laundryJobs, rideRes, sendRes] = await Promise.all([
          getMarketplaceOrdersForDriver(authAccount.id),
          getCateringOrdersForDriver(authAccount.id),
          fetchDriverLaundryJobs(authAccount.id),
          fetchDriverRides(authAccount.id),
          fetchAvailableSendOrders(authAccount.id),
        ]);
        if (!active) return;

        const normalizeStatus = (rawStatus: string): DriverOrder["status"] => {
          if (rawStatus === "Menuju Pickup") return "Menuju Pickup";
          if (rawStatus === "Sampai Pickup") return "Sampai Pickup";
          if (rawStatus === "Diambil" || rawStatus === "Mengantar" || rawStatus === "Dikirim") return "Mengantar";
          if (rawStatus === "Selesai") return "Selesai";
          if (rawStatus === "Dibatalkan") return "Dibatalkan";
          return "Menunggu";
        };

        const mktOrders: DriverOrder[] = (mktRes.success && Array.isArray(mktRes.data))
          ? mktRes.data.map(mapMarketplaceDriverOrder)
          : [];

        const catOrders: DriverOrder[] = (catRes.success && Array.isArray(catRes.data)) ? catRes.data.map(mapCateringDriverOrder) : [];

        const lndOrders: DriverOrder[] = Array.isArray(laundryJobs) ? laundryJobs.map((lnd: any) => {
          const isPickupJob =
            lnd.status === "MENUNGGU_DRIVER_JEMPUT" ||
            lnd.status === "DRIVER_MENUJU_CUSTOMER" ||
            lnd.status === "DRIVER_MENUJU_LAUNDRY";

          let orderStatus: DriverOrder["status"] = "Menunggu";
          if (lnd.status === "MENUNGGU_DRIVER_JEMPUT" || lnd.status === "SIAP_DIANTAR") {
            orderStatus = "Menunggu";
          } else if (lnd.status === "DRIVER_MENUJU_CUSTOMER") {
            orderStatus = "Menuju Pickup";
          } else if (lnd.status === "DRIVER_MENUJU_LAUNDRY" || lnd.status === "DRIVER_MENGANTAR_BALIK") {
            orderStatus = "Mengantar";
          } else if (lnd.status === "SELESAI") {
            orderStatus = "Selesai";
          } else if (lnd.status === "DIBATALKAN") {
            orderStatus = "Dibatalkan";
          } else {
            if (lnd.driverPickupId) {
              orderStatus = "Selesai";
            }
          }

          return {
            id: lnd._id || lnd.id,
            orderCode: lnd.orderCode || `#RNG-LND-${String(lnd._id || lnd.id).slice(-8)}`,
            orderCategory: "DELIVERY" as const,
            serviceType: "KANYAAH_LAUNDRY",
            customer: lnd.customerName,
            phone: lnd.customerPhone || "",
            type: "Laundry" as const,
            time: new Date(lnd.createdAt || Date.now()).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }),
            from: isPickupJob ? lnd.pickupAddress : lnd.storeName,
            to: isPickupJob ? lnd.storeName : (lnd.deliveryAddress || lnd.pickupAddress),
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

        const rideOrders: DriverOrder[] = (rideRes.success && Array.isArray(rideRes.data))
          ? rideRes.data.map(mapRideDriverOrder)
          : [];

        const sendOrders: DriverOrder[] = (sendRes?.success && Array.isArray(sendRes.data))
          ? sendRes.data.map(mapSendDriverOrder)
          : [];

        setOrders((current) => {
          const marketplaceOrders = mktRes.success && Array.isArray(mktRes.data)
            ? mktOrders
            : current.filter((order) => order.type === "Marketplace");
          const existingRideOrders = rideRes.success && Array.isArray(rideRes.data)
            ? rideOrders
            : current.filter((order) => order.type === "Kanyaah Ride");
          const existingSendOrders = sendRes?.success && Array.isArray(sendRes.data)
            ? sendOrders
            : current.filter((order) => order.type === "Kanyaah Send");
          return [...existingRideOrders, ...existingSendOrders, ...marketplaceOrders, ...catOrders, ...lndOrders];
        });
      } catch (error) {
        console.error("Load driver orders error:", error);
      } finally {
        loading = false;
      }
    };

    void loadOrders();
    const interval = setInterval(() => void loadOrders(), 4000);

    // Socket.io Realtime Listener
    let unsubscribeRealtime: () => void = () => undefined;
    void subscribeToUserRealtime(
      () => void loadOrders(),
      (orderUpdate) => {
        void loadOrders();
      }
    ).then((unsub) => {
      unsubscribeRealtime = unsub;
    });

    return () => {
      active = false;
      clearInterval(interval);
      unsubscribeRealtime();
    };
  }, [authAccount?.id]);

  // 4. Global Transactions State
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);

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
      } else if (targetOrder.type === "Kanyaah Ride") {
        let backendStatus: RideStatus = "DRIVER_ASSIGNED";
        if (nextStatus === "Menuju Pickup") backendStatus = "DRIVER_ON_THE_WAY";
        else if (nextStatus === "Sampai Pickup") backendStatus = "DRIVER_ARRIVED";
        else if (nextStatus === "Mengantar") backendStatus = "TRIP_STARTED";
        else if (nextStatus === "Selesai") backendStatus = "COMPLETED";
        else if (nextStatus === "Dibatalkan") backendStatus = "CANCELLED";

        const res = await updateRideStatus(orderId, backendStatus);
        if (!res.success || !res.data) {
          Alert.alert("Gagal", res.message || "Status perjalanan belum berhasil diperbarui");
          return;
        }
        const serverOrder = mapRideDriverOrder(res.data);
        setOrders((current) => current.map((order) => order.id === orderId ? serverOrder : order));
        if (nextStatus === "Selesai") {
          alertMsg = `Perjalanan selesai! Pendapatan ${rp(serverOrder.driverShare)} ditambahkan ke saldo.`;
        } else if (nextStatus === "Mengantar") {
          alertMsg = "Perjalanan dimulai. Antar penumpang ke tujuan dengan aman.";
        } else if (nextStatus === "Sampai Pickup") {
          alertMsg = "Anda telah tiba di titik jemput penumpang.";
        }
        Alert.alert("Status Diperbarui", alertMsg);
        return;
      } else {
        const result = await updateMarketplaceOrderStatus(orderId, nextStatus, authAccount);
        if (!result.success || !result.data) {
          Alert.alert("Status belum tersimpan", result.message || "Periksa koneksi lalu coba lagi.");
          return;
        }
        const serverOrder = mapMarketplaceDriverOrder(result.data);
        setOrders((current) => current.map((order) => order.id === orderId ? serverOrder : order));
        if (nextStatus === "Selesai") {
          alertMsg = `Pengantaran selesai! Pendapatan ${rp(serverOrder.driverShare)} ditambahkan ke saldo.`;
        } else if (nextStatus === "Mengantar") {
          alertMsg = "Pesanan telah diambil dan mulai diantar ke customer.";
        } else if (nextStatus === "Sampai Pickup") {
          alertMsg = "Anda telah tiba di lokasi pickup.";
        }
        Alert.alert("Status Diperbarui", alertMsg);
        return;
      }
    }

    const updated = orders.map((o) => {
      if (o.id === orderId) {
        return { ...o, status: nextStatus, completedAt: nextStatus === "Selesai" ? new Date().toISOString() : o.completedAt };
      }
      return o;
    });
    setOrders(updated);
  };

  // Dedicated Ride State Machine Transition
  const handleRideTransition = async (orderId: string, targetStatus: RideStatus) => {
    if (homeActionLock.current.has(orderId)) return;
    homeActionLock.current.add(orderId);
    setHomeActionOrderId(orderId);
    try {
      const res = await updateRideStatus(orderId, targetStatus);
      if (!res.success || !res.data) {
        Alert.alert("Gagal", res.message || "Gagal memperbarui status perjalanan.");
        return;
      }
      const updated = mapRideDriverOrder(res.data);
      setOrders((current) => current.map((order) => order.id === orderId ? updated : order));

      let msg = "Status perjalanan diperbarui.";
      if (targetStatus === "DRIVER_ON_THE_WAY") msg = "Menuju lokasi penumpang. Notifikasi telah dikirim ke customer.";
      else if (targetStatus === "DRIVER_ARRIVED") msg = "Anda telah tiba di lokasi penjemputan.";
      else if (targetStatus === "TRIP_STARTED") msg = "Perjalanan dimulai! Harap berkendara dengan aman.";
      else if (targetStatus === "COMPLETED") msg = `Perjalanan selesai! Pendapatan ${rp(updated.driverShare)} telah masuk ke saldo.`;

      Alert.alert("Status Diperbarui", msg);
    } catch (err: any) {
      Alert.alert("Gagal", err.message || "Periksa koneksi lalu coba lagi.");
    } finally {
      homeActionLock.current.delete(orderId);
      setHomeActionOrderId(null);
    }
  };

  const confirmCompleteRide = (orderId: string) => {
    Alert.alert(
      "Selesaikan Perjalanan",
      "Pastikan penumpang telah sampai di lokasi tujuan dengan selamat. Selesaikan perjalanan?",
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Selesaikan Perjalanan",
          style: "default",
          onPress: () => void handleRideTransition(orderId, "COMPLETED"),
        },
      ]
    );
  };

  const acceptRideFromHome = async (orderId: string) => {
    if (homeActionLock.current.has(orderId)) return;
    homeActionLock.current.add(orderId);
    setHomeActionOrderId(orderId);
    try {
      const result = await acceptRide(orderId, authAccount?.id || "");
      if (!result.success || !result.data) {
        Alert.alert("Pesanan belum diterima", result.message || "Pesanan mungkin sudah diambil driver lain.");
        return;
      }
      const updated = mapRideDriverOrder(result.data);
      setOrders((current) => current.map((order) => order.id === updated.id ? updated : order));
      Alert.alert("Ride Diterima! 🏍", `Perjalanan #${updated.orderCode || updated.id.slice(-8)} berhasil diambil. Silakan bersiap menuju penumpang.`);
    } catch (err: any) {
      Alert.alert("Gagal", err.message || "Terjadi kesalahan saat menerima pesanan.");
    } finally {
      homeActionLock.current.delete(orderId);
      setHomeActionOrderId(null);
    }
  };

  const declineRideFromHome = async (orderId: string) => {
    Alert.alert("Tolak Ride?", "Pesanan ini akan disembunyikan dari daftar Anda.", [
      { text: "Batal", style: "cancel" },
      {
        text: "Tolak",
        style: "destructive",
        onPress: async () => {
          try {
            await declineRide(orderId, authAccount?.id || "");
            setOrders((current) => current.filter((order) => order.id !== orderId));
          } catch (err) {
            console.error("declineRide error:", err);
          }
        },
      },
    ]);
  };

  const acceptMarketplaceFromHome = async (orderId: string) => {
    if (homeActionLock.current.has(orderId)) return;
    homeActionLock.current.add(orderId);
    setHomeActionOrderId(orderId);
    try {
      const result = await acceptMarketplaceOrder(orderId);
      if (!result.success || !result.data) {
        Alert.alert("Pesanan belum diterima", result.message || "Pesanan mungkin sudah diambil driver lain.");
        return;
      }
      const updated = mapMarketplaceDriverOrder(result.data);
      setOrders((current) => current.map((order) => order.id === updated.id ? updated : order));
    } finally {
      homeActionLock.current.delete(orderId);
      setHomeActionOrderId((current) => current === orderId ? null : current);
    }
  };

  // Derive ongoing active trip and available incoming orders
  const isTripOngoing = (o: DriverOrder) => ["Menuju Pickup", "Sampai Pickup", "Mengantar"].includes(o.status);

  // Active assigned order being driven/delivered by this driver
  const activeOrder = orders.find((o) => isTripOngoing(o)) || null;

  // Incoming available orders waiting for driver acceptance
  const incomingAvailableOrders = orders.filter((o) => {
    if (isTripOngoing(o) || o.status === "Selesai" || o.status === "Dibatalkan") return false;
    if (o.type === "Kanyaah Ride") {
      return (o.rawStatus === "SEARCHING_DRIVER" || o.status === "Menunggu") && (!o.driverId || o.driverId === "");
    }
    if (o.type === "Marketplace") {
      return (o.status === "Siap" || o.status === "Menunggu") && (!o.driverId || o.driverId === "");
    }
    return o.status === "Menunggu" && (!o.driverId || o.driverId === "");
  });

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
            driverId={authAccount?.id}
            driverName={driverInfo.name}
            driverVehicle={driverInfo.vehicle.brand}
            driverPlate={driverInfo.vehicle.plate}
            onStatusChange={async (orderId, status, deliveryProofUrl) => {
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
              if (targetOrder?.type === "Kanyaah Ride") {
                let backendStatus: RideStatus = "DRIVER_ASSIGNED";
                if (status === "Menuju Pickup") backendStatus = "DRIVER_ON_THE_WAY";
                else if (status === "Sampai Pickup") backendStatus = "DRIVER_ARRIVED";
                else if (status === "Mengantar") backendStatus = "TRIP_STARTED";
                else if (status === "Selesai") backendStatus = "COMPLETED";
                else if (status === "Dibatalkan") backendStatus = "CANCELLED";

                const res = await updateRideStatus(orderId, backendStatus);
                if (!res.success) {
                  Alert.alert("Gagal", res.message || "Status perjalanan gagal diperbarui");
                  return false;
                }
                if (res.data) {
                  const updated = mapRideDriverOrder(res.data);
                  setOrders((current) => current.map((order) => order.id === orderId ? updated : order));
                  return updated;
                }
                return true;
              }

              const result = targetOrder?.type === "Catering"
                ? await updateCateringOrderStatus(orderId, status)
                : await updateMarketplaceOrderStatus(orderId, status, authAccount, deliveryProofUrl);
              if (!result.success) {
                Alert.alert("Gagal", result.message || "Status order gagal diperbarui");
                return false;
              }
              if (targetOrder?.type === "Marketplace" && result.data) {
                const updated = mapMarketplaceDriverOrder(result.data);
                setOrders((current) => current.map((order) => order.id === orderId ? updated : order));
                return updated;
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
              if (targetOrder?.type === "Kanyaah Ride") {
                const res = await acceptRide(orderId, authAccount?.id || "");
                if (!res.success) {
                  Alert.alert("Gagal", res.message || "Pesanan mungkin sudah diambil driver lain");
                  return false;
                }
                if (res.data) {
                  const updated = mapRideDriverOrder(res.data);
                  setOrders((current) => current.map((order) => order.id === orderId ? updated : order));
                  return updated;
                }
                return true;
              }
              if (targetOrder?.type === "Kanyaah Send") {
                const res = await acceptSendOrder(orderId, authAccount?.id || "");
                if (!res.success) {
                  Alert.alert("Gagal", res.message || "Pesanan mungkin sudah diambil driver lain");
                  return false;
                }
                if (res.data) {
                  const updated = mapSendDriverOrder(res.data);
                  setOrders((current) => current.map((order) => order.id === orderId ? updated : order));
                  return updated;
                }
                return true;
              }

               const result = targetOrder?.type === "Catering"
                 ? await assignCateringDriver(orderId, authAccount?.id || "")
                : await acceptMarketplaceOrder(orderId);
              if (!result.success) {
                Alert.alert("Gagal", result.message || "Order gagal diterima");
                return false;
              }
               if ((targetOrder?.type === "Marketplace" || targetOrder?.type === "Catering") && result.data) {
                 const updated = targetOrder.type === "Catering" ? mapCateringDriverOrder(result.data) : mapMarketplaceDriverOrder(result.data);
                setOrders((current) => current.map((order) => order.id === orderId ? updated : order));
                return updated;
              }
              return true;
            }}
            onDeclineOrder={async (orderId) => {
              const targetOrder = orders.find((o) => o.id === orderId);
              if (targetOrder?.type === "Kanyaah Ride") {
                await declineRide(orderId, authAccount?.id || "");
                setOrders((current) => current.filter((order) => order.id !== orderId));
                return true;
              }
              const result = targetOrder?.type === "Catering"
                ? await declineCateringDriver(orderId, authAccount?.id || "")
                : await declineMarketplaceOrder(orderId);
              if (!result.success) {
                Alert.alert("Belum berhasil menolak", result.message || "Periksa koneksi lalu coba lagi.");
                return false;
              }
              setOrders((current) => current.filter((order) => order.id !== orderId));
              return true;
            }}
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

  // Render Incoming Available Ride Card
  const renderIncomingRideCard = (order: DriverOrder) => (
    <View key={order.id} style={styles.incomingRideCard}>
      {/* Header */}
      <View style={styles.cardHeaderRow}>
        <View style={styles.rideBadge}>
          <Bike size={16} color="#15803D" />
          <View>
            <Text style={styles.rideBadgeTitle}>KANYAAH RIDE</Text>
            <Text style={styles.rideBadgeSubtitle}>Antar Jemput Penumpang</Text>
          </View>
        </View>
        <Text style={styles.orderCodeText}>#{order.orderCode || order.id.slice(-8)}</Text>
      </View>

      {/* Passenger Info */}
      <View style={styles.passengerRow}>
        <Text style={styles.customerLabel}>Customer:</Text>
        <Text style={styles.customerNameText}>{order.customer}</Text>
      </View>

      {/* Route Box */}
      <View style={styles.routeBox}>
        <View style={styles.routeRow}>
          <MapPin size={14} color="#15803D" />
          <Text style={styles.routeText} numberOfLines={2}>
            <Text style={styles.boldLabel}>Jemput: </Text>{order.from}
          </Text>
        </View>
        <View style={styles.routeRow}>
          <MapPin size={14} color="#D97706" />
          <Text style={styles.routeText} numberOfLines={2}>
            <Text style={styles.boldLabel}>Tujuan: </Text>{order.to}
          </Text>
        </View>
      </View>

      {/* Metrics Row */}
      <View style={styles.rideMetricsRow}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Jarak Perjalanan</Text>
          <Text style={styles.metricValue}>{order.dist}</Text>
        </View>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Estimasi</Text>
          <Text style={styles.metricValue}>{order.estimatedDuration || 15} menit</Text>
        </View>
        <View style={[styles.metricItem, { alignItems: "flex-end" }]}>
          <Text style={styles.metricLabel}>Pendapatan</Text>
          <Text style={styles.metricPriceValue}>{rp(order.driverShare)}</Text>
        </View>
      </View>

      {/* Action Buttons Row */}
      <View style={styles.btnRow}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.btnDecline]}
          disabled={homeActionOrderId === order.id}
          onPress={() => declineRideFromHome(order.id)}
          activeOpacity={0.8}
        >
          <XCircle size={14} color="#B91C1C" />
          <Text style={styles.btnTextDecline}>Tolak</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, styles.btnAcceptRide]}
          disabled={homeActionOrderId === order.id}
          onPress={() => acceptRideFromHome(order.id)}
          activeOpacity={0.85}
        >
          {homeActionOrderId === order.id ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Bike size={15} color="#FFFFFF" />
              <Text style={styles.btnTextAcceptRide}>Terima Ride</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render Incoming Available Delivery Card (Marketplace / Catering / Laundry)
  const renderIncomingDeliveryCard = (order: DriverOrder) => {
    const serviceName = order.type === "Marketplace" ? "Kanyaah Mart" : order.type === "Catering" ? "Kanyaah Catering" : "Kanyaah Laundry";
    const subtitle = "Pengantaran Pesanan";

    return (
      <View key={order.id} style={styles.incomingDeliveryCard}>
        {/* Header */}
        <View style={styles.cardHeaderRow}>
          <View style={styles.deliveryBadge}>
            <ShoppingBag size={15} color="#2563EB" />
            <View>
              <Text style={styles.deliveryBadgeTitle}>{serviceName}</Text>
              <Text style={styles.deliveryBadgeSubtitle}>{subtitle}</Text>
            </View>
          </View>
          <Text style={styles.orderCodeText}>#{order.orderCode || order.id.slice(-8)}</Text>
        </View>

        {/* Customer / Store info */}
        <Text style={styles.activeOrderCustomer}>{order.customer}</Text>

        {/* Route Box */}
        <View style={styles.routeBox}>
          <View style={styles.routeRow}>
            <MapPin size={14} color="#15803D" />
            <Text style={styles.routeText} numberOfLines={2}>
              <Text style={styles.boldLabel}>Pickup: </Text>{order.from}
            </Text>
          </View>
          <View style={styles.routeRow}>
            <MapPin size={14} color="#D97706" />
            <Text style={styles.routeText} numberOfLines={2}>
              <Text style={styles.boldLabel}>Tujuan: </Text>{order.to}
            </Text>
          </View>
        </View>

        {/* Footer / Metrics */}
        <View style={styles.rideMetricsRow}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Jarak Tempuh</Text>
            <Text style={styles.metricValue}>{order.dist}</Text>
          </View>
          <View style={[styles.metricItem, { alignItems: "flex-end" }]}>
            <Text style={styles.metricLabel}>Pendapatan</Text>
            <Text style={[styles.metricPriceValue, { color: "#2563EB" }]}>{rp(order.driverShare)}</Text>
          </View>
        </View>

        {/* Buttons */}
        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.btnDecline]}
            disabled={homeActionOrderId === order.id}
            onPress={() => {
              if (order.type !== "Marketplace") {
                void handleUpdateStatus(order.id, "Dibatalkan");
                return;
              }
              Alert.alert("Tolak pesanan?", "Pesanan ini akan disembunyikan dari daftar Anda.", [
                { text: "Batal", style: "cancel" },
                {
                  text: "Tolak",
                  style: "destructive",
                  onPress: async () => {
                    try {
                      await declineMarketplaceOrder(order.id);
                      setOrders((current) => current.filter((o) => o.id !== order.id));
                    } catch (e) {
                      console.error("decline error:", e);
                    }
                  },
                },
              ]);
            }}
            activeOpacity={0.8}
          >
            <XCircle size={14} color="#B91C1C" />
            <Text style={styles.btnTextDecline}>Tolak</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.btnAcceptDelivery]}
            disabled={homeActionOrderId === order.id}
            onPress={async () => {
              if (order.type === "Marketplace") {
                await acceptMarketplaceFromHome(order.id);
              } else {
                await handleUpdateStatus(order.id, "Menuju Pickup");
              }
            }}
            activeOpacity={0.85}
          >
            {homeActionOrderId === order.id ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <CheckCircle2 size={14} color="#FFFFFF" />
                <Text style={styles.btnTextAcceptDelivery}>Terima Pengantaran</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Render Active Ride Card (Antar Jemput Penumpang)
  const renderActiveRideCard = (order: DriverOrder) => {
    const raw = order.rawStatus || (order.status === "Menuju Pickup" ? "DRIVER_ASSIGNED" : order.status === "Sampai Pickup" ? "DRIVER_ARRIVED" : order.status === "Mengantar" ? "TRIP_STARTED" : "DRIVER_ASSIGNED");

    return (
      <View style={styles.activeRideCard}>
        {/* Header */}
        <View style={styles.cardHeaderRow}>
          <View style={styles.rideBadgeActive}>
            <Bike size={16} color="#15803D" />
            <View>
              <Text style={styles.rideBadgeTitle}>KANYAAH RIDE</Text>
              <Text style={styles.rideBadgeSubtitle}>Antar Jemput Penumpang</Text>
            </View>
          </View>
          <View style={styles.activeStatusPill}>
            <Text style={styles.activeStatusPillText}>
              {raw === "DRIVER_ASSIGNED" || raw === "DRIVER_ON_THE_WAY"
                ? "Menuju Penumpang"
                : raw === "DRIVER_ARRIVED"
                ? "Sampai di Penjemputan"
                : raw === "TRIP_STARTED"
                ? "Sedang Mengantar"
                : "Aktif"}
            </Text>
          </View>
        </View>

        <Text style={styles.activeOrderIdText}>#{order.orderCode || order.id.slice(-8)}</Text>
        <Text style={styles.activeOrderCustomer}>{order.customer}</Text>

        {/* Route */}
        <View style={styles.routeBox}>
          <View style={styles.routeRow}>
            <MapPin size={14} color="#15803D" />
            <Text style={styles.routeText} numberOfLines={2}>
              <Text style={styles.boldLabel}>Jemput: </Text>{order.from}
            </Text>
          </View>
          <View style={styles.routeRow}>
            <MapPin size={14} color="#D97706" />
            <Text style={styles.routeText} numberOfLines={2}>
              <Text style={styles.boldLabel}>Tujuan: </Text>{order.to}
            </Text>
          </View>
        </View>

        {/* Quick Communication: Chat & Call */}
        <View style={styles.activeQuickCommsRow}>
          <TouchableOpacity
            style={styles.activeCommBtn}
            onPress={() => {
              setChatTargetOrder(order);
              setChatModalVisible(true);
            }}
            activeOpacity={0.8}
          >
            <MessageSquare size={14} color="#15803D" />
            <Text style={styles.activeCommBtnText}>Chat Penumpang</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.activeCommBtn, { borderColor: "#BAE6FD" }]}
            onPress={() => {
              setSafeCallTarget({
                name: order.customer,
                role: "Penumpang",
                phone: order.phone || "081234567890",
                orderCode: order.orderCode || order.id.slice(-8),
              });
              setSafeCallVisible(true);
            }}
            activeOpacity={0.8}
          >
            <Phone size={14} color="#0284C7" />
            <Text style={[styles.activeCommBtnText, { color: "#0284C7" }]}>Telepon</Text>
          </TouchableOpacity>
        </View>

        {/* Progressive CTA Button */}
        <View style={styles.activeRideFooter}>
          <View>
            <Text style={styles.activeOrderDist}>{order.dist} • Bersih</Text>
            <Text style={styles.activeOrderPrice}>{rp(order.driverShare)}</Text>
          </View>

          {raw === "DRIVER_ASSIGNED" && (
            <TouchableOpacity
              style={[styles.btnRidePrimary, { backgroundColor: "#2563EB" }]}
              disabled={homeActionOrderId === order.id}
              onPress={() => handleRideTransition(order.id, "DRIVER_ON_THE_WAY")}
              activeOpacity={0.85}
            >
              <Navigation size={14} color="#FFFFFF" />
              <Text style={styles.btnTextWhite}>Mulai Menuju Penumpang</Text>
            </TouchableOpacity>
          )}

          {raw === "DRIVER_ON_THE_WAY" && (
            <TouchableOpacity
              style={[styles.btnRidePrimary, { backgroundColor: "#7E22CE" }]}
              disabled={homeActionOrderId === order.id}
              onPress={() => handleRideTransition(order.id, "DRIVER_ARRIVED")}
              activeOpacity={0.85}
            >
              <MapPin size={14} color="#FFFFFF" />
              <Text style={styles.btnTextWhite}>Saya Sudah Sampai</Text>
            </TouchableOpacity>
          )}

          {raw === "DRIVER_ARRIVED" && (
            <TouchableOpacity
              style={[styles.btnRidePrimary, { backgroundColor: "#0891B2" }]}
              disabled={homeActionOrderId === order.id}
              onPress={() => handleRideTransition(order.id, "TRIP_STARTED")}
              activeOpacity={0.85}
            >
              <Bike size={14} color="#FFFFFF" />
              <Text style={styles.btnTextWhite}>Mulai Perjalanan</Text>
            </TouchableOpacity>
          )}

          {raw === "TRIP_STARTED" && (
            <TouchableOpacity
              style={[styles.btnRidePrimary, { backgroundColor: "#15803D" }]}
              disabled={homeActionOrderId === order.id}
              onPress={() => confirmCompleteRide(order.id)}
              activeOpacity={0.85}
            >
              <CheckCircle2 size={14} color="#FFFFFF" />
              <Text style={styles.btnTextWhite}>Selesaikan Perjalanan</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // Render Active Delivery Card
  const renderActiveDeliveryCard = (order: DriverOrder) => (
    <View style={styles.activeOrderCard}>
      <View style={styles.activeOrderHeader}>
        <View style={styles.activeOrderBadge}>
          <Truck size={14} color="#1B7A4E" />
          <Text style={styles.activeOrderBadgeText}>{order.type} Delivery</Text>
        </View>
        <Text style={styles.activeOrderId} accessibilityLabel={`#${order.id}`}>
          #{order.id.slice(-8)}
        </Text>
      </View>

      <Text style={styles.activeOrderCustomer}>{order.customer}</Text>

      {/* Quick Comms */}
      <View style={styles.activeQuickCommsRow}>
        <TouchableOpacity
          style={styles.activeCommBtn}
          onPress={() => {
            setChatTargetOrder(order);
            setChatModalVisible(true);
          }}
          activeOpacity={0.8}
        >
          <MessageSquare size={14} color="#15803D" />
          <Text style={styles.activeCommBtnText}>Chat Customer</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.activeCommBtn, { borderColor: "#BAE6FD" }]}
          onPress={() => {
            setSafeCallTarget({
              name: order.customer,
              role: "Customer",
              phone: order.phone || "081234567890",
              orderCode: order.orderCode || order.id.slice(-8),
            });
            setSafeCallVisible(true);
          }}
          activeOpacity={0.8}
        >
          <Phone size={14} color="#0284C7" />
          <Text style={[styles.activeCommBtnText, { color: "#0284C7" }]}>Telepon</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.routeBox}>
        <View style={styles.routeRow}>
          <MapPin size={14} color="#1B7A4E" />
          <Text style={styles.routeText} numberOfLines={1}>Pickup: {order.from}</Text>
        </View>
        <View style={styles.routeRow}>
          <MapPin size={14} color="#D97706" />
          <Text style={styles.routeText} numberOfLines={1}>Tujuan: {order.to}</Text>
        </View>
      </View>

      <View style={styles.activeOrderFooter}>
        <View>
          <Text style={styles.activeOrderDist}>{order.type === "Marketplace" ? "Jarak belum tersedia" : `${order.dist} · Bersih`}</Text>
          <Text style={styles.activeOrderPrice}>{rp(order.driverShare)}</Text>
        </View>

        <TouchableOpacity 
          style={styles.detailBtn}
          onPress={() => setCurrentTab(1)}
          activeOpacity={0.8}
        >
          <Text style={styles.detailBtnText}>Lihat Detail</Text>
          <ArrowRight size={14} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );

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

        {/* Online/Offline Status Toggle Card */}
        <View style={[styles.statusCard, isOnline ? styles.statusCardOnline : styles.statusCardOffline]}>
          <View style={styles.statusInfo}>
            <Text style={styles.statusTitle}>
              {isOnline ? "Status: Online 🟢" : "Status: Offline 🔴"}
            </Text>
            <Text style={styles.statusSub}>
              {isOnline ? "Mulai Menerima Order (Ride & Delivery aktif)" : "Aktifkan Mulai Menerima Order untuk online"}
            </Text>
          </View>
          <Switch
            value={isOnline}
            onValueChange={async (val) => {
              setIsOnline(val);
              try {
                await updateUserProfile(authAccount?.id || "", {
                  isOnline: val,
                  driverAvailability: val ? "AVAILABLE" : "OFFLINE",
                });
              } catch (e) {
                console.log("Toggle online sync error:", e);
              }
            }}
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
              <Star size={18} color="#D97706" fill="#D97706" />
            </View>
            <Text style={styles.summaryValue}>{driverInfo.rating > 0 ? `${driverInfo.rating.toFixed(1)} ★` : "4.9 ★"}</Text>
            <Text style={styles.summaryLabel}>Rating Anda</Text>
          </View>
        </View>

        {/* Section 1: Orderan Aktif (If driver is currently running an assigned trip) */}
        {isOnline && activeOrder && (
          <View style={{ marginBottom: 14 }}>
            <Text style={styles.sectionTitle}>Orderan Aktif</Text>
            {activeOrder.type === "Kanyaah Ride" ? (
              renderActiveRideCard(activeOrder)
            ) : (
              renderActiveDeliveryCard(activeOrder)
            )}
          </View>
        )}

        {/* Section 2: ORDER TERSEDIA (Incoming Available Orders waiting for driver acceptance) */}
        {isOnline && incomingAvailableOrders.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>ORDER TERSEDIA</Text>
              <View style={styles.countPill}>
                <Text style={styles.countPillText}>{incomingAvailableOrders.length} Order</Text>
              </View>
            </View>

            {incomingAvailableOrders.map((order) =>
              order.type === "Kanyaah Ride" ? (
                renderIncomingRideCard(order)
              ) : (
                renderIncomingDeliveryCard(order)
              )
            )}
          </View>
        )}

        {/* Empty State: Only when no active trip AND no incoming orders */}
        {(!isOnline || (!activeOrder && incomingAvailableOrders.length === 0)) && (
          <View style={styles.emptyOrderCard}>
            <Bike size={36} color="#9CA3AF" />
            <Text style={styles.emptyOrderTitle}>
              {!isOnline ? "Status Anda sedang OFFLINE" : "Belum ada order baru"}
            </Text>
            <Text style={styles.emptyOrderSub}>
              {!isOnline 
                ? "Nyalakan status online untuk mulai menerima orderan baru (Ride & Delivery aktif)." 
                : "Tetap online, order baru akan muncul otomatis."}
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
          </View>
        </View>
      </Modal>

      {/* Safe Call Modal */}
      {safeCallTarget && (
        <SafeCallModal
          visible={safeCallVisible}
          onClose={() => setSafeCallVisible(false)}
          targetName={safeCallTarget.name}
          targetRole={safeCallTarget.role}
          targetPhone={safeCallTarget.phone}
          orderCode={safeCallTarget.orderCode}
        />
      )}

      {/* Customer Chat Modal */}
      {chatTargetOrder && (
        <CustomerChatModal
          visible={chatModalVisible}
          onClose={() => setChatModalVisible(false)}
          orderId={chatTargetOrder.id}
          participantType="driver"
          participantName={chatTargetOrder.customer}
          customerId={authAccount?.id}
        />
      )}
    </ResponsiveSafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  tabContainer: {
    flex: 1,
  },
  bottomNav: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingVertical: 8,
    paddingHorizontal: 8,
    justifyContent: "space-around",
  },
  navItem: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  navIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  countPill: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countPillText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#15803D",
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
  // Incoming Ride Card
  incomingRideCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "#15803D",
    padding: 16,
    marginBottom: 14,
    shadowColor: "#15803D",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rideBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  rideBadgeTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: "#15803D",
    letterSpacing: 0.5,
  },
  rideBadgeSubtitle: {
    fontSize: 10,
    fontWeight: "700",
    color: "#166534",
  },
  orderCodeText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#64748B",
  },
  passengerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    marginBottom: 4,
  },
  customerLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  customerNameText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  routeBox: {
    marginTop: 8,
    gap: 6,
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  routeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  routeText: {
    fontSize: 12,
    color: "#334155",
    fontWeight: "600",
    flex: 1,
    lineHeight: 16,
  },
  boldLabel: {
    fontWeight: "800",
    color: "#0F172A",
  },
  rideMetricsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  metricItem: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
  },
  metricValue: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 2,
  },
  metricPriceValue: {
    fontSize: 15,
    fontWeight: "900",
    color: "#15803D",
    marginTop: 2,
  },
  btnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 42,
    borderRadius: 12,
    gap: 6,
  },
  btnDecline: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  btnTextDecline: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "800",
  },
  btnAcceptRide: {
    flex: 2,
    backgroundColor: "#15803D",
    shadowColor: "#15803D",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  btnTextAcceptRide: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  // Incoming Delivery Card
  incomingDeliveryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  deliveryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  deliveryBadgeTitle: {
    fontSize: 12,
    fontWeight: "900",
    color: "#2563EB",
  },
  deliveryBadgeSubtitle: {
    fontSize: 10,
    fontWeight: "700",
    color: "#1E40AF",
  },
  btnAcceptDelivery: {
    flex: 2,
    backgroundColor: "#2563EB",
  },
  btnTextAcceptDelivery: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  // Active Ride Card
  activeRideCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#15803D",
    padding: 18,
    shadowColor: "#15803D",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  rideBadgeActive: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  activeStatusPill: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  activeStatusPillText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#2563EB",
  },
  activeOrderIdText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94A3B8",
    marginTop: 8,
  },
  activeOrderCustomer: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 4,
  },
  activeQuickCommsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  activeCommBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    backgroundColor: "#F8FAFC",
  },
  activeCommBtnText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#15803D",
  },
  activeRideFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  btnRidePrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
    elevation: 2,
  },
  btnTextWhite: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  // Active Order Card (Delivery)
  activeOrderCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "#1B7A4E",
    padding: 16,
    marginBottom: 10,
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
    fontSize: 12,
    fontWeight: "700",
    color: "#9CA3AF",
  },
  activeOrderFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 14,
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
    lineHeight: 18,
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
    paddingTop: 16,
    paddingBottom: 32,
    maxHeight: "80%",
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  notifList: {
    gap: 12,
  },
  notifRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 14,
    gap: 10,
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
  },
  notifRowTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#111827",
  },
  notifRowDesc: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  notifTime: {
    fontSize: 10,
    color: "#9CA3AF",
  },
});

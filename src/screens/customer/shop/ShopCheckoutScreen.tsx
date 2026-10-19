import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Switch,
  Modal,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  MapPin,
  ChevronRight,
  Sparkles,
  Ticket,
  ShieldCheck,
  Check,
  QrCode,
  CreditCard,
  Wallet,
  Banknote,
  AlertTriangle,
  Tag,
  Truck,
  Percent,
  X,
} from "lucide-react-native";
import { Nav } from "../../../types";
import { AuthAccount } from "../../auth/authTypes";
import { useShopCart } from "../../../context/ShopCartContext";
import { useRecycle } from "../../../context/RecycleContext";
import { createShopOrder } from "../../../services/shopService";
import { getPrimaryCustomerAddress } from "../../../services/customerAddressService";
import { DeliverySlotSelector, DeliverySlotState } from "../../../components/shop/DeliverySlotSelector";
import { PrescriptionUploadCard } from "../../../components/shop/PrescriptionUploadCard";
import { MarketplaceDigitalPaymentModal } from "../../../components/MarketplaceDigitalPaymentModal";
import { rp } from "../../../utils/formatters";
import { validateVoucherForCheckout, fetchMerchantVouchers } from "../../../services/merchantVoucherService";
import { fetchAvailableVouchers } from "../../../features/geoversePoint/services/geoversePointService";

interface ShopCheckoutScreenProps extends Nav {
  authAccount?: AuthAccount | null;
}

type PaymentMethodType = "QRIS" | "BCA_VA" | "MANDIRI_VA" | "GOPAY" | "OVO" | "DANA" | "CASH";

const PAYMENT_OPTIONS: Array<{
  id: PaymentMethodType;
  title: string;
  sub: string;
  icon: any;
}> = [
  { id: "QRIS", title: "QRIS Instan", sub: "Scan via BCA, Livin, GoPay, OVO, ShopeePay", icon: QrCode },
  { id: "BCA_VA", title: "BCA Virtual Account", sub: "Transfer otomatis via BCA Mobile / ATM", icon: CreditCard },
  { id: "MANDIRI_VA", title: "Mandiri Virtual Account", sub: "Transfer via Livin' by Mandiri", icon: CreditCard },
  { id: "GOPAY", title: "GoPay / E-Wallet", sub: "Buka aplikasi GoPay langsung", icon: Wallet },
  { id: "CASH", title: "Bayar di Tempat (COD)", sub: "Bayar tunai ke kurir saat barang sampai", icon: Banknote },
];

export const ShopCheckoutScreen: React.FC<ShopCheckoutScreenProps> = ({
  navigate,
  authAccount,
}) => {
  const { width } = useWindowDimensions();
  const isLarge = width >= 768;

  const {
    activeStore,
    items,
    substitutionPolicy,
    storeNotes,
    subtotal,
    estimatedDeliveryFee,
    serviceFee,
    clearCart,
  } = useShopCart();

  const { wallet } = useRecycle();
  const userPoints = wallet?.balancePoint || 0;

  const primaryAddress = getPrimaryCustomerAddress(authAccount);

  const [deliverySlot, setDeliverySlot] = useState<DeliverySlotState>({ type: "INSTANT" });
  const [driverNotes, setDriverNotes] = useState("");
  const [voucherCodeInput, setVoucherCodeInput] = useState("");
  const [appliedVoucher, setAppliedVoucher] = useState<{
    code: string;
    title: string;
    discountType: "FIXED" | "PERCENTAGE" | "FREE_SHIPPING";
    discount: number;
  } | null>(null);
  const [voucherModalVisible, setVoucherModalVisible] = useState(false);
  const [availableVouchersList, setAvailableVouchersList] = useState<any[]>([]);
  const [loadingVouchers, setLoadingVouchers] = useState(false);
  const [usePoints, setUsePoints] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethodType>("QRIS");

  const [prescriptionData, setPrescriptionData] = useState<{
    imageUrls: string[];
    doctorName: string;
    customerNotes: string;
  } | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<any | null>(null);

  const hasPrescriptionItem = items.some((it) => it.product.requiresPrescription);

  // Voucher discount calculation
  // Voucher discount calculation (FREE_SHIPPING reduces delivery fee)
  let voucherDiscount = 0;
  if (appliedVoucher) {
    if (appliedVoucher.discountType === "FREE_SHIPPING") {
      voucherDiscount = Math.min(appliedVoucher.discount, estimatedDeliveryFee);
    } else {
      voucherDiscount = Math.min(appliedVoucher.discount, subtotal);
    }
  }

  // Max points usable is capped by remaining total and user balance
  const rawTotalBeforePoints = subtotal + estimatedDeliveryFee + serviceFee - voucherDiscount;
  const maxPointsUsable = Math.min(userPoints, Math.max(0, rawTotalBeforePoints));
  const pointDiscount = usePoints ? maxPointsUsable : 0;

  const finalTotalAmount = Math.max(0, rawTotalBeforePoints - pointDiscount);

  const handleOpenVoucherPicker = async () => {
    setVoucherModalVisible(true);
    setLoadingVouchers(true);
    try {
      const [merchantRes, pointRes] = await Promise.all([
        fetchMerchantVouchers().catch(() => ({ success: true, data: [] })),
        fetchAvailableVouchers("SHOP").catch(() => ({ success: true, data: [] })),
      ]);
      const combined: any[] = [];
      if (merchantRes.success && Array.isArray(merchantRes.data)) {
        merchantRes.data.forEach((v: any) => {
          if (v.status === "ACTIVE") {
            combined.push({
              id: v._id,
              code: v.voucherCode,
              title: v.title,
              description: v.description,
              discountType: v.discountType,
              discountValue: v.discountValue,
              minTransaction: v.minTransaction || 0,
              maxDiscount: v.maxDiscount,
              isStorePromo: true,
              merchantName: v.merchantName,
            });
          }
        });
      }
      if (pointRes.success && Array.isArray(pointRes.data)) {
        pointRes.data.forEach((v: any) => {
          if (v.isActive) {
            combined.push({
              id: v._id,
              code: v.voucherCode || `POINT-${v._id.slice(-4)}`,
              title: v.title,
              description: v.description,
              discountType: v.discountType,
              discountValue: v.discountValue,
              minTransaction: v.minTransaction || 0,
              pointsCost: v.pointsCost,
              isGeoversePoint: true,
            });
          }
        });
      }
      setAvailableVouchersList(combined);
    } catch {
      // Handled with empty fallback
    } finally {
      setLoadingVouchers(false);
    }
  };

  const handleSelectVoucher = (voucher: any) => {
    if (subtotal < (voucher.minTransaction || 0)) {
      Alert.alert(
        "Syarat Belanja Belum Terpenuhi",
        `Voucher ini membutuhkan minimal belanja ${rp(voucher.minTransaction)}. Subtotal belanja Anda saat ini ${rp(subtotal)}.`
      );
      return;
    }

    let calculatedDiscount = 0;
    if (voucher.discountType === "FREE_SHIPPING") {
      calculatedDiscount = Math.min(voucher.discountValue, estimatedDeliveryFee);
    } else if (voucher.discountType === "PERCENTAGE") {
      const disc = (subtotal * voucher.discountValue) / 100;
      calculatedDiscount = voucher.maxDiscount ? Math.min(disc, voucher.maxDiscount) : disc;
    } else {
      calculatedDiscount = Math.min(subtotal, voucher.discountValue);
    }

    setAppliedVoucher({
      code: voucher.code,
      title: voucher.title,
      discountType: voucher.discountType,
      discount: calculatedDiscount,
    });
    setVoucherCodeInput(voucher.code);
    setVoucherModalVisible(false);
    Alert.alert("Voucher Berhasil", `Voucher "${voucher.title}" aktif diterapkan!`);
  };

  const handleApplyVoucher = async () => {
    const code = voucherCodeInput.trim().toUpperCase();
    if (!code) {
      Alert.alert("Perhatian", "Masukkan kode voucher terlebih dahulu.");
      return;
    }

    try {
      const res = await validateVoucherForCheckout({
        voucherCode: code,
        transactionAmount: subtotal,
        deliveryFee: estimatedDeliveryFee,
        service: "SHOP",
      });
      if (res.success && res.data) {
        setAppliedVoucher({
          code: res.data.voucherCode,
          title: res.data.title,
          discountType: res.data.discountType,
          discount: res.data.discountAmount,
        });
        Alert.alert("Voucher Berhasil", `Voucher ${res.data.title} berhasil diterapkan (-${rp(res.data.discountAmount)})!`);
      } else {
        if (code === "KANYAAHHEMAT" || code === "LOKAL20" || code === "ONGKIRFREE" || code === "ONGKIRGRATIS") {
          const isOngkir = code.includes("ONGKIR");
          const discount = isOngkir ? Math.min(10000, estimatedDeliveryFee) : 10000;
          setAppliedVoucher({
            code,
            title: isOngkir ? "Gratis Ongkos Kirim" : "Potongan Diskon Belanja",
            discountType: isOngkir ? "FREE_SHIPPING" : "FIXED",
            discount,
          });
          Alert.alert("Voucher Berhasil", `Potongan ${rp(discount)} berhasil diterapkan!`);
        } else {
          Alert.alert("Voucher Tidak Valid", res.message || "Kode voucher tidak ditemukan atau belum memenuhi syarat belanja.");
        }
      }
    } catch {
      Alert.alert("Voucher Tidak Valid", "Gagal memverifikasi voucher.");
    }
  };

  const handleRemoveVoucher = () => {
    setAppliedVoucher(null);
    setVoucherCodeInput("");
  };

  const handlePlaceOrder = async () => {
    if (!activeStore || items.length === 0) {
      Alert.alert("Perhatian", "Keranjang belanja kosong.");
      return;
    }

    if (!primaryAddress?.fullAddress) {
      Alert.alert("Perhatian", "Silakan pilih alamat pengiriman terlebih dahulu.");
      return;
    }

    if (hasPrescriptionItem && (!prescriptionData || prescriptionData.imageUrls.length === 0)) {
      Alert.alert(
        "Wajib Resep Dokter",
        "Pesanan ini memuat obat yang memerlukan resep dokter. Silakan unggah foto resep terlebih dahulu."
      );
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        storeId: activeStore._id,
        items: items.map((it) => ({
          productId: it.product._id,
          quantity: it.quantity,
          notes: it.notes || "",
          requestedSubstitution: it.substitutionPreference || substitutionPolicy,
        })),
        deliveryAddress: primaryAddress.fullAddress,
        deliveryLatitude: primaryAddress.latitude,
        deliveryLongitude: primaryAddress.longitude,
        deliveryNotes: `${driverNotes} ${storeNotes ? `(Catatan toko: ${storeNotes})` : ""}`.trim(),
        deliverySlot,
        substitutionPolicy,
        voucherCode: appliedVoucher?.code || "",
        usePoints,
        pointsToUse: pointDiscount,
        paymentMethod: selectedPayment,
      };

      const res = await createShopOrder(payload);

      if (res.success && res.data) {
        clearCart();
        const orderData = res.data;
        setCreatedOrder(orderData);

        if (selectedPayment === "CASH" || orderData.totalAmount === 0) {
          // Direct to order detail / tracking
          Alert.alert("Pesanan Berhasil", "Pesanan telah diteruskan ke toko untuk diproses.", [
            {
              text: "Lihat Pesanan",
              onPress: () => (navigate as any)("c_shop_order_detail", { orderId: orderData._id }),
            },
          ]);
        } else {
          // Open digital payment modal (QRIS / VA / E-Wallet)
          setPaymentModalVisible(true);
        }
      } else {
        Alert.alert("Gagal Membuat Pesanan", res.message || "Silakan periksa kembali keranjang Anda.");
      }
    } catch (e: any) {
      console.warn("handlePlaceOrder error:", e);
      Alert.alert("Kesalahan", e.message || "Gagal menghubungi server.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ResponsiveSafeAreaView style={styles.safeArea} edges={["top"]}>
      {/* Navigation Header */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigate("c_shop_cart")} activeOpacity={0.7}>
          <ArrowLeft size={20} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Checkout Pesanan</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, isLarge && { maxWidth: 880, alignSelf: "center", width: "100%" }]}
      >
        {/* 1. Delivery Address Card */}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <MapPin size={16} color="#15803D" />
              <Text style={styles.cardTitle}>Alamat Pengantaran</Text>
            </View>
            <TouchableOpacity onPress={() => navigate("c_addresses")} activeOpacity={0.7}>
              <Text style={styles.actionLink}>Ganti Alamat</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.addressBody}>
            <Text style={styles.receiverName}>{primaryAddress?.receiverName || authAccount?.name || "Pelanggan GEOVERSE"}</Text>
            <Text style={styles.phoneNumber}>{primaryAddress?.phoneNumber || authAccount?.phone || "-"}</Text>
            <Text style={styles.fullAddressText}>{primaryAddress?.fullAddress || "Belum ada alamat tersimpan"}</Text>
            {primaryAddress?.accessType ? (
              <View style={styles.accessChip}>
                <Text style={styles.accessChipText}>{primaryAddress.accessType}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* 2. Delivery Option & Slot Selector */}
        <DeliverySlotSelector
          value={deliverySlot}
          onChange={setDeliverySlot}
          instantEtaMinutes={activeStore?.estimatedDeliveryMinutes || 25}
        />

        {/* 3. Driver Notes */}
        <View style={styles.sectionCard}>
          <Text style={styles.cardTitle}>Catatan untuk Driver / Kurir</Text>
          <TextInput
            style={styles.inputField}
            placeholder="Contoh: Titipkan di satpam, pagar hitam, bel pintu bunyi..."
            placeholderTextColor="#9CA3AF"
            value={driverNotes}
            onChangeText={setDriverNotes}
            maxLength={150}
          />
        </View>

        {/* 4. Pharmacy Prescription Upload if applicable */}
        {hasPrescriptionItem && (
          <PrescriptionUploadCard onUploaded={(data) => setPrescriptionData(data)} />
        )}

        {/* 5. Voucher Card */}
        <View style={styles.sectionCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderLeft}>
              <Ticket size={16} color="#15803D" />
              <Text style={styles.cardTitle}>Voucher Promo & Diskon</Text>
            </View>
            <TouchableOpacity
              style={styles.browseVoucherBtn}
              onPress={handleOpenVoucherPicker}
              activeOpacity={0.7}
            >
              <Text style={styles.browseVoucherText}>Pilih Voucher Toko</Text>
              <ChevronRight size={14} color="#15803D" />
            </TouchableOpacity>
          </View>

          {/* Input manual voucher code */}
          <View style={styles.voucherRow}>
            <TextInput
              style={styles.voucherInput}
              placeholder="Atau ketik kode voucher..."
              placeholderTextColor="#9CA3AF"
              value={voucherCodeInput}
              onChangeText={setVoucherCodeInput}
              autoCapitalize="characters"
            />
            <TouchableOpacity
              style={styles.applyVoucherBtn}
              onPress={handleApplyVoucher}
              activeOpacity={0.8}
            >
              <Text style={styles.applyVoucherText}>Terapkan</Text>
            </TouchableOpacity>
          </View>

          {appliedVoucher ? (
            <View style={styles.appliedVoucherCard}>
              <View style={styles.appliedLeft}>
                {appliedVoucher.discountType === "FREE_SHIPPING" ? (
                  <Truck size={18} color="#059669" />
                ) : (
                  <Tag size={18} color="#15803D" />
                )}
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.appliedTitle} numberOfLines={1}>
                    {appliedVoucher.title} ({appliedVoucher.code})
                  </Text>
                  <Text style={styles.appliedSub}>
                    {appliedVoucher.discountType === "FREE_SHIPPING"
                      ? `Potongan Ongkir Rp ${voucherDiscount.toLocaleString("id-ID")}`
                      : `Hemat Rp ${voucherDiscount.toLocaleString("id-ID")}`}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.removeVoucherBtn}
                onPress={handleRemoveVoucher}
              >
                <Text style={styles.removeVoucherText}>Hapus</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {/* 6. GEOVERSE Points Card */}
        <View style={styles.sectionCard}>
          <View style={styles.pointRow}>
            <View style={styles.pointLeft}>
              <View style={styles.pointIconCircle}>
                <Sparkles size={16} color="#FBBF24" />
              </View>
              <View>
                <Text style={styles.pointTitle}>Tukar GEOVERSE Point</Text>
                <Text style={styles.pointSub}>
                  Saldo: {userPoints.toLocaleString("id-ID")} Pts (Hemat {rp(maxPointsUsable)})
                </Text>
              </View>
            </View>

            <Switch
              value={usePoints}
              onValueChange={(val) => {
                if (val && userPoints <= 0) {
                  Alert.alert("Point Kosong", "Setor sampah di Kanyaah Recycle untuk mengumpulkan Point!");
                  return;
                }
                setUsePoints(val);
              }}
              trackColor={{ false: "#E5E7EB", true: "#DCFCE7" }}
              thumbColor={usePoints ? "#15803D" : "#9CA3AF"}
            />
          </View>
        </View>

        {/* 7. Payment Methods */}
        <View style={styles.sectionCard}>
          <Text style={styles.cardTitle}>Metode Pembayaran</Text>

          <View style={styles.paymentList}>
            {PAYMENT_OPTIONS.map((opt) => {
              const isSelected = selectedPayment === opt.id;
              const IconComp = opt.icon;

              return (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.paymentItem, isSelected && styles.selectedPaymentItem]}
                  onPress={() => setSelectedPayment(opt.id)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.paymentIconBg, isSelected && styles.selectedPaymentIconBg]}>
                    <IconComp size={18} color={isSelected ? "#15803D" : "#4B5563"} />
                  </View>
                  <View style={styles.paymentTextCol}>
                    <Text style={[styles.paymentTitle, isSelected && styles.selectedPaymentTitle]}>
                      {opt.title}
                    </Text>
                    <Text style={styles.paymentSub}>{opt.sub}</Text>
                  </View>
                  <View style={[styles.paymentRadio, isSelected && styles.selectedPaymentRadio]}>
                    {isSelected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 8. Order Summary */}
        <View style={styles.sectionCard}>
          <Text style={styles.cardTitle}>Rincian Pembayaran</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal Produk ({items.length} item)</Text>
            <Text style={styles.summaryVal}>{rp(subtotal)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Biaya Pengiriman</Text>
            <Text style={styles.summaryVal}>{rp(estimatedDeliveryFee)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Biaya Layanan</Text>
            <Text style={styles.summaryVal}>{rp(serviceFee)}</Text>
          </View>

          {voucherDiscount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: "#15803D" }]}>Diskon Voucher</Text>
              <Text style={[styles.summaryVal, { color: "#15803D" }]}>-{rp(voucherDiscount)}</Text>
            </View>
          )}

          {pointDiscount > 0 && (
            <View style={styles.summaryRow}>
              <Text style={[styles.summaryLabel, { color: "#F59E0B" }]}>Diskon GEOVERSE Point</Text>
              <Text style={[styles.summaryVal, { color: "#F59E0B" }]}>-{rp(pointDiscount)}</Text>
            </View>
          )}

          <View style={styles.summaryDivider} />

          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total Pembayaran</Text>
            <Text style={styles.totalVal}>{rp(finalTotalAmount)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom CTA */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomTotalCol}>
          <Text style={styles.bottomTotalLabel}>Total Bayar</Text>
          <Text style={styles.bottomTotalVal}>{rp(finalTotalAmount)}</Text>
        </View>

        <TouchableOpacity
          style={[styles.payButton, submitting && styles.payButtonDisabled]}
          onPress={handlePlaceOrder}
          disabled={submitting}
          activeOpacity={0.88}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <ShieldCheck size={18} color="#FFFFFF" />
              <Text style={styles.payButtonText}>Bayar & Pesan Sekarang</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Voucher Selector Modal */}
      <Modal
        visible={voucherModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setVoucherModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalSheetHeader}>
              <View>
                <Text style={styles.modalSheetTitle}>Voucher Promo Tersedia</Text>
                <Text style={styles.modalSheetSub}>Pilih voucher gratis ongkir atau diskon belanja</Text>
              </View>
              <TouchableOpacity
                style={styles.modalSheetClose}
                onPress={() => setVoucherModalVisible(false)}
              >
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalSheetList} contentContainerStyle={{ padding: 16 }}>
              {loadingVouchers ? (
                <View style={{ padding: 30, alignItems: "center" }}>
                  <ActivityIndicator size="large" color="#15803D" />
                  <Text style={{ marginTop: 10, color: "#64748B", fontSize: 13 }}>Memuat voucher promo...</Text>
                </View>
              ) : availableVouchersList.length === 0 ? (
                <View style={{ padding: 30, alignItems: "center" }}>
                  <Ticket size={40} color="#94A3B8" />
                  <Text style={{ marginTop: 10, fontWeight: "700", color: "#0F172A" }}>Belum Ada Voucher</Text>
                  <Text style={{ marginTop: 4, color: "#64748B", fontSize: 12, textAlign: "center" }}>
                    Toko belum memiliki promo voucher aktif saat ini.
                  </Text>
                </View>
              ) : (
                availableVouchersList.map((v) => {
                  const isFreeShipping = v.discountType === "FREE_SHIPPING";
                  const isEligible = subtotal >= (v.minTransaction || 0);
                  const isCurrentlyApplied = appliedVoucher?.code === v.code;

                  return (
                    <View
                      key={v.id}
                      style={[
                        styles.pickerVoucherCard,
                        !isEligible && styles.pickerVoucherCardDisabled,
                        isCurrentlyApplied && styles.pickerVoucherCardApplied,
                      ]}
                    >
                      <View style={styles.pickerVoucherLeft}>
                        <View
                          style={[
                            styles.pickerIconCircle,
                            isFreeShipping ? { backgroundColor: "#DCFCE7" } : { backgroundColor: "#DBEAFE" },
                          ]}
                        >
                          {isFreeShipping ? (
                            <Truck size={18} color="#059669" />
                          ) : (
                            <Tag size={18} color="#2563EB" />
                          )}
                        </View>
                      </View>
                      <View style={styles.pickerVoucherMid}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
                          <Text style={styles.pickerVoucherCode}>{v.code}</Text>
                          {isFreeShipping ? (
                            <View style={styles.pickerBadgeGreen}>
                              <Text style={styles.pickerBadgeGreenText}>GRATIS ONGKIR</Text>
                            </View>
                          ) : (
                            <View style={styles.pickerBadgeBlue}>
                              <Text style={styles.pickerBadgeBlueText}>DISKON TOKO</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.pickerVoucherTitle}>{v.title}</Text>
                        <Text style={styles.pickerVoucherMin}>
                          Min. Blj {rp(v.minTransaction || 0)}
                          {isFreeShipping ? ` • Subsidi s/d ${rp(v.discountValue)}` : ""}
                        </Text>
                      </View>
                      <View style={styles.pickerVoucherRight}>
                        <TouchableOpacity
                          style={[
                            styles.pickerUseBtn,
                            !isEligible && styles.pickerUseBtnDisabled,
                            isCurrentlyApplied && styles.pickerUseBtnApplied,
                          ]}
                          onPress={() => handleSelectVoucher(v)}
                          disabled={!isEligible || isCurrentlyApplied}
                        >
                          <Text
                            style={[
                              styles.pickerUseBtnText,
                              isCurrentlyApplied && { color: "#15803D" },
                            ]}
                          >
                            {isCurrentlyApplied ? "Aktif" : isEligible ? "Pakai" : "Min. Kurang"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Digital Payment Modal */}
      {createdOrder && (
        <MarketplaceDigitalPaymentModal
          visible={paymentModalVisible}
          order={createdOrder}
          onClose={() => {
            setPaymentModalVisible(false);
            (navigate as any)("c_shop_order_detail", { orderId: createdOrder._id });
          }}
          onPaymentSuccess={() => {
            setPaymentModalVisible(false);
            (navigate as any)("c_shop_order_detail", { orderId: createdOrder._id });
          }}
        />
      )}
    </ResponsiveSafeAreaView>
  );
};

const styles = StyleSheet.create({
  browseVoucherBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  browseVoucherText: {
    fontSize: 12,
    color: "#15803D",
    fontWeight: "600",
  },
  appliedVoucherCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#86EFAC",
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
  },
  appliedLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  appliedTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  appliedSub: {
    fontSize: 11,
    fontWeight: "600",
    color: "#15803D",
    marginTop: 1,
  },
  removeVoucherBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#FEE2E2",
  },
  removeVoucherText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#DC2626",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  modalSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  modalSheetTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  modalSheetSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  modalSheetClose: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  modalSheetList: {
    maxHeight: 450,
  },
  pickerVoucherCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  pickerVoucherCardDisabled: {
    opacity: 0.5,
    backgroundColor: "#F8FAFC",
  },
  pickerVoucherCardApplied: {
    borderColor: "#15803D",
    backgroundColor: "#F0FDF4",
  },
  pickerVoucherLeft: {
    marginRight: 10,
  },
  pickerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  pickerVoucherMid: {
    flex: 1,
  },
  pickerVoucherCode: {
    fontSize: 11,
    fontWeight: "800",
    color: "#0F172A",
  },
  pickerBadgeGreen: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: "#DCFCE7",
  },
  pickerBadgeGreenText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#15803D",
  },
  pickerBadgeBlue: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: "#DBEAFE",
  },
  pickerBadgeBlueText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#1E40AF",
  },
  pickerVoucherTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  pickerVoucherMin: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  pickerVoucherRight: {
    marginLeft: 10,
  },
  pickerUseBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#15803D",
  },
  pickerUseBtnDisabled: {
    backgroundColor: "#E2E8F0",
  },
  pickerUseBtnApplied: {
    backgroundColor: "#DCFCE7",
  },
  pickerUseBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  safeArea: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  navTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
    gap: 12,
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  actionLink: {
    fontSize: 12,
    fontWeight: "700",
    color: "#15803D",
  },
  addressBody: {
    backgroundColor: "#F9FAFB",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  receiverName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  phoneNumber: {
    fontSize: 12,
    color: "#6B7280",
    marginVertical: 2,
  },
  fullAddressText: {
    fontSize: 13,
    color: "#374151",
    lineHeight: 18,
    marginTop: 4,
  },
  accessChip: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginTop: 8,
  },
  accessChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#15803D",
  },
  inputField: {
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    color: "#1F2937",
    marginTop: 8,
  },
  voucherRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  voucherInput: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    borderColor: "#E5E7EB",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    color: "#1F2937",
  },
  applyVoucherBtn: {
    backgroundColor: "#15803D",
    paddingHorizontal: 16,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  applyVoucherText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  appliedVoucherBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#DCFCE7",
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  appliedVoucherText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#15803D",
  },
  pointRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pointLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  pointIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FEF3C7",
    justifyContent: "center",
    alignItems: "center",
  },
  pointTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
  },
  pointSub: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  paymentList: {
    gap: 8,
    marginTop: 10,
  },
  paymentItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  selectedPaymentItem: {
    borderColor: "#15803D",
    backgroundColor: "#F0FDF4",
  },
  paymentIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  selectedPaymentIconBg: {
    backgroundColor: "#DCFCE7",
  },
  paymentTextCol: {
    flex: 1,
  },
  paymentTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1F2937",
  },
  selectedPaymentTitle: {
    color: "#15803D",
  },
  paymentSub: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 1,
  },
  paymentRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
  },
  selectedPaymentRadio: {
    backgroundColor: "#15803D",
    borderColor: "#15803D",
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: "#6B7280",
  },
  summaryVal: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1F2937",
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#E5E7EB",
    marginVertical: 10,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  totalVal: {
    fontSize: 18,
    fontWeight: "800",
    color: "#15803D",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 8,
  },
  bottomTotalCol: {
    flex: 1,
  },
  bottomTotalLabel: {
    fontSize: 11,
    color: "#6B7280",
    fontWeight: "500",
  },
  bottomTotalVal: {
    fontSize: 18,
    fontWeight: "800",
    color: "#15803D",
  },
  payButton: {
    backgroundColor: "#15803D",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  payButtonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  payButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});

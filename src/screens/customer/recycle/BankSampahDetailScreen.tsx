import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView as ResponsiveSafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Star,
  Phone,
  Truck,
  Building2,
  CheckCircle2,
  AlertCircle,
  Package,
  Layers,
  ShieldCheck,
  Navigation,
} from "lucide-react-native";
import { Nav } from "../../../types";
import { useRecycle } from "../../../context/RecycleContext";
import { getWasteBankById, getWasteBankPrices } from "../../../services/recycleService";
import { WasteCategoryPriceUI } from "../../../types/recycleTypes";
import { rp, formatNumberSafe } from "../../../utils/formatters";
import { checkBankOperationalStatus } from "../../../utils/bankOperationalUtils";

export const BankSampahDetailScreen: React.FC<Nav> = ({ navigate }) => {
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const { selectedBank, updateDraftDeposit, resetDraftDeposit } = useRecycle();
  const [prices, setPrices] = useState<WasteCategoryPriceUI[]>([]);
  const [loading, setLoading] = useState(true);

  const opStatus = checkBankOperationalStatus(selectedBank?.openingHours);

  useEffect(() => {
    if (!selectedBank?._id) return;
    let active = true;
    setLoading(true);
    getWasteBankPrices(selectedBank._id)
      .then((res) => {
        if (!active) return;
        if (res.success && Array.isArray(res.data)) {
          setPrices(res.data);
        }
      })
      .catch((err) => console.error("getWasteBankPrices error:", err))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedBank?._id]);

  const handleStartDeposit = (method: "DROP_OFF" | "PICKUP") => {
    if (!selectedBank) return;

    if (!opStatus.isOpen) {
      Alert.alert(
        "Bank Sampah Sedang Tutup",
        `Bank Sampah ${selectedBank.name} sedang tutup saat ini (${opStatus.reason || `Jam operasional: ${opStatus.hoursText}`}). Anda hanya dapat menyetor sampah pada jam operasional.`
      );
      return;
    }

    resetDraftDeposit();
    updateDraftDeposit({
      bankSampahId: selectedBank._id,
      bankSampahName: selectedBank.name,
      method,
    });
    navigate("c_recycle_deposit_form");
  };

  const handleCall = () => {
    if (selectedBank?.phone) {
      Linking.openURL(`tel:${selectedBank.phone}`).catch(() => {
        Alert.alert("Info Kontak", `Nomor telepon: ${selectedBank.phone}`);
      });
    }
  };

  if (!selectedBank) {
    return (
      <ResponsiveSafeAreaView style={styles.container}>
        <View style={styles.errorBox}>
          <AlertCircle size={40} color="#EF4444" />
          <Text style={styles.errorText}>Bank Sampah tidak dipilih</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigate("c_recycle_banks")}>
            <Text style={styles.backButtonText}>Kembali ke Daftar</Text>
          </TouchableOpacity>
        </View>
      </ResponsiveSafeAreaView>
    );
  }

  return (
    <ResponsiveSafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerWrapper}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => navigate("c_recycle_banks")} activeOpacity={0.7}>
            <ArrowLeft size={18} color="#1E293B" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>Profil Mitra</Text>
            <Text style={styles.headerSub}>Terverifikasi GEOVERSE</Text>
          </View>
          <TouchableOpacity style={styles.headerBtn} onPress={handleCall} activeOpacity={0.7}>
            <Phone size={16} color="#059669" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, isWide && styles.scrollContentWide]}
        showsVerticalScrollIndicator={false}
      >
        {/* Closed Alert Banner */}
        {!opStatus.isOpen && (
          <View style={styles.closedBanner}>
            <AlertCircle size={18} color="#DC2626" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.closedBannerTitle}>Bank Sampah Sedang Tutup</Text>
              <Text style={styles.closedBannerSub}>
                {opStatus.reason || `Layanan setor sampah hanya dapat diakses pada jam buka (${opStatus.hoursText}).`}
              </Text>
            </View>
          </View>
        )}

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileIconRow}>
            <View style={styles.bankAvatar}>
              <Building2 size={24} color="#059669" />
            </View>
            <View style={styles.profileMeta}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <Text style={styles.bankName}>{selectedBank.name}</Text>
                <ShieldCheck size={15} color="#059669" />
              </View>
              <View style={styles.ratingRow}>
                <Star size={12} color="#EAB308" fill="#EAB308" />
                <Text style={styles.ratingVal}>{selectedBank.rating?.toFixed(1) || "5.0"}</Text>
                <Text style={styles.ratingCount}>({selectedBank.ratingCount || 15} ulasan)</Text>
              </View>
            </View>
            <View
              style={[
                styles.statusPill,
                { backgroundColor: opStatus.isOpen ? "#ECFDF5" : "#FEF2F2" },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: opStatus.isOpen ? "#10B981" : "#EF4444" },
                ]}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: opStatus.isOpen ? "#059669" : "#DC2626" },
                ]}
              >
                {opStatus.isOpen ? "Buka" : "Tutup"}
              </Text>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Info Details */}
          <View style={styles.detailRow}>
            <MapPin size={15} color="#64748B" style={styles.detailIcon} />
            <Text style={styles.detailText}>{selectedBank.address}</Text>
          </View>

          <View style={styles.detailRow}>
            <Clock size={15} color="#059669" style={styles.detailIcon} />
            <Text style={[styles.detailText, { color: "#059669", fontWeight: "600" }]}>
              {opStatus.hoursText}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Phone size={15} color="#64748B" style={styles.detailIcon} />
            <Text style={styles.detailText}>{selectedBank.phone || "Hubungi via aplikasi"}</Text>
          </View>

          {selectedBank.acceptsPickup ? (
            <View style={styles.pickupAlert}>
              <Truck size={15} color="#059669" />
              <Text style={styles.pickupAlertText}>
                Tersedia layanan penjemputan (Pickup) dari lokasi Anda oleh mitra driver GEOVERSE.
              </Text>
            </View>
          ) : (
            <View style={[styles.pickupAlert, { backgroundColor: "#F8FAFC", borderColor: "#E2E8F0" }]}>
              <AlertCircle size={15} color="#94A3B8" />
              <Text style={[styles.pickupAlertText, { color: "#64748B" }]}>
                Layanan penjemputan driver sedang nonaktif. Bank Sampah ini melayani setoran langsung di lokasi.
              </Text>
            </View>
          )}
        </View>

        {/* Section: Price Catalog */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Katalog Harga Sampah</Text>
            <Text style={styles.sectionSubtitle}>Dikonversi 1 Point = Rp 1 dari timbangan resmi mitra</Text>
          </View>
          <View style={styles.priceTagMini}>
            <Text style={styles.priceTagMiniText}>{prices.length} Kategori</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color="#059669" style={{ marginVertical: 24 }} />
        ) : prices.length === 0 ? (
          <View style={styles.emptyPriceCard}>
            <Package size={28} color="#94A3B8" />
            <Text style={styles.emptyPriceText}>Daftar harga kategori belum dimuat</Text>
          </View>
        ) : (
          <View style={[styles.priceGrid, isWide && styles.priceGridWide]}>
            {prices.map((item) => (
              <View key={item._id} style={[styles.priceCard, isWide && styles.priceCardWide]}>
                <View style={styles.priceCardLeft}>
                  <View style={styles.categoryIconCircle}>
                    <Layers size={16} color="#059669" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.categoryName}>{item.category}</Text>
                    <Text style={styles.subCategoryName}>
                      {item.subCategory || "Semua jenis"} • Min {item.minWeightKg} kg
                    </Text>
                  </View>
                </View>
                <View style={styles.priceCardRight}>
                  <Text style={styles.pricePerKg}>{rp(item.pricePerKg)}</Text>
                  <Text style={styles.pointReward}>≈ {formatNumberSafe(item.pricePerKg)} Pts/kg</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Disclaimer Card */}
        <View style={styles.disclaimerBox}>
          <CheckCircle2 size={15} color="#059669" style={{ marginTop: 2 }} />
          <Text style={styles.disclaimerText}>
            Estimasi pada aplikasi adalah acuan sementara. Saldo Poin GEOVERSE final akan diterbitkan sesuai dengan hasil timbang akurat oleh petugas Bank Sampah.
          </Text>
        </View>
      </ScrollView>

      {/* Sticky Bottom Actions */}
      <View style={styles.bottomBarWrapper}>
        <View style={[styles.bottomBar, isWide && styles.bottomBarWide]}>
          {!opStatus.isOpen ? (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: "#94A3B8", flex: 1 }]}
              onPress={() => {
                Alert.alert(
                  "Bank Sampah Sedang Tutup",
                  `Bank Sampah ${selectedBank.name} sedang tutup saat ini (${opStatus.reason || `Jam buka: ${opStatus.hoursText}`}). Layanan hanya dapat diakses saat buka.`
                );
              }}
              activeOpacity={0.8}
            >
              <Clock size={16} color="#FFFFFF" />
              <Text style={[styles.btnPickupText, { color: "#FFFFFF" }]}>
                Sedang Tutup (Jam Buka: {opStatus.hoursText})
              </Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, styles.btnDropOff, !selectedBank.acceptsPickup && { flex: 1.2 }]}
                onPress={() => handleStartDeposit("DROP_OFF")}
                activeOpacity={0.8}
              >
                <Package size={16} color="#059669" />
                <Text style={styles.btnDropOffText}>Setor Mandiri</Text>
              </TouchableOpacity>

              {selectedBank.acceptsPickup ? (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.btnPickup]}
                  onPress={() => handleStartDeposit("PICKUP")}
                  activeOpacity={0.8}
                >
                  <Truck size={16} color="#FFFFFF" />
                  <Text style={styles.btnPickupText}>Jemput Driver</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.actionBtn, styles.btnPickupDisabled]}
                  onPress={() => {
                    Alert.alert(
                      "Layanan Pickup Nonaktif",
                      `${selectedBank.name} saat ini hanya melayani setoran mandiri di lokasi.`
                    );
                  }}
                  activeOpacity={0.7}
                >
                  <Truck size={16} color="#94A3B8" />
                  <Text style={styles.btnPickupDisabledText}>Pickup Nonaktif</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
    </ResponsiveSafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  headerWrapper: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: 960,
    width: "100%",
    alignSelf: "center",
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  headerSub: {
    fontSize: 10,
    color: "#059669",
    fontWeight: "600",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
    maxWidth: 960,
    width: "100%",
    alignSelf: "center",
  },
  scrollContentWide: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  closedBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderColor: "#FCA5A5",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  closedBannerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#B91C1C",
  },
  closedBannerSub: {
    fontSize: 11,
    color: "#991B1B",
    marginTop: 2,
  },
  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  profileIconRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  bankAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  profileMeta: {
    flex: 1,
  },
  bankName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
    gap: 4,
  },
  ratingVal: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  ratingCount: {
    fontSize: 11,
    color: "#64748B",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
  },
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 12,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  detailIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  detailText: {
    flex: 1,
    fontSize: 12,
    color: "#475569",
    lineHeight: 17,
  },
  pickupAlert: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    borderRadius: 10,
    padding: 10,
    marginTop: 6,
  },
  pickupAlertText: {
    flex: 1,
    fontSize: 11,
    color: "#065F46",
    fontWeight: "500",
    lineHeight: 15,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  sectionSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  priceTagMini: {
    backgroundColor: "#F1F5F9",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  priceTagMiniText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#475569",
  },
  priceGrid: {
    width: "100%",
  },
  priceGridWide: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  priceCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  priceCardWide: {
    width: "48.9%",
    marginBottom: 0,
  },
  priceCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  categoryIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#ECFDF5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
  subCategoryName: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
  },
  priceCardRight: {
    alignItems: "flex-end",
  },
  pricePerKg: {
    fontSize: 13,
    fontWeight: "700",
    color: "#059669",
  },
  pointReward: {
    fontSize: 10,
    fontWeight: "600",
    color: "#D97706",
    marginTop: 1,
  },
  emptyPriceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyPriceText: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 6,
  },
  disclaimerBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    gap: 8,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 10,
    color: "#64748B",
    lineHeight: 15,
  },
  bottomBarWrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  bottomBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 20,
    gap: 8,
    maxWidth: 960,
    width: "100%",
    alignSelf: "center",
  },
  bottomBarWide: {
    paddingHorizontal: 24,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  btnDropOff: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  btnDropOffText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1E293B",
  },
  btnPickup: {
    backgroundColor: "#059669",
  },
  btnPickupText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  btnPickupDisabled: {
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  btnPickupDisabledText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94A3B8",
  },
  errorBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 14,
    color: "#EF4444",
    marginTop: 10,
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: "#059669",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  backButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
});

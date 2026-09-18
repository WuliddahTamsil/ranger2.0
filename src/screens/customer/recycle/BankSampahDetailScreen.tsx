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
} from "lucide-react-native";
import { Nav } from "../../../types";
import { useRecycle } from "../../../context/RecycleContext";
import { getWasteBankById, getWasteBankPrices } from "../../../services/recycleService";
import { WasteCategoryPriceUI } from "../../../types/recycleTypes";
import { rp } from "../../../utils/formatters";

export const BankSampahDetailScreen: React.FC<Nav> = ({ navigate }) => {
  const { selectedBank, updateDraftDeposit, resetDraftDeposit } = useRecycle();
  const [prices, setPrices] = useState<WasteCategoryPriceUI[]>([]);
  const [loading, setLoading] = useState(true);

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
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigate("c_recycle_banks")} activeOpacity={0.7}>
          <ArrowLeft size={20} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Detail Bank Sampah</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={handleCall} activeOpacity={0.7}>
          <Phone size={18} color="#15803D" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.profileIconRow}>
            <View style={styles.bankAvatar}>
              <Building2 size={32} color="#15803D" />
            </View>
            <View style={styles.profileMeta}>
              <Text style={styles.bankName}>{selectedBank.name}</Text>
              <View style={styles.ratingRow}>
                <Star size={14} color="#EAB308" fill="#EAB308" />
                <Text style={styles.ratingVal}>{selectedBank.rating?.toFixed(1) || "5.0"}</Text>
                <Text style={styles.ratingCount}>({selectedBank.ratingCount || 15} ulasan)</Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Info details */}
          <View style={styles.detailRow}>
            <MapPin size={16} color="#6B7280" style={styles.detailIcon} />
            <Text style={styles.detailText}>{selectedBank.address}</Text>
          </View>

          <View style={styles.detailRow}>
            <Clock size={16} color="#6B7280" style={styles.detailIcon} />
            <Text style={styles.detailText}>{selectedBank.openingHours}</Text>
          </View>

          <View style={styles.detailRow}>
            <Phone size={16} color="#6B7280" style={styles.detailIcon} />
            <Text style={styles.detailText}>{selectedBank.phone}</Text>
          </View>

          {selectedBank.acceptsPickup && (
            <View style={styles.pickupAlert}>
              <Truck size={16} color="#047857" />
              <Text style={styles.pickupAlertText}>
                Tersedia layanan penjemputan (Pickup) dari rumah oleh driver GEOVERSE.
              </Text>
            </View>
          )}
        </View>

        {/* Section: Price Catalog */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Katalog Harga Sampah</Text>
            <Text style={styles.sectionSubtitle}>Dikonversi 1 Point = Rp 1 dari timbangan resmi</Text>
          </View>
          <View style={styles.priceTagMini}>
            <Text style={styles.priceTagMiniText}>{prices.length} Kategori</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="small" color="#15803D" style={{ marginVertical: 20 }} />
        ) : prices.length === 0 ? (
          <View style={styles.emptyPriceCard}>
            <Package size={28} color="#9CA3AF" />
            <Text style={styles.emptyPriceText}>Daftar harga kategori belum dimuat</Text>
          </View>
        ) : (
          prices.map((item) => (
            <View key={item._id} style={styles.priceCard}>
              <View style={styles.priceCardLeft}>
                <View style={styles.categoryIconCircle}>
                  <Layers size={18} color="#15803D" />
                </View>
                <View>
                  <Text style={styles.categoryName}>{item.category}</Text>
                  <Text style={styles.subCategoryName}>
                    {item.subCategory || "Semua jenis"} • Min {item.minWeightKg} kg
                  </Text>
                </View>
              </View>
              <View style={styles.priceCardRight}>
                <Text style={styles.pricePerKg}>{rp(item.pricePerKg)}</Text>
                <Text style={styles.pointReward}>≈ {item.pricePerKg.toLocaleString("id-ID")} Pts/kg</Text>
              </View>
            </View>
          ))
        )}

        {/* Disclaimer Card */}
        <View style={styles.disclaimerBox}>
          <CheckCircle2 size={16} color="#15803D" style={{ marginTop: 2 }} />
          <Text style={styles.disclaimerText}>
            Estimasi berat pada aplikasi adalah acuan sementara. Poin GEOVERSE final akan diterbitkan sesuai dengan hasil timbang akurat oleh petugas Bank Sampah.
          </Text>
        </View>
      </ScrollView>

      {/* Sticky Bottom Actions */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.btnDropOff]}
          onPress={() => handleStartDeposit("DROP_OFF")}
          activeOpacity={0.8}
        >
          <Package size={18} color="#15803D" />
          <Text style={styles.btnDropOffText}>Setor Langsung</Text>
        </TouchableOpacity>

        {selectedBank.acceptsPickup && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.btnPickup]}
            onPress={() => handleStartDeposit("PICKUP")}
            activeOpacity={0.8}
          >
            <Truck size={18} color="#FFFFFF" />
            <Text style={styles.btnPickupText}>Minta Pickup</Text>
          </TouchableOpacity>
        )}
      </View>
    </ResponsiveSafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    maxWidth: "70%",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  profileCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  profileIconRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  bankAvatar: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  profileMeta: {
    flex: 1,
  },
  bankName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 4,
  },
  ratingVal: {
    fontSize: 12,
    fontWeight: "700",
    color: "#111827",
  },
  ratingCount: {
    fontSize: 11,
    color: "#6B7280",
  },
  divider: {
    height: 1,
    backgroundColor: "#F3F4F6",
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
    color: "#4B5563",
    lineHeight: 18,
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
    fontWeight: "600",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#111827",
  },
  sectionSubtitle: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  priceTagMini: {
    backgroundColor: "#E5E7EB",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  priceTagMiniText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4B5563",
  },
  priceCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  priceCardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  categoryIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  categoryName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#111827",
  },
  subCategoryName: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  priceCardRight: {
    alignItems: "flex-end",
  },
  pricePerKg: {
    fontSize: 14,
    fontWeight: "800",
    color: "#15803D",
  },
  pointReward: {
    fontSize: 11,
    fontWeight: "600",
    color: "#CA8A04",
    marginTop: 2,
  },
  emptyPriceCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  emptyPriceText: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 6,
  },
  disclaimerBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#DCFCE7",
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    gap: 8,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 11,
    color: "#166534",
    lineHeight: 16,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  btnDropOff: {
    backgroundColor: "#DCFCE7",
    borderWidth: 1,
    borderColor: "#86EFAC",
  },
  btnDropOffText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#15803D",
  },
  btnPickup: {
    backgroundColor: "#15803D",
  },
  btnPickupText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
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
    backgroundColor: "#15803D",
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

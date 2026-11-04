/**
 * GeoDirectDetailScreen.tsx
 * Detail Screen for Selected Equipment
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  StatusBar,
  Platform,
} from "react-native";
import {
  ArrowLeft,
  Flame,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Layers,
  Wrench,
  Cpu,
  FileText,
  AlertCircle,
  ChevronRight,
  Info,
} from "lucide-react-native";
import { Nav } from "../../../types";
import { fetchEquipmentDetail, GeoDirectEquipment } from "../../../services/geoDirectService";
import { rp } from "../../../utils/formatters";

interface GeoDirectDetailScreenProps extends Nav {
  routeParams?: {
    equipmentId?: string;
  };
}

export const GeoDirectDetailScreen: React.FC<GeoDirectDetailScreenProps> = ({
  navigate,
  routeParams,
}) => {
  const equipmentId = routeParams?.equipmentId;
  const [equipment, setEquipment] = useState<GeoDirectEquipment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!equipmentId) return;
    (async () => {
      try {
        setLoading(true);
        const data = await fetchEquipmentDetail(equipmentId);
        setEquipment(data);
      } catch (err) {
        console.warn("Failed to fetch equipment detail:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [equipmentId]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0D7A53" />
        <Text style={styles.loadingText}>Memuat spesifikasi alat...</Text>
      </View>
    );
  }

  if (!equipment) {
    return (
      <View style={styles.centerContainer}>
        <AlertCircle size={40} color="#DC2626" />
        <Text style={styles.notFoundText}>Alat tidak ditemukan</Text>
        <TouchableOpacity style={styles.backHomeBtn} onPress={() => navigate("c_geo_direct")}>
          <Text style={styles.backHomeText}>Kembali ke Katalog</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const hasConfiguredPrice = equipment.basePrice > 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigate("c_geo_direct")} style={styles.backBtn} activeOpacity={0.75}>
          <ArrowLeft size={20} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.topBarTitleBox}>
          <Text style={styles.topBarTitle}>{equipment.name}</Text>
          <Text style={styles.topBarSubtitle}>Kode: {equipment.code}</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner}>
        {/* Equipment Hero Card */}
        <View style={styles.photoContainer}>
          {equipment.imageUrl ? (
            <Image source={{ uri: equipment.imageUrl }} style={styles.photo} resizeMode="cover" />
          ) : (
            <View style={styles.placeholderPhoto}>
              <Flame size={48} color="#0D7A53" />
              <Text style={styles.placeholderPhotoText}>PGE Kamojang Direct Use</Text>
            </View>
          )}

          <View style={styles.badgeCodeFloating}>
            <Text style={styles.badgeCodeFloatingText}>{equipment.code}</Text>
          </View>
        </View>

        {/* Title & Availability */}
        <View style={styles.mainInfoCard}>
          <View style={styles.titleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.equipmentTitle}>{equipment.name}</Text>
              <Text style={styles.facilitySubtitle}>PGE Center of Excellence • Area Kamojang</Text>
            </View>
            <View
              style={[
                styles.availBadge,
                equipment.isAvailable ? styles.availBadgeActive : styles.availBadgeInactive,
              ]}
            >
              <Text
                style={[
                  styles.availBadgeText,
                  { color: equipment.isAvailable ? "#15803D" : "#991B1B" },
                ]}
              >
                {equipment.isAvailable ? "Tersedia" : "Tidak Tersedia"}
              </Text>
            </View>
          </View>

          {/* Pricing Highlight Box */}
          <View style={styles.priceBox}>
            <View>
              <Text style={styles.priceBoxLabel}>Biaya Sewa Pokok</Text>
              {hasConfiguredPrice ? (
                <View style={styles.priceRow}>
                  <Text style={styles.priceVal}>{rp(equipment.basePrice)}</Text>
                  <Text style={styles.priceUnit}>/{equipment.pricingUnit.replace("per_", "")}</Text>
                </View>
              ) : (
                <View style={styles.waitingPricePill}>
                  <Info size={13} color="#D97706" />
                  <Text style={styles.waitingPriceText}>Menunggu konfigurasi PGE</Text>
                </View>
              )}
            </View>
            <View style={styles.dpPercentBox}>
              <Text style={styles.dpPercentLabel}>Ketentuan DP</Text>
              <Text style={styles.dpPercentVal}>{equipment.dpPercentage}%</Text>
            </View>
          </View>
        </View>

        {/* Section: Deskripsi */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <FileText size={16} color="#0D7A53" />
            <Text style={styles.sectionTitle}>Deskripsi Alat</Text>
          </View>
          <Text style={styles.sectionContentText}>{equipment.description}</Text>
        </View>

        {/* Section: Spesifikasi Teknis */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <Cpu size={16} color="#0D7A53" />
            <Text style={styles.sectionTitle}>Spesifikasi Teknis</Text>
          </View>
          <Text style={styles.sectionContentText}>{equipment.specification}</Text>
        </View>

        {/* Section: Fungsi / Kegunaan */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <Wrench size={16} color="#0D7A53" />
            <Text style={styles.sectionTitle}>Fungsi & Kegunaan</Text>
          </View>
          <Text style={styles.sectionContentText}>{equipment.function}</Text>
        </View>

        {/* Section: Kapasitas Alat */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <Layers size={16} color="#0D7A53" />
            <Text style={styles.sectionTitle}>Kapasitas Operasional</Text>
          </View>
          <Text style={styles.sectionContentText}>{equipment.capacity}</Text>
        </View>

        {/* Section: Ketentuan Sewa */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <ShieldCheck size={16} color="#0D7A53" />
            <Text style={styles.sectionTitle}>Ketentuan & SOP Penyewaan</Text>
          </View>
          <Text style={styles.sectionContentText}>{equipment.rentalTerms}</Text>
        </View>

        {/* Production Parameters Preview (If Configured) */}
        {equipment.productionParameters && equipment.productionParameters.length > 0 && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionTitleRow}>
              <Clock size={16} color="#0D7A53" />
              <Text style={styles.sectionTitle}>Parameter Kebutuhan Produksi</Text>
            </View>
            <Text style={styles.paramNotice}>
              Formulir penyewaan akan menyesuaikan parameter berikut saat Anda mengajukan sewa:
            </Text>
            {equipment.productionParameters.map((param, idx) => (
              <View key={param._id || idx} style={styles.paramItem}>
                <Text style={styles.paramLabelText}>• {param.paramLabel}</Text>
                <Text style={styles.paramTypeText}>({param.paramType})</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Floating Bottom Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomBarLeft}>
          <Text style={styles.bottomBarLabel}>Estimasi DP</Text>
          <Text style={styles.bottomBarPrice}>
            {hasConfiguredPrice ? `${equipment.dpPercentage}% Biaya Pokok` : "Sesuai Konfigurasi PGE"}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.btnApply, !equipment.isAvailable && styles.btnDisabled]}
          onPress={() => {
            if (equipment.isAvailable) {
              navigate("c_geo_direct_booking", { equipmentId: equipment._id });
            }
          }}
          disabled={!equipment.isAvailable}
          activeOpacity={0.8}
        >
          <Text style={styles.btnApplyText}>Ajukan Penyewaan</Text>
          <ChevronRight size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748B",
  },
  notFoundText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  backHomeBtn: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#0D7A53",
    borderRadius: 8,
  },
  backHomeText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 52 : 14,
    paddingBottom: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  topBarTitleBox: {
    flex: 1,
    marginLeft: 12,
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  topBarSubtitle: {
    fontSize: 11,
    color: "#64748B",
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    padding: 16,
    paddingBottom: 100,
  },
  photoContainer: {
    width: "100%",
    height: 200,
    borderRadius: 14,
    backgroundColor: "#EAF8F0",
    overflow: "hidden",
    position: "relative",
    marginBottom: 16,
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  placeholderPhoto: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderPhotoText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "700",
    color: "#0D7A53",
  },
  badgeCodeFloating: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeCodeFloatingText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  mainInfoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  equipmentTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  facilitySubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  availBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  availBadgeActive: {
    backgroundColor: "#DCFCE7",
  },
  availBadgeInactive: {
    backgroundColor: "#FEE2E2",
  },
  availBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  priceBox: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  priceBoxLabel: {
    fontSize: 11,
    color: "#64748B",
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
    marginTop: 2,
  },
  priceVal: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0D7A53",
  },
  priceUnit: {
    fontSize: 12,
    color: "#64748B",
  },
  waitingPricePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  waitingPriceText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#D97706",
  },
  dpPercentBox: {
    alignItems: "flex-end",
  },
  dpPercentLabel: {
    fontSize: 11,
    color: "#64748B",
  },
  dpPercentVal: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 2,
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  sectionContentText: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 20,
  },
  paramNotice: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 8,
  },
  paramItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 2,
  },
  paramLabelText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#334155",
  },
  paramTypeText: {
    fontSize: 11,
    color: "#64748B",
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 34 : 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bottomBarLeft: {
    flex: 1,
  },
  bottomBarLabel: {
    fontSize: 11,
    color: "#64748B",
  },
  bottomBarPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0D7A53",
    marginTop: 1,
  },
  btnApply: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0D7A53",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
  },
  btnApplyText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  btnDisabled: {
    backgroundColor: "#94A3B8",
  },
});


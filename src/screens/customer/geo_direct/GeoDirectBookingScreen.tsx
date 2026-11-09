/**
 * GeoDirectBookingScreen.tsx
 * Dynamic Form & Live Pricing Engine for Geo Direct Use
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  StatusBar,
  Platform,
  Switch,
} from "react-native";
import {
  ArrowLeft,
  Calendar,
  Building,
  User,
  Phone,
  Mail,
  MapPin,
  Flame,
  Clock,
  Coins,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileText,
  ChevronRight,
  Info,
} from "lucide-react-native";
import { Nav } from "../../../types";
import {
  fetchEquipmentDetail,
  calculateRentalPrice,
  createBooking,
  fetchCustomerDpBalance,
  GeoDirectEquipment,
  GeoDirectPricingCalculation,
} from "../../../services/geoDirectService";
import { rp } from "../../../utils/formatters";

interface GeoDirectBookingScreenProps extends Nav {
  authAccount?: any;
  routeParams?: {
    equipmentId?: string;
  };
}

export const GeoDirectBookingScreen: React.FC<GeoDirectBookingScreenProps> = ({
  navigate,
  authAccount,
  routeParams,
}) => {
  const equipmentId = routeParams?.equipmentId;

  // Equipment & State
  const [equipment, setEquipment] = useState<GeoDirectEquipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Customer Profile Form
  const [custName, setCustName] = useState(authAccount?.name || "");
  const [custPhone, setCustPhone] = useState(authAccount?.phone || authAccount?.phoneNumber || "");
  const [custEmail, setCustEmail] = useState(authAccount?.email || "");
  const [custCompany, setCustCompany] = useState(authAccount?.company || "");
  const [custAddress, setCustAddress] = useState(authAccount?.address || "");

  // Rental Info
  const [startDateStr, setStartDateStr] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [durationDays, setDurationDays] = useState("3");
  const [usagePurpose, setUsagePurpose] = useState("");
  const [usageLocation, setUsageLocation] = useState("PGE Kamojang Center of Excellence");
  const [notes, setNotes] = useState("");

  // Dynamic Production Parameters
  const [productType, setProductType] = useState("Teh");
  const [rawMaterialTons, setRawMaterialTons] = useState("2");
  const [processDetails, setProcessDetails] = useState("");
  const [customParamAnswers, setCustomParamAnswers] = useState<Record<string, any>>({});

  // DP Credit Balance
  const [customerDpBalance, setCustomerDpBalance] = useState(0);
  const [applyDpCredit, setApplyDpCredit] = useState(true);

  // Pricing Calculation State
  const [pricingCalc, setPricingCalc] = useState<GeoDirectPricingCalculation | null>(null);
  const [calcLoading, setCalcLoading] = useState(false);

  // Calculate End Date
  const endDateStr = useMemo(() => {
    try {
      const start = new Date(startDateStr);
      const days = Math.max(1, parseInt(durationDays, 10) || 1);
      const end = new Date(start.getTime() + days * 24 * 60 * 60 * 1000);
      return end.toISOString().slice(0, 10);
    } catch {
      return startDateStr;
    }
  }, [startDateStr, durationDays]);

  const effectiveDpDue = useMemo(() => {
    if (!pricingCalc) return 0;
    if (!applyDpCredit || customerDpBalance <= 0) return pricingCalc.requiredDpAmount;
    const credit = Math.min(customerDpBalance, pricingCalc.requiredDpAmount);
    return Math.max(0, pricingCalc.requiredDpAmount - credit);
  }, [pricingCalc, applyDpCredit, customerDpBalance]);

  // Load Equipment & DP Balance
  useEffect(() => {
    if (!equipmentId) return;
    (async () => {
      try {
        setLoading(true);
        const [equipData, balData] = await Promise.all([
          fetchEquipmentDetail(equipmentId),
          authAccount ? fetchCustomerDpBalance().catch(() => ({ balance: 0, history: [] })) : Promise.resolve({ balance: 0, history: [] }),
        ]);
        setEquipment(equipData);
        setCustomerDpBalance(balData.balance || 0);

        // Pre-fill parameters if select options exist
        if (equipData.productionParameters && equipData.productionParameters.length > 0) {
          const firstSelect = equipData.productionParameters.find((p) => p.paramType === "select");
          if (firstSelect?.options && firstSelect.options.length > 0) {
            setProductType(firstSelect.options[0]);
          }
        }
      } catch (err) {
        console.warn("Failed to load booking form data:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [equipmentId, authAccount]);

  // Trigger Live Pricing Calculation
  useEffect(() => {
    if (!equipment) return;
    const dur = Math.max(1, parseInt(durationDays, 10) || 1);
    const tons = Math.max(0, parseFloat(rawMaterialTons) || 0);

    const timer = setTimeout(async () => {
      try {
        setCalcLoading(true);
        const res = await calculateRentalPrice({
          equipmentId: equipment._id,
          durationDays: dur,
          productionNeeds: {
            productType,
            rawMaterialTons: tons,
            ...customParamAnswers,
          },
        });
        setPricingCalc(res.calculation);
      } catch (err) {
        console.warn("Failed to calculate price:", err);
      } finally {
        setCalcLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [equipment, durationDays, rawMaterialTons, productType, customParamAnswers]);

  const handleSubmit = async () => {
    if (!custName.trim() || !custPhone.trim()) {
      Alert.alert("Identitas Belum Lengkap", "Nama dan Nomor Telepon pemohon wajib diisi.");
      return;
    }

    if (!usagePurpose.trim() || !usageLocation.trim()) {
      Alert.alert("Informasi Belum Lengkap", "Tujuan dan lokasi penggunaan alat wajib diisi.");
      return;
    }

    if (!equipment) return;

    try {
      setSubmitting(true);
      const booking = await createBooking({
        equipmentId: equipment._id,
        customerSnapshot: {
          name: custName.trim(),
          phone: custPhone.trim(),
          email: custEmail.trim(),
          company: custCompany.trim(),
          address: custAddress.trim(),
        },
        rentalSchedule: {
          startDate: new Date(startDateStr).toISOString(),
          endDate: new Date(endDateStr).toISOString(),
        },
        usagePurpose: usagePurpose.trim(),
        usageLocation: usageLocation.trim(),
        notes: notes.trim(),
        productionNeeds: {
          productType,
          rawMaterialTons: parseFloat(rawMaterialTons) || 0,
          processRequirements: processDetails.trim(),
          customParameters: customParamAnswers,
        },
        applyDpCredit,
      });

      Alert.alert(
        "Booking Berhasil!",
        `Pengajuan sewa dengan kode ${booking.bookingCode} berhasil dibuat. Silakan selesaikan pembayaran DP.`,
        [
          {
            text: "Lanjut ke Pembayaran",
            onPress: () => navigate("c_geo_direct_payment", { bookingId: booking._id }),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert("Gagal Mengajukan Booking", err.message || "Terjadi kesalahan saat memproses booking.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0D7A53" />
        <Text style={styles.loadingText}>Menyiapkan formulir sewa...</Text>
      </View>
    );
  }

  if (!equipment) {
    return (
      <View style={styles.centerContainer}>
        <AlertCircle size={40} color="#DC2626" />
        <Text style={styles.notFoundText}>Alat tidak ditemukan</Text>
        <TouchableOpacity style={styles.backBtnSolid} onPress={() => navigate("c_geo_direct")}>
          <Text style={styles.backBtnSolidText}>Kembali ke Katalog</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => navigate("c_geo_direct_detail", { equipmentId: equipment._id })}
          style={styles.backBtn}
          activeOpacity={0.75}
        >
          <ArrowLeft size={20} color="#0F172A" />
        </TouchableOpacity>
        <View style={styles.topBarTitleBox}>
          <Text style={styles.topBarTitle}>Formulir Sewa Alat</Text>
          <Text style={styles.topBarSubtitle}>{equipment.name} ({equipment.code})</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollInner}>
        {/* Step Indicator */}
        <View style={styles.stepIndicator}>
          <View style={styles.stepItemActive}>
            <Text style={styles.stepNumberActive}>1</Text>
            <Text style={styles.stepLabelActive}>Formulir & Biaya</Text>
          </View>
          <View style={styles.stepDivider} />
          <View style={styles.stepItemInactive}>
            <Text style={styles.stepNumberInactive}>2</Text>
            <Text style={styles.stepLabelInactive}>Pembayaran DP</Text>
          </View>
          <View style={styles.stepDivider} />
          <View style={styles.stepItemInactive}>
            <Text style={styles.stepNumberInactive}>3</Text>
            <Text style={styles.stepLabelInactive}>Nota Resmi</Text>
          </View>
        </View>

        {/* SECTION A: Identitas Pemohon */}
        <View style={styles.cardSection}>
          <View style={styles.sectionHeader}>
            <User size={16} color="#0D7A53" />
            <Text style={styles.sectionTitle}>A. Identitas Customer</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nama Lengkap *</Text>
            <TextInput
              style={styles.inputField}
              value={custName}
              onChangeText={setCustName}
              placeholder="Masukkan nama pemohon"
              placeholderTextColor="#94A3B8"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nomor Telepon / WhatsApp *</Text>
            <TextInput
              style={styles.inputField}
              value={custPhone}
              onChangeText={setCustPhone}
              placeholder="Contoh: 081234567890"
              placeholderTextColor="#94A3B8"
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.inputField}
              value={custEmail}
              onChangeText={setCustEmail}
              placeholder="Contoh: customer@email.com"
              placeholderTextColor="#94A3B8"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Instansi / Perusahaan</Text>
            <TextInput
              style={styles.inputField}
              value={custCompany}
              onChangeText={setCustCompany}
              placeholder="Nama instansi atau UMKM Anda"
              placeholderTextColor="#94A3B8"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Alamat Lengkap</Text>
            <TextInput
              style={[styles.inputField, styles.textArea]}
              value={custAddress}
              onChangeText={setCustAddress}
              placeholder="Alamat domisili atau operasional"
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={2}
            />
          </View>
        </View>

        {/* SECTION B: Informasi Penyewaan */}
        <View style={styles.cardSection}>
          <View style={styles.sectionHeader}>
            <Calendar size={16} color="#0D7A53" />
            <Text style={styles.sectionTitle}>B. Rincian Jadwal & Penggunaan</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Tanggal Mulai Sewa (YYYY-MM-DD) *</Text>
            <TextInput
              style={styles.inputField}
              value={startDateStr}
              onChangeText={setStartDateStr}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#94A3B8"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Durasi Sewa (Hari) *</Text>
            <TextInput
              style={styles.inputField}
              value={durationDays}
              onChangeText={setDurationDays}
              placeholder="Contoh: 3"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
            />
            <Text style={styles.inputHelper}>
              Tanggal selesai otomatis: <Text style={{ fontWeight: "700" }}>{endDateStr}</Text> ({durationDays || 0} Hari)
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Tujuan Penggunaan Alat *</Text>
            <TextInput
              style={styles.inputField}
              value={usagePurpose}
              onChangeText={setUsagePurpose}
              placeholder="Contoh: Pengeringan daun teh hasil panen"
              placeholderTextColor="#94A3B8"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Lokasi Operasional / Penggunaan *</Text>
            <TextInput
              style={styles.inputField}
              value={usageLocation}
              onChangeText={setUsageLocation}
              placeholder="Contoh: PGE Center of Excellence Kamojang"
              placeholderTextColor="#94A3B8"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Catatan Tambahan (Opsional)</Text>
            <TextInput
              style={[styles.inputField, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Catatan teknis khusus jika ada"
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={2}
            />
          </View>
        </View>

        {/* SECTION C: Kebutuhan Produksi (Dynamic Parameters) */}
        <View style={styles.cardSection}>
          <View style={styles.sectionHeader}>
            <Flame size={16} color="#0D7A53" />
            <Text style={styles.sectionTitle}>C. Kebutuhan Produksi & Komoditas</Text>
          </View>

          {/* Commodity Type */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Jenis Produk / Bahan Baku</Text>
            <TextInput
              style={styles.inputField}
              value={productType}
              onChangeText={setProductType}
              placeholder="Contoh: Teh, Kopi, Jamur, Essential Oil"
              placeholderTextColor="#94A3B8"
            />
          </View>

          {/* Volume Tonnage */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Kapasitas Bahan Baku (Ton)</Text>
            <TextInput
              style={styles.inputField}
              value={rawMaterialTons}
              onChangeText={setRawMaterialTons}
              placeholder="Contoh: 2"
              placeholderTextColor="#94A3B8"
              keyboardType="numeric"
            />
          </View>

          {/* Process details */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Kebutuhan Proses Produksi</Text>
            <TextInput
              style={[styles.inputField, styles.textArea]}
              value={processDetails}
              onChangeText={setProcessDetails}
              placeholder="Deskripsi spesifik perlakuan panas / pengeringan yang diinginkan"
              placeholderTextColor="#94A3B8"
              multiline
              numberOfLines={2}
            />
          </View>
        </View>

        {/* SECTION D: DP Credit Application (If Customer has DP balance from rejected booking) */}
        {customerDpBalance > 0 && (
          <View style={styles.dpCreditCard}>
            <View style={styles.dpCreditHeader}>
              <View style={styles.dpCreditIcon}>
                <Coins size={18} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.dpCreditTitle}>Deposit Saldo DP Tersedia</Text>
                <Text style={styles.dpCreditVal}>{rp(customerDpBalance)}</Text>
              </View>
              <Switch
                value={applyDpCredit}
                onValueChange={setApplyDpCredit}
                trackColor={{ false: "#CBD5E1", true: "#86EFAC" }}
                thumbColor={applyDpCredit ? "#0D7A53" : "#F1F5F9"}
              />
            </View>
            <Text style={styles.dpCreditDesc}>
              Saldo dari pengajuan sewa Anda sebelumnya yang ditolak otomatis disimpan sebagai kredit dan dapat langsung
              dipotongkan ke nominal DP pengajuan ini.
            </Text>
          </View>
        )}

        {/* SECTION E: Dynamic Pricing Breakdown Card */}
        <View style={styles.pricingSummaryCard}>
          <View style={styles.pricingSummaryHeader}>
            <Text style={styles.pricingSummaryTitle}>ESTIMASI BIAYA SEWA & DP</Text>
            {calcLoading && <ActivityIndicator size="small" color="#0D7A53" />}
          </View>

          {pricingCalc ? (
            <View style={styles.pricingRows}>
              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>Biaya Sewa Pokok ({durationDays} Hari)</Text>
                <Text style={styles.calcVal}>
                  {pricingCalc.basePrice > 0 ? rp(pricingCalc.subtotalBase) : "Menunggu Konfigurasi PGE"}
                </Text>
              </View>

              {pricingCalc.productionAddonTotal > 0 && (
                <View style={styles.calcRow}>
                  <Text style={styles.calcLabel}>Tambahan Kapasitas Produksi</Text>
                  <Text style={styles.calcVal}>{rp(pricingCalc.productionAddonTotal)}</Text>
                </View>
              )}

              <View style={[styles.calcRow, styles.calcRowTotal]}>
                <Text style={styles.calcLabelTotal}>Total Biaya Sewa</Text>
                <Text style={styles.calcValTotal}>
                  {pricingCalc.basePrice > 0 ? rp(pricingCalc.totalRentalCost) : "Sesuai PGE"}
                </Text>
              </View>

              <View style={styles.dividerDashed} />

              <View style={styles.calcRow}>
                <Text style={styles.calcLabel}>Down Payment ({pricingCalc.dpPercentage}%)</Text>
                <Text style={styles.calcVal}>{rp(pricingCalc.requiredDpAmount)}</Text>
              </View>

              {applyDpCredit && customerDpBalance > 0 && (
                <View style={styles.calcRow}>
                  <Text style={[styles.calcLabel, { color: "#16A34A" }]}>Potongan Saldo DP Kredit</Text>
                  <Text style={[styles.calcVal, { color: "#16A34A" }]}>
                    - {rp(Math.min(customerDpBalance, pricingCalc.requiredDpAmount))}
                  </Text>
                </View>
              )}

              <View style={[styles.calcRow, styles.calcRowHighlight]}>
                <Text style={styles.calcLabelHighlight}>Nominal DP yang Harus Dibayar</Text>
                <Text style={styles.calcValHighlight}>{rp(effectiveDpDue)}</Text>
              </View>

              <View style={styles.calcRow}>
                <Text style={styles.calcLabelSmall}>Sisa Pelunasan (saat serah terima)</Text>
                <Text style={styles.calcValSmall}>{rp(pricingCalc.remainingBalance)}</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.calcPlaceholder}>Memuat perhitungan harga...</Text>
          )}
        </View>

        {/* CTA Button */}
        <TouchableOpacity
          style={[styles.btnSubmit, submitting && styles.btnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.btnSubmitText}>Konfirmasi Booking & Bayar DP</Text>
              <ChevronRight size={18} color="#FFFFFF" />
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
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
  backBtnSolid: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#0D7A53",
    borderRadius: 8,
  },
  backBtnSolidText: {
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
    paddingBottom: 60,
  },
  stepIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  stepItemActive: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stepNumberActive: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#0D7A53",
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 20,
  },
  stepLabelActive: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0D7A53",
  },
  stepItemInactive: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stepNumberInactive: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#E2E8F0",
    color: "#64748B",
    fontSize: 11,
    fontWeight: "700",
    textAlign: "center",
    lineHeight: 20,
  },
  stepLabelInactive: {
    fontSize: 11,
    color: "#64748B",
  },
  stepDivider: {
    width: 14,
    height: 1,
    backgroundColor: "#CBD5E1",
  },
  cardSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 6,
  },
  inputField: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: "#0F172A",
  },
  textArea: {
    height: 60,
    textAlignVertical: "top",
  },
  inputHelper: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 4,
  },
  dpCreditCard: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  dpCreditHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 6,
  },
  dpCreditIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  dpCreditTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "#92400E",
  },
  dpCreditVal: {
    fontSize: 15,
    fontWeight: "800",
    color: "#B45309",
  },
  dpCreditDesc: {
    fontSize: 11,
    color: "#92400E",
    lineHeight: 16,
  },
  pricingSummaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  pricingSummaryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingBottom: 8,
  },
  pricingSummaryTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#0D7A53",
    letterSpacing: 0.5,
  },
  pricingRows: {
    gap: 8,
  },
  calcRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  calcRowTotal: {
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  calcLabel: {
    fontSize: 12,
    color: "#64748B",
  },
  calcVal: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0F172A",
  },
  calcLabelTotal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  calcValTotal: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  dividerDashed: {
    height: 1,
    borderStyle: "dashed",
    borderWidth: 0.5,
    borderColor: "#CBD5E1",
    marginVertical: 4,
  },
  calcRowHighlight: {
    backgroundColor: "#F0FDF4",
    padding: 10,
    borderRadius: 8,
    marginVertical: 4,
  },
  calcLabelHighlight: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0D7A53",
  },
  calcValHighlight: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0D7A53",
  },
  calcLabelSmall: {
    fontSize: 11,
    color: "#94A3B8",
  },
  calcValSmall: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  calcPlaceholder: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    paddingVertical: 12,
  },
  btnSubmit: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0D7A53",
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: "#0D7A53",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  btnSubmitText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  btnDisabled: {
    backgroundColor: "#94A3B8",
  },
});


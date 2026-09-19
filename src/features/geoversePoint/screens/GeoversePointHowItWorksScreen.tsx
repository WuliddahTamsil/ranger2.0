import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Recycle,
  Scale,
  CheckCircle2,
  Sparkles,
  ShoppingBag,
  Banknote,
  ArrowRight,
} from "lucide-react-native";
import { Nav } from "../../../types";

export const GeoversePointHowItWorksScreen: React.FC<Nav> = ({ navigate }) => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const steps = [
    {
      step: "1",
      icon: Recycle,
      color: "#059669",
      bg: "#ECFDF5",
      title: "Kumpulkan Sampah Daur Ulang",
      desc: "Pilahlah sampah bernilai seperti botol plastik, kardus, kaleng, atau minyak jelantah dari rumah tangga Anda.",
    },
    {
      step: "2",
      icon: Scale,
      color: "#D97706",
      bg: "#FEF3C7",
      title: "Timbang di Bank Sampah GEOVERSE",
      desc: "Kunjungi Bank Sampah terdekat atau pilih layanan jemput ke rumah. Petugas akan menimbang secara transparan dan akurat.",
    },
    {
      step: "3",
      icon: CheckCircle2,
      color: "#2563EB",
      bg: "#DBEAFE",
      title: "Konfirmasi Hasil Timbang di Aplikasi",
      desc: "Buka menu notifikasi untuk melihat rincian berat dan nominal poin. Begitu Anda setuju, poin langsung masuk ke dompet Anda.",
    },
    {
      step: "4",
      icon: Sparkles,
      color: "#7C3AED",
      bg: "#F5F3FF",
      title: "Gunakan Poin untuk Berbagai Kebutuhan",
      desc: "Tukarkan poin dengan voucher potongan belanja di Kanyaah Shop, Ride, Send, Catering, Laundry, atau cairkan tunai ke rekening.",
    },
  ];

  const benefits = [
    {
      icon: ShoppingBag,
      title: "Potongan Transaksi Nyata",
      desc: "Gunakan poin saat checkout pesanan harian Anda tanpa minimal sisa saldo.",
    },
    {
      icon: Banknote,
      title: "Bisa Ditarik Tunai (1 Pts = Rp 1)",
      desc: "Poin bukan sekadar angka virtual; dapat dicairkan tunai di Bank Sampah atau transfer.",
    },
    {
      icon: Recycle,
      title: "Pantau Dampak Lingkungan",
      desc: "Setiap gram sampah yang disetor dicatat untuk melacak pengurangan emisi karbon Anda.",
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigate("c_point_home")}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Cara Kerja GEOVERSE Point</Text>
          <Text style={styles.headerSubtitle}>Panduan ekosistem loyalitas lingkungan</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          isDesktop && styles.desktopContainer,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Intro Hero */}
        <View style={styles.heroBox}>
          <Text style={styles.heroBadge}>EKOSISTEM BERKELANJUTAN</Text>
          <Text style={styles.heroTitle}>Ubah Sampah Jadi Berkah & Saldo Nyata</Text>
          <Text style={styles.heroDesc}>
            GEOVERSE Point adalah dompet loyalitas berbasis kontribusi lingkungan. Setiap aksi daur ulang Anda dihargai dengan poin bernilai riil.
          </Text>
        </View>

        {/* 4 Steps */}
        <Text style={styles.sectionHeader}>4 Langkah Mudah Mendapatkan Poin</Text>
        <View style={styles.stepsList}>
          {steps.map((item, idx) => {
            const IconComp = item.icon;
            return (
              <View key={item.step} style={styles.stepCard}>
                <View style={[styles.stepIconWrapper, { backgroundColor: item.bg }]}>
                  <IconComp size={22} color={item.color} />
                  <View style={styles.stepNumberBadge}>
                    <Text style={styles.stepNumberText}>{item.step}</Text>
                  </View>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>{item.title}</Text>
                  <Text style={styles.stepDesc}>{item.desc}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Value Conversion Highlight */}
        <View style={styles.conversionCard}>
          <Text style={styles.convLabel}>KONVERSI RESMI</Text>
          <Text style={styles.convFormula}>1 GEOVERSE Point = Rp 1</Text>
          <Text style={styles.convDesc}>
            Nilai nominal dihitung langsung dan transparan oleh sistem backend resmi GEOVERSE tanpa potongan tersembunyi.
          </Text>
        </View>

        {/* Benefits Grid */}
        <Text style={styles.sectionHeader}>Keuntungan untuk Anda</Text>
        <View style={styles.benefitsList}>
          {benefits.map((b, idx) => {
            const BIcon = b.icon;
            return (
              <View key={idx} style={styles.benefitItem}>
                <View style={styles.benefitIconBg}>
                  <BIcon size={20} color="#15803D" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.benefitTitle}>{b.title}</Text>
                  <Text style={styles.benefitDesc}>{b.desc}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* CTA Button */}
        <TouchableOpacity
          style={styles.startBtn}
          onPress={() => navigate("c_recycle_banks")}
          activeOpacity={0.8}
        >
          <Text style={styles.startBtnText}>Cari Bank Sampah Terdekat</Text>
          <ArrowRight size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  headerSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  desktopContainer: {
    maxWidth: 700,
    width: "100%",
    alignSelf: "center",
  },
  heroBox: {
    backgroundColor: "#15803D",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  heroBadge: {
    fontSize: 10,
    fontWeight: "800",
    color: "#A7F3D0",
    letterSpacing: 1,
    marginBottom: 6,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#FFFFFF",
    lineHeight: 24,
    marginBottom: 8,
  },
  heroDesc: {
    fontSize: 12,
    color: "#DCFCE7",
    lineHeight: 18,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 12,
  },
  stepsList: {
    marginBottom: 20,
    gap: 12,
  },
  stepCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    gap: 12,
  },
  stepIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  stepNumberBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#0F172A",
    justifyContent: "center",
    alignItems: "center",
  },
  stepNumberText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },
  stepDesc: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 17,
  },
  conversionCard: {
    backgroundColor: "#ECFDF5",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#A7F3D0",
    padding: 18,
    alignItems: "center",
    marginBottom: 20,
  },
  convLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "#059669",
    letterSpacing: 1,
  },
  convFormula: {
    fontSize: 20,
    fontWeight: "800",
    color: "#15803D",
    marginVertical: 4,
  },
  convDesc: {
    fontSize: 11,
    color: "#047857",
    textAlign: "center",
    lineHeight: 16,
  },
  benefitsList: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    marginBottom: 24,
    gap: 16,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  benefitIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
  },
  benefitTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 2,
  },
  benefitDesc: {
    fontSize: 11,
    color: "#64748B",
    lineHeight: 16,
  },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#15803D",
    paddingVertical: 14,
    borderRadius: 12,
  },
  startBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});

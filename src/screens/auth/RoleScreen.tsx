import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from "react-native";
import { Nav } from "../../types";
import { User, Bike, Coffee, Store, Wind, Building2, ShieldCheck } from "lucide-react-native";

export const RoleScreen: React.FC<Nav> = ({ navigate }) => {
  const roles = [
    {
      id: "c_home" as const,
      title: "Pelanggan / Customer",
      desc: "Beli produk UMKM, pesanan catering, laundry, dan cari kosan.",
      icon: User,
      color: "#1B7A4E",
      bg: "#E8F5EE",
    },
    {
      id: "d_home" as const,
      title: "Driver Rangers",
      desc: "Terima orderan antar makanan, barang, dan laundry.",
      icon: Bike,
      color: "#EA580C",
      bg: "#FFEDD5",
    },
    {
      id: "pemilik_catering_home" as const,
      title: "Pemilik Catering",
      desc: "Kelola menu paket catering, terima pesanan prasmanan & nasi box.",
      icon: Coffee,
      color: "#D97706",
      bg: "#FEF3C7",
    },
    {
      id: "pemilik_marketplace_home" as const,
      title: "Pemilik Marketplace (UMKM)",
      desc: "Jual produk olahan, kerajinan, fashion, dan kelola stok toko.",
      icon: Store,
      color: "#059669",
      bg: "#D1FAE5",
    },
    {
      id: "pemilik_laundry_home" as const,
      title: "Pemilik Laundry",
      desc: "Terima order cuci kiloan/satuan dan status pengerjaan pakaian.",
      icon: Wind,
      color: "#0284C7",
      bg: "#E0F2FE",
    },
    {
      id: "pemilik_kos_home" as const,
      title: "Pemilik Kos",
      desc: "Kelola ketersediaan kamar kos dan penerimaan penghuni baru.",
      icon: Building2,
      color: "#0D7A53",
      bg: "#E8F5EE",
    },
    {
      id: "admin_home" as const,
      title: "Admin Sistem / PGE",
      desc: "Verifikasi pendaftaran mitra, pantau transaksi & laporan komunal.",
      icon: ShieldCheck,
      color: "#DC2626",
      bg: "#FEE2E2",
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Pilih Peran Anda</Text>
        <Text style={styles.subtitle}>Pilih salah satu dari 7 modul akses pengguna:</Text>

        <View style={styles.cardContainer}>
          {roles.map((r) => {
            const IconComp = r.icon;
            return (
              <TouchableOpacity
                key={r.id}
                style={styles.card}
                onPress={() => navigate(r.id)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconBg, { backgroundColor: r.bg }]}>
                  <IconComp size={28} color={r.color} />
                </View>
                <View style={styles.cardTextCol}>
                  <Text style={styles.cardTitle}>{r.title}</Text>
                  <Text style={styles.cardDesc}>{r.desc}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 24,
  },
  cardContainer: {
    gap: 12,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    padding: 16,
    backgroundColor: "#FFFFFF",
    gap: 14,
  },
  iconBg: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTextCol: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  cardDesc: {
    fontSize: 12,
    color: "#6B7280",
    lineHeight: 16,
  },
});

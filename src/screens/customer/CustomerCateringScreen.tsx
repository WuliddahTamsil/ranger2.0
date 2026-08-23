import React, { useEffect, useState } from "react";
import { ActivityIndicator, Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ArrowRight, CalendarDays, ChefHat, MapPin } from "lucide-react-native";
import { Nav } from "../../types";
import { BackHeader } from "../../components/BackHeader";
import { Stars } from "../../components/Stars";
import { rp } from "../../utils/formatters";
import { getCateringShops } from "../../services/api";
import { setSelectedCateringShop } from "./customerCateringStore";

export const CustomerCateringScreen: React.FC<Nav> = ({ navigate }) => {
  const [shops, setShops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchShops = async () => {
      setLoading(true);
      const res = await getCateringShops();
      if (res.success && res.data) {
        setShops(res.data);
      }
      setLoading(false);
    };
    void fetchShops();
  }, []);

  const handleSelectShop = (shop: any) => {
    setSelectedCateringShop({
      id: shop._id,
      name: shop.roleData?.businessName || shop.name || "Catering Lokal",
      ownerId: shop._id,
      isOpen: shop.roleData?.isDapurOpen === "true",
      address: shop.roleData?.businessAddress || shop.address || "",
      phone: shop.phone || "",
      profilePhoto: shop.profilePhoto,
      description: shop.roleData?.menuSpecialty || "Layanan catering prasmanan dan nasi box berkualitas.",
    });
    navigate("c_catering_detail");
  };

  return (
    <SafeAreaView style={styles.container}>
      <BackHeader title="Catering Lokal" onBack={() => navigate("c_home")} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}><ChefHat size={25} color="#1B7A4E" /></View>
          <View style={styles.heroCopy}>
            <Text style={styles.heroTitle}>Pesan catering untuk acara kamu</Text>
            <Text style={styles.heroDescription}>Pilih mitra catering lokal dan tentukan jadwal pengiriman sesuai kebutuhan.</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Mitra catering terdekat</Text>

        {loading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color="#1B7A4E" />
            <Text style={styles.loadingText}>Memuat katering...</Text>
          </View>
        ) : shops.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Tidak ada mitra katering aktif saat ini.</Text>
          </View>
        ) : (
          shops.map((shop) => {
            const isOpen = shop.roleData?.isDapurOpen === "true";
            const displayName = shop.roleData?.businessName || shop.name || "Katering";
            const specialty = shop.roleData?.menuSpecialty || "Prasmanan & Nasi Box";
            const profileImage = shop.profilePhoto || "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=220&fit=crop&q=80";

            return (
              <View key={shop._id} style={[styles.card, !isOpen && styles.cardClosed]}>
                <Image source={{ uri: profileImage }} style={styles.image} />
                {!isOpen && (
                  <View style={styles.closedOverlay}>
                    <Text style={styles.closedOverlayText}>TUTUP</Text>
                  </View>
                )}
                <View style={styles.cardBody}>
                  <View style={styles.titleRow}>
                    <Text style={styles.name} numberOfLines={1}>{displayName}</Text>
                    <Stars rating={4.8} />
                  </View>
                  <Text style={styles.cuisine}>{specialty}</Text>
                  <View style={styles.metaRow}>
                    <MapPin size={14} color="#6B7280" />
                    <Text style={styles.metaText}>
                      {shop.address || "Kamojang"} · {isOpen ? "Dapur Buka" : "Dapur Tutup"}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.action, !isOpen && styles.actionDisabled]}
                    onPress={() => isOpen && handleSelectShop(shop)}
                    activeOpacity={0.8}
                    disabled={!isOpen}
                  >
                    <CalendarDays size={15} color="#FFFFFF" />
                    <Text style={styles.actionText}>{isOpen ? "Pilih katering" : "Sedang Tutup"}</Text>
                    <ArrowRight size={15} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 16, paddingBottom: 32 },
  hero: { flexDirection: "row", alignItems: "center", backgroundColor: "#E8F5EE", borderRadius: 18, padding: 16, marginBottom: 22 },
  heroIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: "#D1FAE5", alignItems: "center", justifyContent: "center", marginRight: 12 },
  heroCopy: { flex: 1 },
  heroTitle: { color: "#064E3B", fontSize: 16, fontWeight: "800", lineHeight: 21 },
  heroDescription: { color: "#166534", fontSize: 12, lineHeight: 17, marginTop: 4 },
  sectionTitle: { color: "#111827", fontSize: 18, fontWeight: "800", marginBottom: 12 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 18, overflow: "hidden", marginBottom: 14, borderWidth: 1, borderColor: "#E5E7EB", position: "relative" },
  cardClosed: { opacity: 0.8 },
  closedOverlay: { position: "absolute", top: 12, left: 12, backgroundColor: "rgba(239, 68, 68, 0.9)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  closedOverlayText: { color: "#FFFFFF", fontSize: 11, fontWeight: "900", letterSpacing: 0.5 },
  image: { width: "100%", height: 145 },
  cardBody: { padding: 14 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  name: { flex: 1, color: "#111827", fontSize: 16, fontWeight: "800" },
  cuisine: { color: "#6B7280", fontSize: 12, marginTop: 5 },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 10, gap: 5 },
  metaText: { color: "#6B7280", fontSize: 12 },
  action: { backgroundColor: "#1B7A4E", borderRadius: 12, paddingVertical: 11, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 13 },
  actionDisabled: { backgroundColor: "#9CA3AF" },
  actionText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  centerContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 40 },
  loadingText: { color: "#6B7280", fontSize: 13, marginTop: 10 },
  emptyContainer: { alignItems: "center", justifyContent: "center", paddingVertical: 60 },
  emptyText: { color: "#6B7280", fontSize: 13 },
});

import React from "react";
import { Image, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { ArrowRight, CalendarDays, ChefHat, MapPin } from "lucide-react-native";
import { Nav, Restaurant } from "../../types";
import { RESTAURANTS } from "../../constants/mockData";
import { BackHeader } from "../../components/BackHeader";
import { Stars } from "../../components/Stars";
import { rp } from "../../utils/formatters";

export const CustomerCateringScreen: React.FC<Nav> = ({ navigate }) => (
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
      {RESTAURANTS.map((restaurant: Restaurant) => (
        <View key={restaurant.id} style={styles.card}>
          <Image source={{ uri: restaurant.img }} style={styles.image} />
          <View style={styles.cardBody}>
            <View style={styles.titleRow}>
              <Text style={styles.name} numberOfLines={1}>{restaurant.name}</Text>
              <Stars rating={restaurant.rating} />
            </View>
            <Text style={styles.cuisine}>{restaurant.cuisine}</Text>
            <View style={styles.metaRow}>
              <MapPin size={14} color="#6B7280" />
              <Text style={styles.metaText}>{restaurant.distance} km · Mulai {rp(restaurant.minOrder)}</Text>
            </View>
            <TouchableOpacity style={styles.action} onPress={() => navigate("c_catering_detail")} activeOpacity={0.8}>
              <CalendarDays size={15} color="#FFFFFF" />
              <Text style={styles.actionText}>Pilih catering</Text>
              <ArrowRight size={15} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      ))}
    </ScrollView>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { padding: 16, paddingBottom: 32 },
  hero: { flexDirection: "row", alignItems: "center", backgroundColor: "#E8F5EE", borderRadius: 18, padding: 16, marginBottom: 22 },
  heroIcon: { width: 52, height: 52, borderRadius: 16, backgroundColor: "#D1FAE5", alignItems: "center", justifyContent: "center", marginRight: 12 },
  heroCopy: { flex: 1 },
  heroTitle: { color: "#064E3B", fontSize: 16, fontWeight: "800", lineHeight: 21 },
  heroDescription: { color: "#166534", fontSize: 12, lineHeight: 17, marginTop: 4 },
  sectionTitle: { color: "#111827", fontSize: 18, fontWeight: "800", marginBottom: 12 },
  card: { backgroundColor: "#FFFFFF", borderRadius: 18, overflow: "hidden", marginBottom: 14, borderWidth: 1, borderColor: "#E5E7EB" },
  image: { width: "100%", height: 145 },
  cardBody: { padding: 14 },
  titleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  name: { flex: 1, color: "#111827", fontSize: 16, fontWeight: "800" },
  cuisine: { color: "#6B7280", fontSize: 12, marginTop: 5 },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 10, gap: 5 },
  metaText: { color: "#6B7280", fontSize: 12 },
  action: { backgroundColor: "#1B7A4E", borderRadius: 12, paddingVertical: 11, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, marginTop: 13 },
  actionText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
});

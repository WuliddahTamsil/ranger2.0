import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { Star, Clock, MapPin, ShieldCheck, HeartPulse, Bike, AlertCircle } from "lucide-react-native";
import { ShopStore } from "../../services/shopService";
import { rp } from "../../utils/formatters";

interface StoreCardProps {
  store: ShopStore;
  onPress: (store: ShopStore) => void;
  horizontal?: boolean;
}

export const StoreCard: React.FC<StoreCardProps> = ({ store, onPress, horizontal = false }) => {
  const isClosed = !store.isOpen;

  return (
    <TouchableOpacity
      style={[styles.container, horizontal ? styles.horizontalContainer : styles.verticalContainer]}
      onPress={() => onPress(store)}
      activeOpacity={0.88}
    >
      {/* Cover Image */}
      <View style={styles.coverWrapper}>
        <Image source={{ uri: store.coverImage }} style={styles.coverImage} />

        {/* Closed Overlay */}
        {isClosed && (
          <View style={styles.closedOverlay}>
            <Text style={styles.closedText}>Tutup Sementara</Text>
            {store.openingHours?.openTime && (
              <Text style={styles.closedSubText}>Buka pukul {store.openingHours.openTime}</Text>
            )}
          </View>
        )}

        {/* Store Type Badge */}
        <View style={styles.storeTypeBadge}>
          <Text style={styles.storeTypeText}>{store.storeType}</Text>
        </View>

        {/* Pharmacy / Verified Badges */}
        <View style={styles.topRightBadges}>
          {store.isOfficialPharmacy && (
            <View style={styles.pharmacyBadge}>
              <HeartPulse size={12} color="#FFFFFF" />
              <Text style={styles.pharmacyBadgeText}>Apotek Resmi</Text>
            </View>
          )}
          {store.isVerified && (
            <View style={styles.verifiedBadge}>
              <ShieldCheck size={12} color="#FFFFFF" />
            </View>
          )}
        </View>

        {/* Logo floating */}
        <View style={styles.logoWrapper}>
          <Image source={{ uri: store.logo }} style={styles.logoImage} />
        </View>
      </View>

      {/* Body Info */}
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.name} numberOfLines={1}>
            {store.name}
          </Text>
        </View>

        {/* Rating & Distance Row */}
        <View style={styles.metaRow}>
          <View style={styles.ratingBadge}>
            <Star size={12} color="#F59E0B" fill="#F59E0B" />
            <Text style={styles.ratingText}>{store.rating?.toFixed(1) || "4.9"}</Text>
            <Text style={styles.reviewCount}>({store.reviewCount || 0})</Text>
          </View>

          <Text style={styles.dotSeparator}>•</Text>

          {store.distanceKm !== undefined && (
            <View style={styles.iconTextRow}>
              <MapPin size={12} color="#6B7280" />
              <Text style={styles.metaText}>{store.distanceKm} km</Text>
            </View>
          )}

          <Text style={styles.dotSeparator}>•</Text>

          <View style={styles.iconTextRow}>
            <Clock size={12} color="#15803D" />
            <Text style={styles.etaText}>{store.estimatedDeliveryMinutes || 25} mnt</Text>
          </View>
        </View>

        {/* Delivery fee & Min Order */}
        <View style={styles.bottomRow}>
          <View style={styles.feeCol}>
            <View style={styles.iconTextRow}>
              <Bike size={12} color="#4B5563" />
              <Text style={styles.feeText}>Ongkir {rp(store.deliveryFee || 8000)}</Text>
            </View>
          </View>

          {store.minimumOrder > 0 && (
            <Text style={styles.minOrderText}>Min. {rp(store.minimumOrder)}</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  horizontalContainer: {
    width: 260,
    marginRight: 14,
  },
  verticalContainer: {
    width: "100%",
    marginBottom: 14,
  },
  coverWrapper: {
    height: 125,
    position: "relative",
  },
  coverImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  closedOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(17, 24, 39, 0.72)",
    justifyContent: "center",
    alignItems: "center",
  },
  closedText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  closedSubText: {
    color: "#D1D5DB",
    fontSize: 11,
    marginTop: 2,
  },
  storeTypeBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "rgba(17, 24, 39, 0.75)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  storeTypeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  topRightBadges: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  pharmacyBadge: {
    backgroundColor: "#0284C7",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  pharmacyBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  verifiedBadge: {
    backgroundColor: "#15803D",
    padding: 4,
    borderRadius: 6,
  },
  logoWrapper: {
    position: "absolute",
    bottom: -18,
    left: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  logoImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  body: {
    paddingHorizontal: 12,
    paddingTop: 22,
    paddingBottom: 12,
  },
  titleRow: {
    marginBottom: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 4,
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1F2937",
  },
  reviewCount: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  dotSeparator: {
    marginHorizontal: 6,
    color: "#D1D5DB",
  },
  iconTextRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  metaText: {
    fontSize: 12,
    color: "#6B7280",
  },
  etaText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#15803D",
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  feeCol: {
    flexDirection: "row",
    alignItems: "center",
  },
  feeText: {
    fontSize: 11,
    color: "#4B5563",
    fontWeight: "500",
  },
  minOrderText: {
    fontSize: 10,
    color: "#9CA3AF",
  },
});

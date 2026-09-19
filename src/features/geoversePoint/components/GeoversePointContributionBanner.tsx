import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Recycle, ArrowRight } from "lucide-react-native";

interface GeoversePointContributionBannerProps {
  onDepositPress: () => void;
}

export const GeoversePointContributionBanner: React.FC<GeoversePointContributionBannerProps> = ({
  onDepositPress,
}) => {
  return (
    <View style={styles.bannerContainer}>
      <View style={styles.contentCol}>
        <View style={styles.tagRow}>
          <View style={styles.tagBadge}>
            <Recycle size={12} color="#047857" />
            <Text style={styles.tagText}>Daur Ulang Berhadiah</Text>
          </View>
        </View>
        <Text style={styles.title}>Setor sampah, kumpulkan Point!</Text>
        <Text style={styles.subtitle}>
          Timbang sampah anorganik di Bank Sampah terdekat dan dapatkan poin langsung ke dompetmu.
        </Text>
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={onDepositPress}
          activeOpacity={0.8}
          accessibilityLabel="Setor Sampah Sekarang"
        >
          <Text style={styles.ctaText}>Setor Sampah Sekarang</Text>
          <ArrowRight size={14} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    backgroundColor: "#F0FDF4",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    padding: 16,
    marginBottom: 16,
  },
  contentCol: {
    flexDirection: "column",
  },
  tagRow: {
    marginBottom: 6,
  },
  tagBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  tagText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#047857",
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#14532D",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: "#374151",
    lineHeight: 18,
    marginBottom: 12,
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#15803D",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  ctaText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Recycle, ArrowRight, Sparkles } from "lucide-react-native";

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
            <Recycle size={11} color="#059669" />
            <Text style={styles.tagText}>Daur Ulang Berhadiah</Text>
          </View>
        </View>
        <Text style={styles.title}>Setor Sampah, Dapatkan Saldo Poin!</Text>
        <Text style={styles.subtitle}>
          Timbang sampah anorganik di mitra Bank Sampah terdekat dan langsung klaim poin reward ke dompetmu.
        </Text>
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={onDepositPress}
          activeOpacity={0.82}
          accessibilityLabel="Setor Sampah Sekarang"
        >
          <Text style={styles.ctaText}>Mulai Setor Sampah</Text>
          <ArrowRight size={13} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    backgroundColor: "#F0FDF4",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    padding: 16,
    marginBottom: 16,
  },
  contentCol: {
    flexDirection: "column",
  },
  tagRow: {
    marginBottom: 8,
  },
  tagBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    alignSelf: "flex-start",
  },
  tagText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#059669",
  },
  title: {
    fontSize: 15,
    fontWeight: "800",
    color: "#14532D",
    marginBottom: 4,
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 12,
    color: "#4B5563",
    lineHeight: 18,
    marginBottom: 12,
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#059669",
    paddingVertical: 9,
    paddingHorizontal: 15,
    borderRadius: 9,
    alignSelf: "flex-start",
  },
  ctaText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});

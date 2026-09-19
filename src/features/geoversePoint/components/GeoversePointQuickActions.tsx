import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { Ticket, Banknote, Clock, Sparkles } from "lucide-react-native";

interface GeoversePointQuickActionsProps {
  onRedeemVoucher: () => void;
  onRedeemCash: () => void;
  onViewHistory: () => void;
  onHowItWorks: () => void;
}

export const GeoversePointQuickActions: React.FC<GeoversePointQuickActionsProps> = ({
  onRedeemVoucher,
  onRedeemCash,
  onViewHistory,
  onHowItWorks,
}) => {
  const actions = [
    {
      id: "voucher",
      label: "Tukar Voucher",
      icon: Ticket,
      color: "#D97706",
      bg: "#FEF3C7",
      border: "#FDE68A",
      onPress: onRedeemVoucher,
    },
    {
      id: "cash",
      label: "Tarik Rupiah",
      icon: Banknote,
      color: "#059669",
      bg: "#ECFDF5",
      border: "#A7F3D0",
      onPress: onRedeemCash,
    },
    {
      id: "history",
      label: "Riwayat",
      icon: Clock,
      color: "#0284C7",
      bg: "#E0F2FE",
      border: "#BAE6FD",
      onPress: onViewHistory,
    },
    {
      id: "guide",
      label: "Cara Kerja",
      icon: Sparkles,
      color: "#7C3AED",
      bg: "#F5F3FF",
      border: "#DDD6FE",
      onPress: onHowItWorks,
    },
  ];

  return (
    <View style={styles.container}>
      {actions.map((item) => {
        const IconComponent = item.icon;
        return (
          <TouchableOpacity
            key={item.id}
            style={styles.actionItem}
            onPress={item.onPress}
            activeOpacity={0.75}
            accessibilityLabel={item.label}
          >
            <View
              style={[
                styles.iconWrapper,
                { backgroundColor: item.bg, borderColor: item.border },
              ]}
            >
              <IconComponent size={22} color={item.color} />
            </View>
            <Text style={styles.actionLabel} numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.8}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  actionItem: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    paddingHorizontal: 4,
  },
  iconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#334155",
    textAlign: "center",
    lineHeight: 14,
  },
});

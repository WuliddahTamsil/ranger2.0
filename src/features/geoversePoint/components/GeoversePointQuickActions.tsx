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
      bg: "#FFFBEB",
      border: "#FDE68A",
      onPress: onRedeemVoucher,
    },
    {
      id: "cash",
      label: "Tarik Tunai",
      icon: Banknote,
      color: "#059669",
      bg: "#ECFDF5",
      border: "#A7F3D0",
      onPress: onRedeemCash,
    },
    {
      id: "history",
      label: "Mutasi Poin",
      icon: Clock,
      color: "#0284C7",
      bg: "#F0F9FF",
      border: "#BAE6FD",
      onPress: onViewHistory,
    },
    {
      id: "guide",
      label: "Panduan",
      icon: Sparkles,
      color: "#6366F1",
      bg: "#EEF2FF",
      border: "#C7D2FE",
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
            activeOpacity={0.72}
            accessibilityLabel={item.label}
          >
            <View
              style={[
                styles.iconWrapper,
                { backgroundColor: item.bg, borderColor: item.border },
              ]}
            >
              <IconComponent size={20} color={item.color} />
            </View>
            <Text style={styles.actionLabel} numberOfLines={2}>
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
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  actionItem: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    paddingHorizontal: 2,
  },
  iconWrapper: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 7,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1E293B",
    textAlign: "center",
    lineHeight: 14,
  },
});

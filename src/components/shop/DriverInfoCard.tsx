import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, Linking } from "react-native";
import { Phone, MessageCircle, Bike, ShieldCheck } from "lucide-react-native";

interface DriverInfoCardProps {
  driver: {
    name: string;
    phone?: string;
    profilePhoto?: string;
    plateNumber?: string;
  };
  orderStatus: string;
  onPressChat?: () => void;
}

export const DriverInfoCard: React.FC<DriverInfoCardProps> = ({
  driver,
  orderStatus,
  onPressChat,
}) => {
  const getStatusText = (status: string) => {
    switch (status) {
      case "DRIVER_ASSIGNED":
        return "Kurir ditugaskan & menuju toko";
      case "DRIVER_AT_STORE":
        return "Kurir telah tiba di toko";
      case "PICKED_UP":
      case "DELIVERING":
        return "Kurir sedang mengantar ke alamatmu";
      case "ARRIVED":
        return "Kurir telah sampai di depan alamatmu";
      case "COMPLETED":
        return "Pengantaran selesai";
      default:
        return "Kurir aktif";
    }
  };

  const handleCall = () => {
    if (driver.phone) {
      Linking.openURL(`tel:${driver.phone}`);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.avatarWrapper}>
          {driver.profilePhoto ? (
            <Image source={{ uri: driver.profilePhoto }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Bike size={20} color="#15803D" />
            </View>
          )}
          <View style={styles.verifiedBadge}>
            <ShieldCheck size={10} color="#FFFFFF" />
          </View>
        </View>

        <View style={styles.infoCol}>
          <Text style={styles.driverName}>{driver.name || "Kurir Kanyaah"}</Text>
          <Text style={styles.statusText}>{getStatusText(orderStatus)}</Text>
          {driver.plateNumber ? (
            <View style={styles.plateBadge}>
              <Text style={styles.plateText}>{driver.plateNumber}</Text>
            </View>
          ) : null}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {onPressChat && (
            <TouchableOpacity style={styles.actionBtn} onPress={onPressChat} activeOpacity={0.7}>
              <MessageCircle size={18} color="#15803D" />
            </TouchableOpacity>
          )}
          {driver.phone ? (
            <TouchableOpacity style={styles.actionBtn} onPress={handleCall} activeOpacity={0.7}>
              <Phone size={18} color="#15803D" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F3F4F6",
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarWrapper: {
    position: "relative",
    marginRight: 12,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#F3F4F6",
  },
  avatarPlaceholder: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
  },
  verifiedBadge: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "#15803D",
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  infoCol: {
    flex: 1,
  },
  driverName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
  },
  statusText: {
    fontSize: 12,
    color: "#15803D",
    fontWeight: "500",
    marginTop: 2,
  },
  plateBadge: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
    marginTop: 4,
  },
  plateText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#374151",
    letterSpacing: 0.5,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F0FDF4",
    borderWidth: 1,
    borderColor: "#BBF7D0",
    justifyContent: "center",
    alignItems: "center",
  },
});

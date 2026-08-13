import React from "react";
import { StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Bell } from "lucide-react-native";
import { useTimeGreeting } from "../utils/timeGreeting";

type RoleIcon = React.ComponentType<{
  color?: string;
  size?: number;
  strokeWidth?: number;
}>;

interface RoleHeaderProps {
  name: string;
  role: string;
  icon: RoleIcon;
  notificationCount?: number;
  fullBleed?: boolean;
  onNotificationPress?: () => void;
  onRolePress?: () => void;
}

export const RoleHeader: React.FC<RoleHeaderProps> = ({
  name,
  role,
  icon: RoleIcon,
  notificationCount = 0,
  fullBleed = true,
  onNotificationPress,
  onRolePress,
}) => {
  const greeting = useTimeGreeting();

  return (
    <View style={fullBleed ? styles.fullBleed : undefined}>
      <StatusBar barStyle="light-content" backgroundColor="#0E6641" />
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Text style={styles.greetingText}>Halo, {greeting} 🌿</Text>
          <Text style={styles.nameText} numberOfLines={1}>
            {name || "Nama Pengguna"}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.notificationButton}
          onPress={onNotificationPress}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Buka notifikasi"
        >
          <Bell size={20} color="#FFFFFF" strokeWidth={2} />
          {notificationCount > 0 && <View style={styles.notificationBadge} />}
        </TouchableOpacity>
      </View>

      <View style={styles.roleRow}>
        <TouchableOpacity
          style={styles.roleButton}
          onPress={onRolePress}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`Beralih peran ${role}`}
        >
          <RoleIcon size={15} color="#FFFFFF" strokeWidth={2.5} />
          <Text style={styles.roleText}>{role}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  fullBleed: {
    marginHorizontal: -20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0E6641",
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20,
  },
  titleContainer: {
    flex: 1,
    paddingRight: 12,
  },
  greetingText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.86)",
    marginBottom: 4,
  },
  nameText: {
    fontSize: 23,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  notificationButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    position: "relative",
  },
  notificationBadge: {
    position: "absolute",
    top: 9,
    right: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#EF4444",
  },
  roleRow: {
    backgroundColor: "#F9FAFB",
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  roleButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 7,
    backgroundColor: "#2563EB",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 3,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  roleText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
});

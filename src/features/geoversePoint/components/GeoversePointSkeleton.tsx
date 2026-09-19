import React from "react";
import { View, StyleSheet } from "react-native";

export const GeoversePointSkeleton: React.FC = () => {
  return (
    <View style={styles.container}>
      {/* Hero Skeleton */}
      <View style={styles.heroSkeleton}>
        <View style={styles.topRow}>
          <View style={[styles.box, { width: 120, height: 14 }]} />
          <View style={[styles.box, { width: 80, height: 14 }]} />
        </View>
        <View style={[styles.box, { width: 180, height: 32, marginVertical: 14 }]} />
        <View style={styles.bottomRow}>
          <View style={[styles.box, { width: 140, height: 14 }]} />
          <View style={[styles.box, { width: 90, height: 26, borderRadius: 8 }]} />
        </View>
      </View>

      {/* Quick Action Skeleton */}
      <View style={styles.quickActionSkeleton}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.actionItem}>
            <View style={[styles.box, { width: 48, height: 48, borderRadius: 12 }]} />
            <View style={[styles.box, { width: 52, height: 10, marginTop: 8 }]} />
          </View>
        ))}
      </View>

      {/* Banner Skeleton */}
      <View style={[styles.box, { width: "100%", height: 120, borderRadius: 14, marginBottom: 16 }]} />

      {/* Activity Skeleton */}
      <View style={styles.activitySkeleton}>
        <View style={[styles.box, { width: 140, height: 18, marginBottom: 14 }]} />
        {[1, 2, 3].map((i) => (
          <View key={i} style={styles.listItem}>
            <View style={[styles.box, { width: 40, height: 40, borderRadius: 10 }]} />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={[styles.box, { width: 120, height: 14, marginBottom: 6 }]} />
              <View style={[styles.box, { width: 80, height: 10 }]} />
            </View>
            <View style={[styles.box, { width: 60, height: 14 }]} />
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  box: {
    backgroundColor: "#E2E8F0",
    borderRadius: 6,
  },
  heroSkeleton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  quickActionSkeleton: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
  },
  actionItem: {
    alignItems: "center",
  },
  activitySkeleton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
});

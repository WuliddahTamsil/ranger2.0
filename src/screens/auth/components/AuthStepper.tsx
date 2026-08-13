import React from "react";
import { Text, View, StyleSheet } from "react-native";
import { authColors } from "../authStyles";

export const AuthStepper: React.FC<{ current: number; labels: string[] }> = ({ current, labels }) => (
  <View style={styles.wrap}>
    {labels.map((label, index) => (
      <React.Fragment key={label}>
        <View style={styles.item}>
          <View style={[styles.circle, index <= current && styles.circleActive]}>
            <Text style={[styles.number, index <= current && styles.numberActive]}>{index + 1}</Text>
          </View>
          <Text numberOfLines={1} style={[styles.label, index === current && styles.labelActive]}>{label}</Text>
        </View>
        {index < labels.length - 1 && <View style={[styles.line, index < current && styles.lineActive]} />}
      </React.Fragment>
    ))}
  </View>
);

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "flex-start", marginTop: 22, marginBottom: 8 },
  item: { alignItems: "center", width: 64 },
  circle: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#D1D5DB" },
  circleActive: { backgroundColor: authColors.primary, borderColor: authColors.primary },
  number: { color: "#6B7280", fontSize: 12, fontWeight: "800" },
  numberActive: { color: "#FFFFFF" },
  label: { color: "#9CA3AF", fontSize: 10, marginTop: 6, textAlign: "center" },
  labelActive: { color: authColors.primary, fontWeight: "800" },
  line: { flex: 1, height: 2, backgroundColor: "#E5E7EB", marginTop: 13 },
  lineActive: { backgroundColor: authColors.primary },
});

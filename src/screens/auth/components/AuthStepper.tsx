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
  wrap: { flexDirection: "row", alignItems: "flex-start", marginTop: 24, marginBottom: 7, paddingHorizontal: 2 },
  item: { alignItems: "center", width: 66 },
  circle: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#D5DEE9" },
  circleActive: { backgroundColor: authColors.primary, borderColor: authColors.primary },
  number: { color: "#6B7280", fontSize: 12, fontWeight: "800" },
  numberActive: { color: "#FFFFFF" },
  label: { color: "#9AA7BA", fontSize: 10, marginTop: 6, textAlign: "center" },
  labelActive: { color: authColors.primary, fontWeight: "800" },
  line: { flex: 1, height: 3, backgroundColor: "#E6ECF2", marginTop: 14, borderRadius: 2 },
  lineActive: { backgroundColor: authColors.primary },
});

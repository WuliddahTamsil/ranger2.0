import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { authColors } from "../authStyles";

export const AuthBrand: React.FC = () => (
  <View style={styles.lockup}>
    <View style={styles.mark}><Text style={styles.markText}>G</Text></View>
    <View>
      <Text style={styles.name}>GEOVERSE <Text style={styles.version}>2.0</Text></Text>
      <Text style={styles.tagline}>PGE KAMOJANG COMMUNITY</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  lockup: { flexDirection: "row", alignItems: "center" },
  mark: { width: 54, height: 54, borderRadius: 17, backgroundColor: authColors.primary, alignItems: "center", justifyContent: "center", marginRight: 13 },
  markText: { color: "#FFFFFF", fontSize: 29, fontWeight: "900", letterSpacing: -1 },
  name: { color: authColors.ink, fontSize: 16, fontWeight: "800", letterSpacing: 1.55 },
  version: { color: authColors.muted, fontWeight: "700" },
  tagline: { color: authColors.primary, fontSize: 8.5, fontWeight: "800", letterSpacing: 1.3, marginTop: 4 },
});

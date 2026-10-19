import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { authColors } from "../authStyles";

interface AuthBrandProps {
  size?: number;
}

export const AuthBrand: React.FC<AuthBrandProps> = ({ size = 44 }) => (
  <View style={styles.lockup}>
    <Image
      source={require("../../../../assets/geoverse-logo.png")}
      style={[styles.logo, { width: size, height: size }]}
      resizeMode="contain"
    />
    <View style={styles.textWrap}>
      <Text style={styles.name}>
        GEOVERSE <Text style={styles.version}>2.0</Text>
      </Text>
      <Text style={styles.tagline}>PGE KAMOJANG COMMUNITY</Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  lockup: {
    flexDirection: "row",
    alignItems: "center",
    maxWidth: "100%",
  },
  logo: {
    marginRight: 11,
    flexShrink: 0,
  },
  textWrap: {
    flexShrink: 1,
  },
  name: {
    color: authColors.ink,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 1.3,
  },
  version: {
    color: authColors.muted,
    fontWeight: "700",
  },
  tagline: {
    color: authColors.primary,
    fontSize: 8.5,
    fontWeight: "800",
    letterSpacing: 1.2,
    marginTop: 3,
  },
});

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { MapPin } from "lucide-react-native";

export interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export interface MapPressEvent {
  nativeEvent: {
    coordinate: {
      latitude: number;
      longitude: number;
    };
  };
}

interface WebMapProps {
  googleMapsUrl?: string;
  region?: Region;
  onRegionChangeComplete?: (region: Region) => void;
  onPress?: (event: MapPressEvent) => void;
  pin?: { latitude: number; longitude: number };
  onPinDragEnd?: (coordinate: { latitude: number; longitude: number }) => void;
  interactive?: boolean;
  style?: any;
}

export const NativeMapComponent: React.FC<WebMapProps> = ({ googleMapsUrl, pin, style }) => {
  const url = googleMapsUrl || (pin ? `https://maps.google.com/maps?q=${pin.latitude},${pin.longitude}&z=16&output=embed` : "");
  if (url && typeof document !== "undefined") {
    return (
      <iframe
        key={url}
        title="Google Maps"
        src={url}
        style={{ width: "100%", height: "100%", border: 0, ...(style ? (style as any) : {}) }}
        loading="lazy"
      />
    );
  }
  return (
    <View style={[styles.webMapFallback, style]}>
      <MapPin size={38} color="#1B7A4E" />
      <Text style={styles.webMapTitle}>Google Maps Lokasi</Text>
      <Text style={styles.webMapText}>Peta web aktif</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  webMapFallback: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 24, backgroundColor: "#EAF7EF" },
  webMapTitle: { color: "#166534", fontSize: 14, fontWeight: "900", marginTop: 10, textAlign: "center" },
  webMapText: { color: "#4D7C5B", fontSize: 11, textAlign: "center", marginTop: 5 },
});

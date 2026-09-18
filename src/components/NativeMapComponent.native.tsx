import React from "react";
import { StyleSheet, View } from "react-native";
import MapView, { Marker, Polyline, Region, MapPressEvent, PROVIDER_GOOGLE } from "react-native-maps";

export { Region, MapPressEvent };

export interface MapMarkerItem {
  id: string;
  coordinate: { latitude: number; longitude: number };
  title?: string;
  description?: string;
  pinColor?: string;
  type?: "pickup" | "dropoff" | "driver" | "custom";
}

interface NativeMapProps {
  googleMapsUrl?: string;
  region?: Region;
  initialRegion?: Region;
  onRegionChangeComplete?: (region: Region) => void;
  onPress?: (event: MapPressEvent) => void;
  pin?: { latitude: number; longitude: number };
  markers?: MapMarkerItem[];
  showsUserLocation?: boolean;
  onPinDragEnd?: (coordinate: { latitude: number; longitude: number }) => void;
  interactive?: boolean;
  style?: any;
  showRouteLine?: boolean;
}

export const NativeMapComponent: React.FC<NativeMapProps> = ({
  region,
  initialRegion,
  onRegionChangeComplete,
  onPress,
  pin,
  markers = [],
  showsUserLocation = true,
  onPinDragEnd,
  interactive = true,
  style,
  showRouteLine = true,
}) => {
  const currentRegion =
    region ||
    initialRegion ||
    (pin
      ? {
          latitude: pin.latitude,
          longitude: pin.longitude,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        }
      : undefined);

  const routeCoords = markers
    .filter((m) => m.coordinate?.latitude != null && m.coordinate?.longitude != null)
    .map((m) => m.coordinate);

  return (
    <MapView
      provider={PROVIDER_GOOGLE}
      style={style || StyleSheet.absoluteFill}
      region={currentRegion}
      onRegionChangeComplete={onRegionChangeComplete}
      onPress={onPress}
      showsUserLocation={showsUserLocation}
      showsMyLocationButton={false}
      scrollEnabled={interactive}
      zoomEnabled={interactive}
      rotateEnabled={interactive}
      pitchEnabled={interactive}
      loadingEnabled
    >
      {pin && (
        <Marker
          coordinate={pin}
          draggable={interactive}
          onDragEnd={(event: any) => {
            const coordinate = event?.nativeEvent?.coordinate;
            if (coordinate && onPinDragEnd) {
              onPinDragEnd(coordinate);
            }
          }}
          title="Titik Pilihan"
          description="Geser pin ke titik yang tepat"
          pinColor="#059669"
        />
      )}
      {markers.map((m, idx) => {
        const pinColor =
          m.pinColor ||
          (m.type === "pickup" || idx === 0
            ? "#059669"
            : m.type === "dropoff" || idx === 1
            ? "#E11D48"
            : "#0284C7");

        return (
          <Marker
            key={m.id || `marker-${idx}`}
            coordinate={m.coordinate}
            title={m.title}
            description={m.description}
            pinColor={pinColor}
          />
        );
      })}

      {showRouteLine && routeCoords.length >= 2 && (
        <Polyline
          coordinates={routeCoords}
          strokeColor="#059669"
          strokeWidth={4}
          lineDashPattern={[6, 6]}
        />
      )}
    </MapView>
  );
};

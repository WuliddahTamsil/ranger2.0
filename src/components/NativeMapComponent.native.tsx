import React, { useEffect, useRef, useState } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
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
  routeCoordinates?: Array<{ latitude: number; longitude: number }>;
  routeColor?: string;
  fitToRoute?: boolean;
  showsUserLocation?: boolean;
  onPinDragEnd?: (coordinate: { latitude: number; longitude: number }) => void;
  interactive?: boolean;
  style?: StyleProp<ViewStyle>;
  showRouteLine?: boolean;
}

export const NativeMapComponent: React.FC<NativeMapProps> = ({
  region,
  initialRegion,
  onRegionChangeComplete,
  onPress,
  pin,
  markers = [],
  routeCoordinates,
  routeColor = "#E11D48",
  fitToRoute = false,
  showsUserLocation = true,
  onPinDragEnd,
  interactive = true,
  style,
  showRouteLine = true,
}) => {
  const mapRef = useRef<MapView | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const markerCoordinates = markers
    .filter((m) => m.coordinate?.latitude != null && m.coordinate?.longitude != null)
    .map((m) => m.coordinate);
  const activeRouteCoordinates = routeCoordinates?.length ? routeCoordinates : markerCoordinates;
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
      : markerCoordinates[0]
      ? {
          latitude: markerCoordinates[0].latitude,
          longitude: markerCoordinates[0].longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        }
      : undefined);

  useEffect(() => {
    if (!mapReady || !fitToRoute || !routeCoordinates || routeCoordinates.length < 2) return;
    mapRef.current?.fitToCoordinates(routeCoordinates, {
      edgePadding: { top: 48, right: 48, bottom: 48, left: 48 },
      animated: true,
    });
  }, [fitToRoute, mapReady, routeCoordinates]);

  return (
    <MapView
      provider={PROVIDER_GOOGLE}
      style={style || StyleSheet.absoluteFill}
      region={currentRegion}
      ref={mapRef}
      onMapReady={() => setMapReady(true)}
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
          onDragEnd={(event) => {
            const coordinate = event.nativeEvent.coordinate;
            if (onPinDragEnd) onPinDragEnd(coordinate);
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

      {showRouteLine && activeRouteCoordinates.length >= 2 && (
        <Polyline
          coordinates={activeRouteCoordinates}
          strokeColor={routeCoordinates?.length ? routeColor : "#059669"}
          strokeWidth={4}
          lineDashPattern={routeCoordinates?.length ? undefined : [6, 6]}
        />
      )}
    </MapView>
  );
};

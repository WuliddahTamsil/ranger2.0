import React from "react";
import { StyleSheet } from "react-native";
import MapView, { Marker, Region, MapPressEvent } from "react-native-maps";

export { Region, MapPressEvent };

interface NativeMapProps {
  googleMapsUrl?: string;
  region?: Region;
  onRegionChangeComplete?: (region: Region) => void;
  onPress?: (event: MapPressEvent) => void;
  pin?: { latitude: number; longitude: number };
  onPinDragEnd?: (coordinate: { latitude: number; longitude: number }) => void;
  interactive?: boolean;
  style?: any;
}

export const NativeMapComponent: React.FC<NativeMapProps> = ({
  region,
  onRegionChangeComplete,
  onPress,
  pin,
  onPinDragEnd,
  interactive = true,
  style,
}) => {
  const currentRegion = region || (pin ? {
    latitude: pin.latitude,
    longitude: pin.longitude,
    latitudeDelta: 0.008,
    longitudeDelta: 0.008,
  } : undefined);

  return (
    <MapView
      style={style || StyleSheet.absoluteFill}
      region={currentRegion}
      onRegionChangeComplete={onRegionChangeComplete}
      onPress={onPress}
      showsUserLocation={interactive}
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
          title="Lokasi rumah"
          description="Geser pin ke titik rumah yang paling tepat"
        />
      )}
    </MapView>
  );
};

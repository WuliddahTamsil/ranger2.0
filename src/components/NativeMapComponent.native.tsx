import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { AlertCircle, RefreshCw } from "lucide-react-native";

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

export interface MapMarkerItem {
  id: string;
  coordinate: { latitude: number; longitude: number };
  title?: string;
  description?: string;
  pinColor?: string;
  type?: "pickup" | "dropoff" | "driver" | "custom";
}

export interface NativeMapProps {
  googleMapsUrl?: string;
  region?: Region;
  initialRegion?: Region;
  onRegionChangeComplete?: (region: Region) => void;
  onPress?: (event: MapPressEvent) => void;
  onMarkerPress?: (marker: MapMarkerItem) => void;
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
  onMarkerPress,
  pin,
  markers = [],
  routeCoordinates,
  routeColor = "#059669",
  fitToRoute = false,
  onPinDragEnd,
  interactive = true,
  style,
  showRouteLine = true,
}) => {
  const webViewRef = useRef<WebView>(null);
  const [mapReady, setMapReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const allMarkers = useMemo(() => {
    const list = [...markers];
    if (pin && !list.some((marker) => marker.id === "selected_pin")) {
      list.push({
        id: "selected_pin",
        coordinate: pin,
        title: "Titik Pilihan",
        description: "Ketuk atau geser pin untuk memindahkan titik",
        pinColor: "#059669",
        type: "pickup",
      });
    }
    return list;
  }, [markers, pin]);

  const center =
    region ||
    initialRegion ||
    (pin
      ? { latitude: pin.latitude, longitude: pin.longitude, latitudeDelta: 0.012, longitudeDelta: 0.012 }
      : allMarkers[0]
      ? { latitude: allMarkers[0].coordinate.latitude, longitude: allMarkers[0].coordinate.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 }
      : { latitude: -6.5962, longitude: 106.804, latitudeDelta: 0.02, longitudeDelta: 0.02 });

  // Update pin dynamically without re-rendering the whole WebView HTML
  useEffect(() => {
    if (mapReady && pin?.latitude != null && pin?.longitude != null) {
      const script = `
        try {
          if (window.updatePin) {
            window.updatePin(${pin.latitude}, ${pin.longitude});
          }
        } catch (e) {}
        true;
      `;
      webViewRef.current?.injectJavaScript(script);
    }
  }, [pin?.latitude, pin?.longitude, mapReady]);

  // Update center dynamically if region changes externally (e.g. search place)
  useEffect(() => {
    if (mapReady && region?.latitude != null && region?.longitude != null) {
      const script = `
        try {
          if (window.updateCenter) {
            window.updateCenter(${region.latitude}, ${region.longitude});
          }
        } catch (e) {}
        true;
      `;
      webViewRef.current?.injectJavaScript(script);
    }
  }, [region?.latitude, region?.longitude, mapReady]);

  const mapHtml = useMemo(() => {
    const markersJson = JSON.stringify(allMarkers);
    const routeJson = JSON.stringify(routeCoordinates?.length ? routeCoordinates : []);
    const routeColorJson = JSON.stringify(routeColor);

    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="" />
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #map {
      width: 100%;
      height: 100%;
      min-height: 100%;
      overflow: hidden;
      background: #F1F5F9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .leaflet-container {
      width: 100%;
      height: 100%;
      background: #F1F5F9;
    }
    .leaflet-tile {
      max-width: none !important;
    }
    .custom-marker {
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .marker-pin {
      width: 34px;
      height: 34px;
      border-radius: 50% 50% 50% 0;
      position: absolute;
      transform: rotate(-45deg);
      left: 50%;
      top: 50%;
      margin: -19px 0 0 -17px;
      box-shadow: 0 4px 10px rgba(0,0,0,0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2.5px solid #ffffff;
    }
    .marker-pin-inner {
      width: 12px;
      height: 12px;
      background: #ffffff;
      border-radius: 50%;
      transform: rotate(45deg);
    }
    .marker-pulse {
      background: rgba(5, 150, 105, 0.3);
      border-radius: 50%;
      height: 20px;
      width: 20px;
      position: absolute;
      left: 50%;
      top: 50%;
      margin: 8px 0 0 -10px;
      transform: rotateX(55deg);
      z-index: -2;
      animation: pulse 1.8s ease-out infinite;
    }
    .driver-pin {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: 3px solid #ffffff;
      background: #0284c7;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      box-shadow: 0 4px 10px rgba(0,0,0,0.35);
    }
    @keyframes pulse {
      0% { transform: scale(0.1); opacity: 0; }
      50% { opacity: 1; }
      100% { transform: scale(1.6); opacity: 0; }
    }
    .leaflet-control-attribution {
      font-size: 9px;
      background: rgba(255,255,255,0.85);
      padding: 2px 5px;
    }
  </style>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
</head>
<body>
  <div id="map"></div>
  <script>
    function send(data) {
      try {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify(data));
        }
      } catch (e) {}
    }

    try {
      if (typeof L === 'undefined') {
        throw new Error('Leaflet library failed to load');
      }

      var map = L.map('map', {
        zoomControl: ${interactive ? "true" : "false"},
        attributionControl: true
      }).setView([${center.latitude}, ${center.longitude}], 15);

      // Primary: Google Roadmap tiles (super-fast, high-resolution Indonesian street coverage)
      var googleRoadmap = L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        crossOrigin: true
      });

      // Fallback on tile error to OpenStreetMap / CartoDB
      googleRoadmap.on('tileerror', function(error, tile) {
        if (tile && !tile.__fallbackStep) {
          tile.__fallbackStep = 1;
          tile.src = 'https://tile.openstreetmap.org/' + error.coords.z + '/' + error.coords.x + '/' + error.coords.y + '.png';
        } else if (tile && tile.__fallbackStep === 1) {
          tile.__fallbackStep = 2;
          tile.src = 'https://a.basemaps.cartocdn.com/rastertiles/voyager/' + error.coords.z + '/' + error.coords.x + '/' + error.coords.y + '.png';
        }
      });
      googleRoadmap.addTo(map);

      // Force recalculate container dimensions when WebView finishes layout
      function forceResize() {
        if (typeof map !== 'undefined' && map) {
          map.invalidateSize(true);
        }
      }

      if (window.ResizeObserver) {
        var ro = new ResizeObserver(function() { forceResize(); });
        ro.observe(document.getElementById('map'));
      }

      setTimeout(forceResize, 50);
      setTimeout(forceResize, 150);
      setTimeout(forceResize, 350);
      setTimeout(forceResize, 700);
      setTimeout(forceResize, 1500);
      window.addEventListener('resize', forceResize);

      var markersData = ${markersJson};
      var routeData = ${routeJson};
      var selectedMarker = null;
      var leafletMarkers = [];

      markersData.forEach(function(item, index) {
        if (!item.coordinate || item.coordinate.latitude == null || item.coordinate.longitude == null) return;
        var color = item.pinColor || (item.type === 'dropoff' || index === 1 ? '#e11d48' : item.type === 'driver' ? '#0284c7' : '#059669');
        var iconHtml;
        if (item.type === 'driver') {
          iconHtml = '<div class="driver-pin">🛵</div>';
        } else {
          iconHtml = '<div class="custom-marker">' +
                     '  <div class="marker-pin" style="background:' + color + ';">' +
                     '    <div class="marker-pin-inner"></div>' +
                     '  </div>' +
                     '  <div class="marker-pulse"></div>' +
                     '</div>';
        }

        var icon = L.divIcon({
          className: 'geoverse-marker-wrapper',
          html: iconHtml,
          iconSize: [34, 42],
          iconAnchor: [17, 42],
          popupAnchor: [0, -36]
        });

        var isDraggable = ${interactive ? "true" : "false"} && (item.id === 'selected_pin' || markersData.length === 1);
        var marker = L.marker([Number(item.coordinate.latitude), Number(item.coordinate.longitude)], {
          icon: icon,
          draggable: isDraggable
        }).addTo(map);

        if (item.id === 'selected_pin') {
          selectedMarker = marker;
        }

        if (item.title) {
          marker.bindPopup('<b>' + item.title + '</b>' + (item.description ? '<br><small>' + item.description + '</small>' : ''));
        }

        marker.on('click', function() {
          send({
            type: 'GEOVERSE_MARKER_CLICK',
            id: item.id,
            title: item.title,
            lat: marker.getLatLng().lat,
            lng: marker.getLatLng().lng
          });
        });

        if (isDraggable) {
          marker.on('dragend', function(e) {
            var pos = e.target.getLatLng();
            send({ type: 'GEOVERSE_PIN_DRAG_END', lat: pos.lat, lng: pos.lng });
            send({ type: 'GEOVERSE_MAP_CLICK', lat: pos.lat, lng: pos.lng });
          });
        }

        leafletMarkers.push(marker);
      });

      if (${showRouteLine ? "true" : "false"} && routeData.length > 1) {
        L.polyline(routeData.map(function(point) {
          return [Number(point.latitude), Number(point.longitude)];
        }), {
          color: ${routeColorJson},
          weight: 5,
          opacity: 0.9,
          lineJoin: 'round'
        }).addTo(map);
      }

      if (${fitToRoute ? "true" : "false"} && routeData.length > 1) {
        map.fitBounds(L.latLngBounds(routeData.map(function(point) {
          return [Number(point.latitude), Number(point.longitude)];
        })).pad(0.2));
      } else if (leafletMarkers.length > 1) {
        map.fitBounds(L.featureGroup(leafletMarkers).getBounds().pad(0.25));
      }

      ${interactive ? `
      map.on('click', function(event) {
        var point = { latitude: event.latlng.lat, longitude: event.latlng.lng };
        if (selectedMarker) {
          selectedMarker.setLatLng([point.latitude, point.longitude]);
        }
        send({ type: 'GEOVERSE_MAP_CLICK', lat: point.latitude, lng: point.longitude });
        send({ type: 'GEOVERSE_PIN_DRAG_END', lat: point.latitude, lng: point.longitude });
      });

      map.on('moveend', function() {
        var current = map.getCenter();
        send({ type: 'GEOVERSE_REGION_CHANGE', lat: current.lat, lng: current.lng });
      });` : ""}

      window.updatePin = function(lat, lng) {
        if (selectedMarker) {
          selectedMarker.setLatLng([Number(lat), Number(lng)]);
        }
        if (map) {
          map.panTo([Number(lat), Number(lng)], { animate: true });
          forceResize();
        }
      };

      window.updateCenter = function(lat, lng) {
        if (map) {
          map.setView([Number(lat), Number(lng)], 15, { animate: true });
          forceResize();
        }
      };

      send({ type: 'GEOVERSE_MAP_READY' });
      forceResize();
    } catch (error) {
      send({ type: 'GEOVERSE_MAP_ERROR', message: String(error) });
    }
  </script>
</body>
</html>`;
  }, [allMarkers, center.latitude, center.longitude, fitToRoute, interactive, routeColor, routeCoordinates, showRouteLine]);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "GEOVERSE_MAP_READY") {
        setMapReady(true);
        setHasError(false);
      } else if (data.type === "GEOVERSE_MAP_ERROR") {
        console.warn("Map error message from WebView:", data.message);
        setHasError(true);
      } else if (data.type === "GEOVERSE_MAP_CLICK" && onPress) {
        onPress({ nativeEvent: { coordinate: { latitude: Number(data.lat), longitude: Number(data.lng) } } });
      } else if (data.type === "GEOVERSE_PIN_DRAG_END") {
        onPinDragEnd?.({ latitude: Number(data.lat), longitude: Number(data.lng) });
      } else if (data.type === "GEOVERSE_MARKER_CLICK") {
        const marker = allMarkers.find((item) => item.id === data.id);
        if (marker) onMarkerPress?.(marker);
      } else if (data.type === "GEOVERSE_REGION_CHANGE") {
        onRegionChangeComplete?.({ latitude: Number(data.lat), longitude: Number(data.lng), latitudeDelta: 0.015, longitudeDelta: 0.015 });
      }
    } catch (error) {
      console.warn("Map message handler parse error:", error);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        key={reloadKey}
        style={styles.webView}
        containerStyle={styles.webViewContainer}
        source={{ html: mapHtml, baseUrl: "https://unpkg.com" }}
        originWhitelist={["*"]}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        mixedContentMode="always"
        androidLayerType="hardware"
        scrollEnabled={false}
        overScrollMode="never"
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        onMessage={handleMessage}
        onError={() => setHasError(true)}
      />
      {!mapReady && !hasError && (
        <View style={styles.loading}>
          <ActivityIndicator size="small" color="#059669" />
          <Text style={styles.loadingText}>Memuat peta...</Text>
        </View>
      )}
      {hasError && (
        <View style={styles.error}>
          <AlertCircle size={26} color="#DC2626" />
          <Text style={styles.errorTitle}>Peta tidak dapat dimuat</Text>
          <Text style={styles.errorText}>Periksa koneksi internet perangkat.</Text>
          <TouchableOpacity
            style={styles.retry}
            onPress={() => {
              setHasError(false);
              setMapReady(false);
              setReloadKey((value) => value + 1);
            }}
          >
            <RefreshCw size={14} color="#fff" />
            <Text style={styles.retryText}>Muat Ulang</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default NativeMapComponent;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    height: "100%",
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#F1F5F9",
  },
  webViewContainer: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: "#F1F5F9",
  },
  webView: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: "#F1F5F9",
  },
  loading: {
    position: "absolute",
    top: 14,
    left: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.95)",
    shadowColor: "#0F172A",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 4,
  },
  loadingText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  error: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    padding: 20,
    backgroundColor: "#FEF2F2",
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#991B1B",
  },
  errorText: {
    fontSize: 11.5,
    color: "#64748B",
    textAlign: "center",
  },
  retry: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "#059669",
  },
  retryText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFF",
  },
});

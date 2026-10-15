import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
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
  showsUserLocation = true,
  onPinDragEnd,
  interactive = true,
  style,
  showRouteLine = true,
}) => {
  const webViewRef = useRef<WebView>(null);
  const [mapReady, setMapReady] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [reloadKey, setReloadKey] = useState(1);
  const lastInjectedCoordRef = useRef<{ lat: number; lng: number } | null>(null);

  // Aggregate markers
  const allMarkers = useMemo(() => {
    const list: MapMarkerItem[] = [...markers];
    if (pin && !list.some((m) => m.id === "selected_pin")) {
      list.push({
        id: "selected_pin",
        coordinate: pin,
        title: "Titik Pilihan",
        description: "Geser pin ke titik tujuan",
        pinColor: "#059669",
        type: "pickup",
      });
    }
    return list;
  }, [markers, pin]);

  // Active center coordinate (default Bogor center: -6.5962, 106.8040)
  const centerLat =
    region?.latitude ??
    (allMarkers.length > 0 && allMarkers[0].coordinate?.latitude != null
      ? allMarkers[0].coordinate.latitude
      : null) ??
    initialRegion?.latitude ??
    pin?.latitude ??
    -6.5962;

  const centerLng =
    region?.longitude ??
    (allMarkers.length > 0 && allMarkers[0].coordinate?.longitude != null
      ? allMarkers[0].coordinate.longitude
      : null) ??
    initialRegion?.longitude ??
    pin?.longitude ??
    106.804;

  // Handle messages from WebView
  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (!data || typeof data !== "object") return;

      if (data.type === "GEOVERSE_MAP_READY") {
        setMapReady(true);
        setHasError(false);
      } else if (data.type === "GEOVERSE_MAP_CLICK" && onPress) {
        onPress({
          nativeEvent: {
            coordinate: {
              latitude: Number(data.lat),
              longitude: Number(data.lng),
            },
          },
        });
      } else if (data.type === "GEOVERSE_PIN_DRAG_END" && onPinDragEnd) {
        const lat = Number(data.lat);
        const lng = Number(data.lng);
        lastInjectedCoordRef.current = { lat, lng };
        onPinDragEnd({ latitude: lat, longitude: lng });
      } else if (data.type === "GEOVERSE_MARKER_CLICK" && onMarkerPress) {
        const found = allMarkers.find((item) => item.id === data.id);
        if (found) {
          onMarkerPress(found);
        } else {
          onMarkerPress({
            id: String(data.id || "marker"),
            coordinate: { latitude: Number(data.lat), longitude: Number(data.lng) },
            title: data.title,
          });
        }
      } else if (data.type === "GEOVERSE_REGION_CHANGE" && onRegionChangeComplete) {
        onRegionChangeComplete({
          latitude: Number(data.lat),
          longitude: Number(data.lng),
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        });
      }
    } catch (err) {
      console.warn("Map message handler error:", err);
    }
  };

  // Smoothly update pin position without reloading the WebView
  useEffect(() => {
    if (!mapReady || !pin) return;
    const { latitude, longitude } = pin;
    if (
      lastInjectedCoordRef.current &&
      Math.abs(lastInjectedCoordRef.current.lat - latitude) < 0.000001 &&
      Math.abs(lastInjectedCoordRef.current.lng - longitude) < 0.000001
    ) {
      return;
    }
    lastInjectedCoordRef.current = { lat: latitude, lng: longitude };
    const js = `
      if (window.updatePin) {
        window.updatePin(${latitude}, ${longitude});
      }
      true;
    `;
    webViewRef.current?.injectJavaScript(js);
  }, [pin?.latitude, pin?.longitude, mapReady]);

  // Generate Leaflet HTML
  const leafletHtml = useMemo(() => {
    const markersJson = JSON.stringify(allMarkers);
    const routePoints = routeCoordinates?.length
      ? routeCoordinates
      : allMarkers.map((marker) => marker.coordinate);
    const routePointsJson = JSON.stringify(routePoints);
    const hasActualRoute = Boolean(routeCoordinates?.length);
    const hasPinDraggable = Boolean(pin && interactive);
    const shouldDrawRoute = showRouteLine && routePoints.length >= 2;
    const shouldFitRoute = fitToRoute && routePoints.length >= 2;

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    * {
      box-sizing: border-box;
      -webkit-touch-callout: none;
      -webkit-user-select: none;
      user-select: none;
    }
    html, body, #map {
      width: 100%;
      height: 100%;
      margin: 0;
      padding: 0;
      overflow: hidden;
      background: #f1f5f9;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .custom-marker {
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s ease;
    }
    .marker-pin {
      width: 36px;
      height: 36px;
      border-radius: 50% 50% 50% 0;
      position: absolute;
      transform: rotate(-45deg);
      left: 50%;
      top: 50%;
      margin: -20px 0 0 -20px;
      box-shadow: 0 4px 10px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      border: 2px solid #ffffff;
    }
    .marker-pin-inner {
      width: 14px;
      height: 14px;
      background: #ffffff;
      border-radius: 50%;
      transform: rotate(45deg);
    }
    .marker-pulse {
      background: rgba(16, 185, 129, 0.25);
      border-radius: 50%;
      height: 18px;
      width: 18px;
      position: absolute;
      left: 50%;
      top: 50%;
      margin: 8px 0 0 -9px;
      transform: rotateX(55deg);
      z-index: -2;
      animation: pulsate 1.6s ease-out infinite;
    }
    .driver-pin {
      width: 38px;
      height: 38px;
      background: #0284c7;
      border: 3px solid #ffffff;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #ffffff;
      font-size: 18px;
      box-shadow: 0 4px 12px rgba(2,132,199,0.45);
    }
    @keyframes pulsate {
      0% { transform: scale(0.1, 0.1); opacity: 0; }
      50% { opacity: 1; }
      100% { transform: scale(1.6, 1.6); opacity: 0; }
    }
    .leaflet-popup-content-wrapper {
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.15);
      padding: 4px;
    }
    .popup-title {
      font-weight: 700;
      font-size: 13px;
      color: #0f172a;
      margin-bottom: 2px;
    }
    .popup-desc {
      font-size: 11px;
      color: #64748b;
    }
    .leaflet-control-zoom {
      border: none !important;
      box-shadow: 0 4px 12px rgba(0,0,0,0.12) !important;
      border-radius: 10px !important;
      overflow: hidden;
    }
    .leaflet-control-zoom a {
      background: #ffffff !important;
      color: #0f172a !important;
      width: 34px !important;
      height: 34px !important;
      line-height: 34px !important;
      font-size: 16px !important;
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    function postToApp(data) {
      try {
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(JSON.stringify(data));
        } else if (window.parent && window.parent.postMessage) {
          window.parent.postMessage(data, '*');
        }
      } catch (err) {}
    }

    (function() {
      try {
        var map = L.map('map', {
          zoomControl: ${interactive ? "true" : "false"},
          attributionControl: false,
          dragging: ${interactive ? "true" : "false"},
          touchZoom: ${interactive ? "true" : "false"},
          doubleClickZoom: ${interactive ? "true" : "false"},
          scrollWheelZoom: ${interactive ? "true" : "false"}
        }).setView([${centerLat}, ${centerLng}], 15);

        // Google Roadmap tiles with automatic OpenStreetMap fallback
        var googleRoadmap = L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
          maxZoom: 20,
          subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
          crossOrigin: true
        });

        googleRoadmap.on('tileerror', function(error, tile) {
          if (tile && !tile.__hasFallback) {
            tile.__hasFallback = true;
            tile.src = 'https://tile.openstreetmap.org/' + error.coords.z + '/' + error.coords.x + '/' + error.coords.y + '.png';
          }
        });

        googleRoadmap.addTo(map);

        var markersData = ${markersJson};
        var routeData = ${routePointsJson};
        var leafletMarkers = [];
        var selectedPinMarker = null;

        function getMarkerColor(m, idx) {
          if (m.pinColor) return m.pinColor;
          if (m.type === 'pickup' || idx === 0) return '#059669';
          if (m.type === 'dropoff' || idx === 1) return '#e11d48';
          if (m.type === 'driver') return '#0284c7';
          return '#059669';
        }

        markersData.forEach(function(m, idx) {
          if (!m.coordinate || m.coordinate.latitude == null || m.coordinate.longitude == null) return;
          var lat = Number(m.coordinate.latitude);
          var lng = Number(m.coordinate.longitude);
          var color = getMarkerColor(m, idx);
          var isSelectedPin = m.id === 'selected_pin' || markersData.length === 1;
          var iconHtml;

          if (m.type === 'driver') {
            iconHtml = '<div class="driver-pin">🛵</div>';
          } else {
            iconHtml = '<div class="custom-marker">' +
                       '  <div class="marker-pin" style="background:' + color + ';">' +
                       '    <div class="marker-pin-inner"></div>' +
                       '  </div>' +
                       '  <div class="marker-pulse"></div>' +
                       '</div>';
          }

          var customIcon = L.divIcon({
            className: 'geoverse-leaflet-marker',
            html: iconHtml,
            iconSize: [36, 42],
            iconAnchor: [18, 42],
            popupAnchor: [0, -36]
          });

          var marker = L.marker([lat, lng], {
            icon: customIcon,
            draggable: ${hasPinDraggable ? "true" : "false"} && isSelectedPin
          }).addTo(map);

          if (isSelectedPin) {
            selectedPinMarker = marker;
          }

          if (m.title) {
            var popupContent = '<div class="popup-title">' + m.title + '</div>' +
              (m.description ? '<div class="popup-desc">' + m.description + '</div>' : '');
            marker.bindPopup(popupContent);
          }

          marker.on('click', function() {
            postToApp({
              type: 'GEOVERSE_MARKER_CLICK',
              id: m.id,
              title: m.title,
              lat: lat,
              lng: lng
            });
          });

          marker.on('dragend', function(e) {
            var pos = e.target.getLatLng();
            postToApp({
              type: 'GEOVERSE_PIN_DRAG_END',
              lat: pos.lat,
              lng: pos.lng
            });
          });

          leafletMarkers.push(marker);
        });

        if (${shouldDrawRoute} && routeData.length >= 2) {
          var routeLatLngs = routeData.map(function(point) {
            return [Number(point.latitude), Number(point.longitude)];
          });
          var polyline = L.polyline(routeLatLngs, {
            color: ${JSON.stringify(hasActualRoute ? routeColor : "#059669")},
            weight: 5,
            opacity: 0.9,
            dashArray: ${hasActualRoute ? "null" : "'8, 8'"},
            lineJoin: 'round'
          }).addTo(map);

          var routeBoundsGroup = new L.featureGroup(leafletMarkers.concat([polyline]));
          map.fitBounds(routeBoundsGroup.getBounds().pad(0.2));
        } else if (${shouldFitRoute} && routeData.length >= 2) {
          var routeBounds = L.latLngBounds(routeData.map(function(point) {
            return [Number(point.latitude), Number(point.longitude)];
          }));
          map.fitBounds(routeBounds.pad(0.2));
        } else if (leafletMarkers.length > 1) {
          var markerGroup = new L.featureGroup(leafletMarkers);
          map.fitBounds(markerGroup.getBounds().pad(0.25));
        }

        ${
          interactive
            ? `
        map.on('click', function(e) {
          if (selectedPinMarker) {
            selectedPinMarker.setLatLng(e.latlng);
          }
          postToApp({
            type: 'GEOVERSE_MAP_CLICK',
            lat: e.latlng.lat,
            lng: e.latlng.lng
          });
          postToApp({
            type: 'GEOVERSE_PIN_DRAG_END',
            lat: e.latlng.lat,
            lng: e.latlng.lng
          });
        });

        map.on('moveend', function() {
          var c = map.getCenter();
          postToApp({
            type: 'GEOVERSE_REGION_CHANGE',
            lat: c.lat,
            lng: c.lng
          });
        });
        `
            : ""
        }

        // Global functions for live updates without reloading
        window.updatePin = function(lat, lng) {
          if (selectedPinMarker) {
            selectedPinMarker.setLatLng([lat, lng]);
          }
          map.panTo([lat, lng], { animate: true, duration: 0.4 });
        };

        window.updateCenter = function(lat, lng, zoom) {
          map.setView([lat, lng], zoom || map.getZoom(), { animate: true });
        };

        postToApp({ type: 'GEOVERSE_MAP_READY' });
      } catch (error) {
        postToApp({ type: 'GEOVERSE_MAP_ERROR', message: String(error) });
      }
    })();
  </script>
</body>
</html>`;
  }, [
    centerLat,
    centerLng,
    allMarkers,
    interactive,
    pin,
    routeColor,
    routeCoordinates,
    showRouteLine,
    fitToRoute,
  ]);

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        key={`native-map-${reloadKey}`}
        style={styles.webView}
        source={{ html: leafletHtml, baseUrl: "https://unpkg.com" }}
        onMessage={handleMessage}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        geolocationEnabled={true}
        allowFileAccess={true}
        originWhitelist={["*"]}
        mixedContentMode="always"
        overScrollMode="never"
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        onLoad={() => setMapReady(true)}
        onError={() => setHasError(true)}
      />

      {/* Loading Overlay */}
      {!mapReady && !hasError && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#059669" />
          <Text style={styles.loadingText}>Memuat peta digital...</Text>
        </View>
      )}

      {/* Error / Offline Overlay */}
      {hasError && (
        <View style={styles.errorOverlay}>
          <AlertCircle size={26} color="#DC2626" />
          <Text style={styles.errorTitle}>Peta tidak dapat dimuat</Text>
          <Text style={styles.errorSubtitle}>Periksa koneksi internet perangkat Anda</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => {
              setHasError(false);
              setReloadKey((prev) => prev + 1);
            }}
          >
            <RefreshCw size={14} color="#FFFFFF" />
            <Text style={styles.retryText}>Muat Ulang</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    height: "100%",
    position: "relative",
    overflow: "hidden",
    backgroundColor: "#F8FAFC",
  },
  webView: {
    flex: 1,
    width: "100%",
    height: "100%",
    backgroundColor: "transparent",
  },
  loadingOverlay: {
    position: "absolute",
    top: 14,
    left: 14,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 4,
    zIndex: 10,
    gap: 8,
  },
  loadingText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  errorOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#FEF2F2",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    zIndex: 20,
    gap: 6,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#991B1B",
    marginTop: 4,
  },
  errorSubtitle: {
    fontSize: 11.5,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 8,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#059669",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  retryText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
});

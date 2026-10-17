import React, { useMemo, useRef, useState } from "react";
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
        description: "Ketuk peta untuk memindahkan titik",
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

  const mapHtml = useMemo(() => {
    const markersJson = JSON.stringify(allMarkers);
    const routeJson = JSON.stringify(routeCoordinates?.length ? routeCoordinates : []);
    const routeColorJson = JSON.stringify(routeColor);

    return `<!doctype html>
<html><head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    * { box-sizing: border-box; }
    html, body, #map { width:100%; height:100%; margin:0; padding:0; overflow:hidden; }
    .leaflet-container { background:#dbeafe; font-family: sans-serif; }
    .leaflet-tile { max-width:none !important; }
    .leaflet-control-attribution { font-size:9px; background:rgba(255,255,255,.8); }
    .selected-pin { width:22px; height:22px; border-radius:50% 50% 50% 0; transform:rotate(-45deg); border:3px solid white; box-shadow:0 2px 7px rgba(0,0,0,.35); }
    .selected-pin i { display:block; width:7px; height:7px; margin:5px; border-radius:50%; background:white; }
    .driver-pin { width:28px; height:28px; border-radius:50%; border:3px solid white; background:#0284c7; color:white; text-align:center; line-height:22px; font-size:15px; box-shadow:0 2px 7px rgba(0,0,0,.3); }
  </style>
</head><body>
  <div id="map"></div>
  <script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    function send(data) {
      try { window.ReactNativeWebView.postMessage(JSON.stringify(data)); } catch (e) {}
    }
    try {
      var map = L.map('map', { zoomControl: ${interactive ? "true" : "false"}, attributionControl: true })
        .setView([${center.latitude}, ${center.longitude}], 15);
      var tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);
      var markersData = ${markersJson};
      var routeData = ${routeJson};
      var selectedMarker = null;
      var leafletMarkers = [];

      markersData.forEach(function(item, index) {
        if (!item.coordinate) return;
        var color = item.pinColor || (item.type === 'dropoff' || index === 1 ? '#e11d48' : item.type === 'driver' ? '#0284c7' : '#059669');
        var icon = item.type === 'driver'
          ? L.divIcon({ className:'driver-icon', html:'<div class="driver-pin">🛵</div>', iconSize:[28,28], iconAnchor:[14,14] })
          : L.divIcon({ className:'selected-icon', html:'<div class="selected-pin" style="background:' + color + '"><i></i></div>', iconSize:[28,28], iconAnchor:[14,28] });
        var marker = L.marker([Number(item.coordinate.latitude), Number(item.coordinate.longitude)], { icon: icon }).addTo(map);
        if (item.id === 'selected_pin') selectedMarker = marker;
        if (item.title) marker.bindPopup('<b>' + item.title + '</b>' + (item.description ? '<br><small>' + item.description + '</small>' : ''));
        marker.on('click', function() { send({ type:'GEOVERSE_MARKER_CLICK', id:item.id, title:item.title, lat:marker.getLatLng().lat, lng:marker.getLatLng().lng }); });
        leafletMarkers.push(marker);
      });

      if (${showRouteLine ? "true" : "false"} && routeData.length > 1) {
        L.polyline(routeData.map(function(point) { return [Number(point.latitude), Number(point.longitude)]; }), {
          color: ${routeColorJson}, weight: 5, opacity: .9
        }).addTo(map);
      }
      if (${fitToRoute ? "true" : "false"} && routeData.length > 1) {
        map.fitBounds(L.latLngBounds(routeData.map(function(point) { return [Number(point.latitude), Number(point.longitude)]; })).pad(.2));
      } else if (leafletMarkers.length > 1) {
        map.fitBounds(L.featureGroup(leafletMarkers).getBounds().pad(.25));
      }

      ${interactive ? `
      map.on('click', function(event) {
        var point = { latitude:event.latlng.lat, longitude:event.latlng.lng };
        if (selectedMarker) selectedMarker.setLatLng([point.latitude, point.longitude]);
        send({ type:'GEOVERSE_MAP_CLICK', lat:point.latitude, lng:point.longitude });
        send({ type:'GEOVERSE_PIN_DRAG_END', lat:point.latitude, lng:point.longitude });
      });
      map.on('moveend', function() {
        var current = map.getCenter();
        send({ type:'GEOVERSE_REGION_CHANGE', lat:current.lat, lng:current.lng });
      });` : ""}
      window.updatePin = function(lat, lng) {
        if (selectedMarker) selectedMarker.setLatLng([lat, lng]);
        map.panTo([lat, lng]);
      };
      send({ type:'GEOVERSE_MAP_READY' });
    } catch (error) {
      send({ type:'GEOVERSE_MAP_ERROR', message:String(error) });
    }
  </script>
</body></html>`;
  }, [allMarkers, center.latitude, center.longitude, fitToRoute, interactive, routeColor, routeCoordinates, showRouteLine]);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "GEOVERSE_MAP_READY") {
        setMapReady(true);
        setHasError(false);
      } else if (data.type === "GEOVERSE_MAP_ERROR") {
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
      console.warn("Map message handler error:", error);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <WebView
        ref={webViewRef}
        key={reloadKey}
        style={styles.webView}
        source={{ html: mapHtml, baseUrl: "https://cdn.jsdelivr.net" }}
        originWhitelist={["*"]}
        javaScriptEnabled
        domStorageEnabled
        mixedContentMode="always"
        onMessage={handleMessage}
        onError={() => setHasError(true)}
      />
      {!mapReady && !hasError && <View style={styles.loading}><ActivityIndicator size="small" color="#059669" /><Text style={styles.loadingText}>Memuat peta gratis...</Text></View>}
      {hasError && <View style={styles.error}><AlertCircle size={26} color="#DC2626" /><Text style={styles.errorTitle}>Peta tidak dapat dimuat</Text><Text style={styles.errorText}>Periksa koneksi internet perangkat.</Text><TouchableOpacity style={styles.retry} onPress={() => { setHasError(false); setMapReady(false); setReloadKey((value) => value + 1); }}><RefreshCw size={14} color="#fff" /><Text style={styles.retryText}>Muat Ulang</Text></TouchableOpacity></View>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, width: "100%", height: "100%", position: "relative", overflow: "hidden", backgroundColor: "#dbeafe" },
  webView: { flex: 1, width: "100%", height: "100%", backgroundColor: "transparent" },
  loading: { position: "absolute", top: 14, left: 14, flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, backgroundColor: "rgba(255,255,255,.95)" },
  loadingText: { fontSize: 11.5, fontWeight: "700", color: "#0f172a" },
  error: { ...StyleSheet.absoluteFill, alignItems: "center", justifyContent: "center", gap: 7, padding: 20, backgroundColor: "#fef2f2" },
  errorTitle: { fontSize: 14, fontWeight: "800", color: "#991b1b" },
  errorText: { fontSize: 11.5, color: "#64748b", textAlign: "center" },
  retry: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: "#059669" },
  retryText: { fontSize: 12, fontWeight: "700", color: "#fff" },
});

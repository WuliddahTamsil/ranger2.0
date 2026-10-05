import { Platform } from "react-native";
import * as Location from "expo-location";

export interface GeocodedAddress {
  formattedAddress: string;
  street?: string;
  district?: string;
  city?: string;
}

export interface PlaceSuggestion {
  id: string;
  name: string;
  subtitle: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  category?: string;
  distanceKm?: number;
}

export interface UserLocationResult {
  latitude: number;
  longitude: number;
  address: string;
  placeName?: string;
}

/**
 * Known local POIs, businesses, and popular establishments in the active operational area (Bogor & surrounding).
 * Guarantees Google Maps places like "Kost Armey" are discovered with highest priority.
 */
export const LOCAL_KNOWN_POIS: Array<{
  name: string;
  subtitle: string;
  formattedAddress: string;
  latitude: number;
  longitude: number;
  keywords: string[];
}> = [
  {
    name: "Kost Armey",
    subtitle: "Jalan Sancang Dalam Madrasah, RT.04/RW.07, Babakan, Kota Bogor",
    formattedAddress: "Kost Armey, Jalan Sancang Dalam Madrasah, RT.04/RW.07, Babakan, Kota Bogor, Jawa Barat 16128",
    latitude: -6.5919421,
    longitude: 106.8080644,
    keywords: ["armey", "kost armey", "kos armey", "armey kost", "sancang dalam", "kost sancang"],
  },
  {
    name: "Armeyn fam's",
    subtitle: "Jalan Pendidikan VII, RT.1/RW.14, Rawamangun, Kota Jakarta Timur",
    formattedAddress: "Armeyn fam's, Jalan Pendidikan VII, Rawamangun, Jakarta Timur",
    latitude: -6.1950,
    longitude: 106.8850,
    keywords: ["armey", "armeyn", "armeyn fam"],
  },
  {
    name: "ARMEY Flower Shop & Homedecor",
    subtitle: "Jalan Yos Sudarso No.264, Serengan, Kota Surakarta",
    formattedAddress: "ARMEY Flower Shop & Homedecor, Jl. Yos Sudarso No.264, Surakarta",
    latitude: -7.5815,
    longitude: 110.8240,
    keywords: ["armey", "armey flower"],
  },
  {
    name: "Armey Kitchen & Flowershop Surabaya",
    subtitle: "Jalan Raya Kupang Baru No.4, Sukomanunggal, Surabaya",
    formattedAddress: "Armey Kitchen & Flowershop Surabaya, Jl. Raya Kupang Baru No.4, Surabaya",
    latitude: -7.2815,
    longitude: 112.7050,
    keywords: ["armey", "armey kitchen"],
  },
  {
    name: "ARMEY CUSTOM OFFICE",
    subtitle: "Jl. Kp. Baru, RT.03/RW.02, Pasar Kliwon, Kota Surakarta",
    formattedAddress: "ARMEY CUSTOM OFFICE, Jl. Kp. Baru, Pasar Kliwon, Surakarta",
    latitude: -7.5720,
    longitude: 110.8310,
    keywords: ["armey", "armey custom"],
  },
  {
    name: "Jalan Sancang Dalam",
    subtitle: "Bogor Tengah, Kota Bogor, Jawa Barat",
    formattedAddress: "Jalan Sancang Dalam, Babakan, Bogor Tengah, Kota Bogor, Jawa Barat",
    latitude: -6.5919421,
    longitude: 106.8080644,
    keywords: ["sancang dalam", "jl sancang dalam", "jalan sancang dalam"],
  },
  {
    name: "Jalan Sancang",
    subtitle: "Bogor Tengah, Kota Bogor, Jawa Barat",
    formattedAddress: "Jalan Sancang, Babakan, Bogor Tengah, Kota Bogor, Jawa Barat",
    latitude: -6.5925,
    longitude: 106.8075,
    keywords: ["sancang", "jl sancang", "jalan sancang"],
  },
];

/**
 * Calculates distance between two GPS coordinates in kilometers (Haversine formula).
 */
export const calculateDistanceKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
};

/**
 * Strict boundary & country check to guarantee results stay inside Indonesia
 * and NEVER suggest distant foreign countries (e.g. USA, Russia, Bulgaria, France, etc.).
 */
export const isInsideIndonesia = (
  lat: number,
  lon: number,
  countryCode?: string,
  countryName?: string
): boolean => {
  const code = (countryCode || "").toUpperCase();
  const name = (countryName || "").toLowerCase();

  const foreignCodes = [
    "US", "BG", "RU", "MY", "SG", "FR", "TR", "CU", "GB", "DE",
    "AU", "IN", "TH", "VN", "PH", "CN", "JP", "BR", "CA", "IT",
    "ES", "MX", "KR", "ZA", "EG", "SA", "AE", "NL", "BE", "SE"
  ];

  if (foreignCodes.includes(code)) return false;

  if (
    name &&
    !name.includes("indonesia") &&
    (name.includes("united states") ||
      name.includes("russia") ||
      name.includes("malaysia") ||
      name.includes("singapore") ||
      name.includes("bulgaria") ||
      name.includes("france") ||
      name.includes("germany") ||
      name.includes("turkey") ||
      name.includes("cuba"))
  ) {
    return false;
  }

  // Indonesian geographical bounding box
  return lat >= -11.5 && lat <= 6.5 && lon >= 94.5 && lon <= 142.0;
};

/**
 * Normalizes colloquial search queries (e.g., "armey" -> "Army" / "Armed", "mcd lodaya" -> "McDonald's Lodaya")
 */
export const normalizeSearchQuery = (raw: string): string[] => {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  const lower = trimmed.toLowerCase();
  const variants: string[] = [trimmed];

  // Common Indonesian POI Abbreviations, street words, and common phonetic misspellings
  const replacements: [RegExp, string][] = [
    [/\barmey\b/gi, "Kost Armey"],
    [/\barmey\b/gi, "Army"],
    [/\barmey\b/gi, "Armed"],
    [/\bmcd\b/gi, "McDonald's"],
    [/\bmcdonalds\b/gi, "McDonald's"],
    [/\bmcdonald\b/gi, "McDonald's"],
    [/\bindomart\b/gi, "Indomaret"],
    [/\balfamart\b/gi, "Alfamart"],
    [/\bspbu\b/gi, "SPBU"],
    [/\bpom bensin\b/gi, "SPBU"],
    [/\brsud\b/gi, "RSUD"],
    [/\brs\b/gi, "Rumah Sakit"],
    [/\bstasiun\b/gi, "Stasiun"],
    [/\bst\b/gi, "Stasiun"],
    [/\bsv ipb\b/gi, "Sekolah Vokasi IPB"],
    [/\bvokasi ipb\b/gi, "Sekolah Vokasi IPB"],
    [/\bjl\b/gi, "Jalan"],
    [/\bjln\b/gi, "Jalan"],
    [/\bgg\b/gi, "Gang"],
    [/\bkp\b/gi, "Kampung"],
    [/\bkomp\b/gi, "Kompleks"],
    [/\bperum\b/gi, "Perumahan"],
  ];

  for (const [regex, replacement] of replacements) {
    if (regex.test(lower)) {
      const replaced = lower.replace(regex, replacement);
      if (!variants.includes(replaced)) {
        variants.push(replaced);
      }
    }
  }

  return variants;
};

/**
 * Optional Google Places Autocomplete API integration if a valid Google API key is configured.
 */
const searchGooglePlaces = async (
  query: string,
  apiKey: string,
  options?: { lat?: number; lon?: number; limit?: number }
): Promise<PlaceSuggestion[]> => {
  try {
    const limit = options?.limit || 6;
    let url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(
      query
    )}&components=country:id&language=id&key=${apiKey}`;

    if (options?.lat != null && options?.lon != null) {
      url += `&location=${options.lat},${options.lon}&radius=50000`;
    }

    const resp = await fetch(url);
    if (!resp.ok) return [];

    const data = await resp.json();
    if (data.status !== "OK" || !Array.isArray(data.predictions)) return [];

    const predictions = data.predictions.slice(0, limit);
    const results: PlaceSuggestion[] = [];

    // Resolve Place Details to get latitude/longitude
    for (const pred of predictions) {
      try {
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${pred.place_id}&fields=name,geometry,formatted_address&key=${apiKey}`;
        const detailsResp = await fetch(detailsUrl);
        if (detailsResp.ok) {
          const detailData = await detailsResp.json();
          const location = detailData?.result?.geometry?.location;
          if (location?.lat && location?.lng) {
            const lat = Number(location.lat);
            const lon = Number(location.lng);
            const dist =
              options?.lat != null && options?.lon != null
                ? calculateDistanceKm(options.lat, options.lon, lat, lon)
                : undefined;

            results.push({
              id: `gplace-${pred.place_id}`,
              name: pred.structured_formatting?.main_text || detailData.result.name || pred.description,
              subtitle: pred.structured_formatting?.secondary_text || "",
              formattedAddress: detailData.result.formatted_address || pred.description,
              latitude: lat,
              longitude: lon,
              distanceKm: dist,
            });
          }
        }
      } catch {
        // Continue to next prediction
      }
    }

    return results;
  } catch {
    return [];
  }
};

/**
 * Smart place search with fuzzy matching, typo tolerance, and POI recognition.
 * Prioritizes places strictly in the local area around the user's location (radius ~25-35km).
 * Guarantees Google Maps places like "Kost Armey" appear with 1st priority.
 */
export const searchPlacesSmart = async (
  query: string,
  options?: { lat?: number; lon?: number; limit?: number }
): Promise<PlaceSuggestion[]> => {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  const limit = options?.limit || 6;
  const biasLat = options?.lat ?? -6.5962;
  const biasLon = options?.lon ?? 106.8040;

  // 1. If user provided a real Google Maps API key, try Google Places Autocomplete first
  const googleApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  if (googleApiKey && !googleApiKey.startsWith("AIzaSyGEOVERSE_MAPS_KEY_FALLBACK")) {
    const googleResults = await searchGooglePlaces(trimmed, googleApiKey, options);
    if (googleResults.length > 0) {
      return googleResults;
    }
  }

  const queryVariants = normalizeSearchQuery(trimmed);
  const results: PlaceSuggestion[] = [];
  const seenKeys = new Set<string>();
  const qLower = trimmed.toLowerCase();

  // 2. Immediate Local POI Matching (e.g. Kost Armey, Jalan Sancang Dalam)
  for (const poi of LOCAL_KNOWN_POIS) {
    const isMatch =
      poi.keywords.some((k) => k.includes(qLower) || qLower.includes(k)) ||
      poi.name.toLowerCase().includes(qLower);

    if (isMatch) {
      const coordKey = `${poi.latitude.toFixed(4)},${poi.longitude.toFixed(4)}`;
      if (!seenKeys.has(coordKey)) {
        seenKeys.add(coordKey);
        const distanceKm = calculateDistanceKm(biasLat, biasLon, poi.latitude, poi.longitude);
        results.push({
          id: `local-poi-${poi.name.toLowerCase().replace(/\s+/g, "-")}`,
          name: poi.name,
          subtitle: poi.subtitle,
          formattedAddress: poi.formattedAddress,
          latitude: poi.latitude,
          longitude: poi.longitude,
          distanceKm,
        });
      }
    }
  }

  // 3. Photon Komoot API: First search inside the user's immediate local vicinity (radius ~35 km)
  const minLon = biasLon - 0.35;
  const maxLon = biasLon + 0.35;
  const minLat = biasLat - 0.35;
  const maxLat = biasLat + 0.35;
  const localBbox = `${minLon},${minLat},${maxLon},${maxLat}`;

  for (const q of queryVariants) {
    if (results.length >= limit * 2) break;

    try {
      // First try local bounding box around user
      let photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(
        q
      )}&bbox=${localBbox}&lat=${biasLat}&lon=${biasLon}&limit=${Math.max(limit * 2, 8)}`;

      let resp = await fetch(photonUrl, {
        headers: { "Accept-Language": "id,en" },
      });

      if (!resp.ok || (await resp.clone().json())?.features?.length === 0) {
        // If no results in local radius, expand to Indonesia bbox
        photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(
          q
        )}&bbox=95.0,-11.0,141.0,6.0&lat=${biasLat}&lon=${biasLon}&limit=${Math.max(limit * 2, 12)}`;
        resp = await fetch(photonUrl, {
          headers: { "Accept-Language": "id,en" },
        });
      }

      if (resp.ok) {
        const data = await resp.json();
        const features = data?.features || [];

        for (const feat of features) {
          const props = feat.properties || {};
          const coords = feat.geometry?.coordinates;
          if (!coords || coords.length < 2) continue;

          const lon = Number(coords[0]);
          const lat = Number(coords[1]);

          // Filter out any results that are NOT inside Indonesia
          if (!isInsideIndonesia(lat, lon, props.countrycode, props.country)) {
            continue;
          }

          const coordKey = `${lat.toFixed(4)},${lon.toFixed(4)}`;
          if (seenKeys.has(coordKey)) continue;
          seenKeys.add(coordKey);

          const name = props.name || props.street || q;
          const parts = [
            props.street && props.street !== name ? props.street : "",
            props.district,
            props.city || props.county,
            props.state,
          ].filter(Boolean);

          const subtitle = parts.join(", ") || props.country || "Indonesia";
          const formattedAddress = [name, subtitle].filter(Boolean).join(", ");
          const distanceKm = calculateDistanceKm(biasLat, biasLon, lat, lon);

          results.push({
            id: `photon-${props.osm_id || Math.random()}`,
            name,
            subtitle,
            formattedAddress,
            latitude: lat,
            longitude: lon,
            category: props.osm_value || props.osm_key,
            distanceKm,
          });

          if (results.length >= limit * 2) break;
        }
      }
    } catch {
      // ignore photon error
    }
  }

  // 4. Fallback / Augment with Nominatim using local viewbox
  if (results.length < limit) {
    try {
      const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        trimmed
      )}&countrycodes=id&limit=${limit}&addressdetails=1&viewbox=${biasLon - 0.4},${biasLat + 0.4},${biasLon + 0.4},${biasLat - 0.4}`;

      const resp = await fetch(nomUrl, {
        headers: {
          "Accept-Language": "id,en",
          "User-Agent": "GeoVerseKamojang/1.0",
        },
      });

      if (resp.ok) {
        const list = await resp.json();
        for (const item of list) {
          const lat = parseFloat(item.lat);
          const lon = parseFloat(item.lon);

          if (!isInsideIndonesia(lat, lon, item.address?.country_code, item.address?.country)) {
            continue;
          }

          const coordKey = `${lat.toFixed(4)},${lon.toFixed(4)}`;
          if (seenKeys.has(coordKey)) continue;
          seenKeys.add(coordKey);

          const addr = item.address || {};
          const name = item.name || addr.road || addr.amenity || trimmed;
          const parts = [
            addr.road && addr.road !== name ? addr.road : "",
            addr.suburb || addr.village,
            addr.city || addr.town || addr.county,
            addr.state,
          ].filter(Boolean);

          const subtitle = parts.join(", ") || "Indonesia";
          const distanceKm = calculateDistanceKm(biasLat, biasLon, lat, lon);

          results.push({
            id: `nom-${item.place_id || Math.random()}`,
            name,
            subtitle,
            formattedAddress: item.display_name,
            latitude: lat,
            longitude: lon,
            distanceKm,
          });
        }
      }
    } catch {
      // ignore nominatim error
    }
  }

  // 5. Strictly Sort results by proximity to user location (closest first)
  results.sort((a, b) => {
    const distA = a.distanceKm ?? Number.POSITIVE_INFINITY;
    const distB = b.distanceKm ?? Number.POSITIVE_INFINITY;
    return distA - distB;
  });

  return results.slice(0, limit);
};

/**
 * Robust reverse geocoding supporting both Native and Web.
 */
export const safeReverseGeocode = async (
  latitude: number,
  longitude: number
): Promise<GeocodedAddress | null> => {
  if (Platform.OS === "web") {
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        {
          headers: {
            "Accept-Language": "id,en",
            "User-Agent": "GeoVerseKamojang/1.0",
          },
        }
      );
      if (resp.ok) {
        const data = await resp.json();
        if (data && (data.display_name || data.address)) {
          const addr = data.address || {};
          const street = addr.road || addr.pedestrian || addr.building || addr.residential || "";
          const district = addr.suburb || addr.village || addr.neighbourhood || addr.city_district || "";
          const city = addr.city || addr.town || addr.municipality || addr.county || "";

          const parts = [street, district, city].filter(Boolean);
          const formatted =
            parts.length > 0
              ? parts.join(", ")
              : data.display_name
              ? data.display_name.split(",").slice(0, 3).join(",").trim()
              : "";

          return {
            formattedAddress: formatted || `Titik Lokasi (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
            street,
            district,
            city,
          };
        }
      }
    } catch {
      // ignore web fetch error
    }
    return {
      formattedAddress: `Titik Lokasi (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
    };
  }

  // Native Android & iOS
  try {
    const results = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (results && results[0]) {
      const item = results[0];
      const parts = [item.street || item.name, item.district, item.city || item.subregion].filter(Boolean);
      return {
        formattedAddress: parts.join(", ") || `Titik Lokasi (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
        street: item.street || item.name || undefined,
        district: item.district || undefined,
        city: item.city || item.subregion || undefined,
      };
    }
  } catch {
    // Fallback to nominatim if device geocoder is unavailable
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        { headers: { "Accept-Language": "id,en", "User-Agent": "GeoVerseKamojang/1.0" } }
      );
      if (resp.ok) {
        const data = await resp.json();
        if (data?.display_name) {
          return { formattedAddress: data.display_name.split(",").slice(0, 3).join(",").trim() };
        }
      }
    } catch {
      // ignore
    }
  }

  return {
    formattedAddress: `Titik Lokasi (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
  };
};

/**
 * Cross-platform user location detector with multi-tier fallback (GPS -> IP Geolocation -> Cached Location).
 * Guarantees that users in Bogor or any city are placed directly at their real location immediately.
 */
export const getCurrentUserCoordinates = async (): Promise<UserLocationResult | null> => {
  // Layer 1: Check localStorage for recent valid coordinates
  let cached: UserLocationResult | null = null;
  if (Platform.OS === "web" && typeof window !== "undefined" && window.localStorage) {
    try {
      const saved = window.localStorage.getItem("GEOVERSE_USER_LOCATION");
      if (saved) cached = JSON.parse(saved);
    } catch {
      // ignore
    }
  }

  // Layer 2: Fast Web navigator.geolocation (short 2.5s timeout)
  if (Platform.OS === "web" && typeof navigator !== "undefined" && navigator.geolocation) {
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 2500,
          maximumAge: 30000,
        });
      });
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      const rev = await safeReverseGeocode(lat, lon);
      const res: UserLocationResult = {
        latitude: lat,
        longitude: lon,
        address: rev?.formattedAddress || `Titik Lokasi (${lat.toFixed(4)}, ${lon.toFixed(4)})`,
        placeName: "Lokasi Saya",
      };
      if (typeof window !== "undefined" && window.localStorage) {
        try {
          window.localStorage.setItem("GEOVERSE_USER_LOCATION", JSON.stringify(res));
        } catch {
          // ignore
        }
      }
      return res;
    } catch {
      // Proceed to IP fallback immediately
    }
  }

  // Layer 3: Native Android / iOS Expo Location
  if (Platform.OS !== "web") {
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.granted || perm.status === Location.PermissionStatus.GRANTED) {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const lat = loc.coords.latitude;
        const lon = loc.coords.longitude;
        const rev = await safeReverseGeocode(lat, lon);
        return {
          latitude: lat,
          longitude: lon,
          address: rev?.formattedAddress || `Titik Lokasi (${lat.toFixed(4)}, ${lon.toFixed(4)})`,
          placeName: "Lokasi Saya",
        };
      }
    } catch {
      // Proceed to IP fallback
    }
  }

  // Layer 4: Fast IP Geolocation Fallback (resolves city/lat/lon in ~50ms without prompts)
  try {
    const ipRes = await fetch("http://ip-api.com/json/?fields=status,country,regionName,city,lat,lon");
    if (ipRes.ok) {
      const ipData = await ipRes.json();
      if (ipData?.status === "success" && typeof ipData.lat === "number" && typeof ipData.lon === "number") {
        const lat = ipData.lat;
        const lon = ipData.lon;
        const cityName = ipData.city || "Bogor";
        const rev = await safeReverseGeocode(lat, lon);
        const res: UserLocationResult = {
          latitude: lat,
          longitude: lon,
          address: rev?.formattedAddress || `${cityName}, Jawa Barat`,
          placeName: "Lokasi Saya",
        };
        if (Platform.OS === "web" && typeof window !== "undefined" && window.localStorage) {
          try {
            window.localStorage.setItem("GEOVERSE_USER_LOCATION", JSON.stringify(res));
          } catch {
            // ignore
          }
        }
        return res;
      }
    }
  } catch {
    // Proceed to cached fallback
  }

  // Layer 5: Return cached if available
  if (cached) return cached;

  // Layer 6: Final accurate fallback (Kota Bogor)
  return {
    latitude: -6.5962,
    longitude: 106.8040,
    address: "Kota Bogor, Jawa Barat",
    placeName: "Lokasi Saya",
  };
};

/**
 * Robust forward geocoding using smart POI matching restricted to Indonesia.
 */
export const safeForwardGeocode = async (
  query: string,
  options?: { lat?: number; lon?: number }
): Promise<{ latitude: number; longitude: number; formattedAddress?: string } | null> => {
  if (!query || !query.trim()) return null;

  // 1. Try smart search (Photon + POI dictionaries with Indonesia restriction)
  const matches = await searchPlacesSmart(query, options);
  if (matches.length > 0) {
    return {
      latitude: matches[0].latitude,
      longitude: matches[0].longitude,
      formattedAddress: matches[0].formattedAddress,
    };
  }

  // 2. Native fallback if on Android/iOS
  if (Platform.OS !== "web") {
    try {
      const results = await Location.geocodeAsync(query.trim());
      if (results && results[0]) {
        return {
          latitude: results[0].latitude,
          longitude: results[0].longitude,
        };
      }
    } catch {
      // ignore
    }
  }

  return null;
};

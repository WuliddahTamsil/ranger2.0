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
}

/**
 * Normalizes colloquial search queries (e.g., "mcd lodaya" -> "McDonald's Lodaya", "sv ipb" -> "Sekolah Vokasi IPB")
 */
export const normalizeSearchQuery = (raw: string): string[] => {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  const lower = trimmed.toLowerCase();
  const variants: string[] = [trimmed];

  // Common Indonesian POI Abbreviations
  const replacements: [RegExp, string][] = [
    [/\bmcd\b/g, "McDonald's"],
    [/\bmcdonalds\b/g, "McDonald's"],
    [/\bmcdonald\b/g, "McDonald's"],
    [/\bindomart\b/g, "Indomaret"],
    [/\balfamart\b/g, "Alfamart"],
    [/\bspbu\b/g, "SPBU"],
    [/\bpom bensin\b/g, "SPBU"],
    [/\brsud\b/g, "RSUD"],
    [/\brs\b/g, "Rumah Sakit"],
    [/\bstasiun\b/g, "Stasiun"],
    [/\bst\b/g, "Stasiun"],
    [/\bsv ipb\b/g, "Sekolah Vokasi IPB"],
    [/\bvokasi ipb\b/g, "Sekolah Vokasi IPB"],
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
 * Smart place search with fuzzy matching, typo tolerance, and POI recognition (Google Maps / Gojek style).
 * Powered by Photon (Komoot / OSM Elasticsearch) with Nominatim fallback.
 */
export const searchPlacesSmart = async (
  query: string,
  options?: { lat?: number; lon?: number; limit?: number }
): Promise<PlaceSuggestion[]> => {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  const limit = options?.limit || 6;
  const biasLat = options?.lat;
  const biasLon = options?.lon;

  const queryVariants = normalizeSearchQuery(trimmed);
  const results: PlaceSuggestion[] = [];
  const seenKeys = new Set<string>();

  for (const q of queryVariants) {
    if (results.length >= limit) break;

    // 1. Try Photon Komoot API (Fast, fuzzy, knows POIs like "MCD Lodaya", "Mie Gacoan", "Botani Square")
    try {
      let photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=${limit}`;
      if (biasLat != null && biasLon != null) {
        photonUrl += `&lat=${biasLat}&lon=${biasLon}`;
      }

      const resp = await fetch(photonUrl, {
        headers: { "Accept-Language": "id,en" },
      });

      if (resp.ok) {
        const data = await resp.json();
        const features = data?.features || [];

        for (const feat of features) {
          const props = feat.properties || {};
          const coords = feat.geometry?.coordinates;
          if (!coords || coords.length < 2) continue;

          const lon = Number(coords[0]);
          const lat = Number(coords[1]);
          const coordKey = `${lat.toFixed(4)},${lon.toFixed(4)}`;

          if (seenKeys.has(coordKey)) continue;
          seenKeys.add(coordKey);

          const name = props.name || props.street || q;
          const parts = [
            props.street && props.street !== name ? props.street : "",
            props.locality,
            props.district,
            props.city || props.county,
            props.state,
          ].filter(Boolean);

          const subtitle = parts.slice(0, 3).join(", ") || props.country || "";
          const formattedAddress = [name, subtitle].filter(Boolean).join(", ");

          results.push({
            id: `photon-${props.osm_id || Math.random()}`,
            name,
            subtitle,
            formattedAddress,
            latitude: lat,
            longitude: lon,
            category: props.osm_value || props.osm_key,
          });

          if (results.length >= limit) break;
        }
      }
    } catch (e) {
      // ignore photon error
    }

    if (results.length >= limit) break;
  }

  // 2. Fallback to Nominatim if no results from Photon
  if (results.length === 0) {
    try {
      let nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        trimmed
      )}&countrycodes=id&limit=${limit}&addressdetails=1`;
      if (biasLat != null && biasLon != null) {
        nomUrl += `&viewbox=${biasLon - 0.5},${biasLat + 0.5},${biasLon + 0.5},${biasLat - 0.5}`;
      }

      const resp = await fetch(nomUrl, {
        headers: { "Accept-Language": "id,en" },
      });

      if (resp.ok) {
        const list = await resp.json();
        for (const item of list) {
          const lat = parseFloat(item.lat);
          const lon = parseFloat(item.lon);
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

          const subtitle = parts.join(", ");
          results.push({
            id: `nom-${item.place_id || Math.random()}`,
            name,
            subtitle,
            formattedAddress: item.display_name,
            latitude: lat,
            longitude: lon,
          });
        }
      }
    } catch {
      // ignore nominatim error
    }
  }

  return results;
};

/**
 * Robust reverse geocoding supporting both Native and Web
 */
export const safeReverseGeocode = async (
  latitude: number,
  longitude: number
): Promise<GeocodedAddress | null> => {
  if (Platform.OS === "web") {
    try {
      const resp = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
        { headers: { "Accept-Language": "id,en" } }
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
    // ignore
  }

  return {
    formattedAddress: `Titik Lokasi (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`,
  };
};

/**
 * Robust forward geocoding using smart POI matching
 */
export const safeForwardGeocode = async (
  query: string,
  options?: { lat?: number; lon?: number }
): Promise<{ latitude: number; longitude: number; formattedAddress?: string } | null> => {
  if (!query || !query.trim()) return null;

  // 1. Try smart search (Photon + POI dictionaries)
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

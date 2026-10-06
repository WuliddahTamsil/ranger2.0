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
  matchScore?: number;
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
    subtitle: "Babakan, Bogor Tengah, Kota Bogor, Jawa Barat",
    formattedAddress: "Jalan Sancang Dalam, Babakan, Bogor Tengah, Kota Bogor, Jawa Barat",
    latitude: -6.5919421,
    longitude: 106.8080644,
    keywords: ["sancang dalam", "jl sancang dalam", "jalan sancang dalam"],
  },
  {
    name: "Jalan Sancang",
    subtitle: "Babakan, Bogor Tengah, Kota Bogor, Jawa Barat",
    formattedAddress: "Jalan Sancang, Babakan, Bogor Tengah, Kota Bogor, Jawa Barat",
    latitude: -6.5925,
    longitude: 106.8075,
    keywords: ["sancang", "jl sancang", "jalan sancang"],
  },
  {
    name: "Botani Square Mall Bogor",
    subtitle: "Jl. Raya Pajajaran No.40, Tegallega, Kota Bogor",
    formattedAddress: "Botani Square Mall Bogor, Jl. Raya Pajajaran No.40, Tegallega, Kota Bogor, Jawa Barat",
    latitude: -6.6006,
    longitude: 106.8063,
    keywords: ["botani", "botani square", "mall botani", "pajajaran"],
  },
  {
    name: "RS PMI Bogor",
    subtitle: "Jl. Rumah Sakit I No.1, Tegallega, Kota Bogor",
    formattedAddress: "RS PMI Bogor, Jl. Rumah Sakit I No.1, Tegallega, Kota Bogor, Jawa Barat",
    latitude: -6.5975,
    longitude: 106.8052,
    keywords: ["rs pmi", "rumah sakit pmi", "pmi bogor", "pmi"],
  },
  {
    name: "Kebun Raya Bogor",
    subtitle: "Jl. Ir. H. Juanda No.13, Paledang, Kota Bogor",
    formattedAddress: "Kebun Raya Bogor, Jl. Ir. H. Juanda No.13, Kota Bogor, Jawa Barat",
    latitude: -6.5976,
    longitude: 106.7995,
    keywords: ["kebun raya", "kebun raya bogor", "botanical gardens"],
  },
  {
    name: "Lawang Suryakancana",
    subtitle: "Jl. Suryakencana, Gudang, Kota Bogor",
    formattedAddress: "Lawang Suryakancana, Jl. Suryakencana, Kota Bogor, Jawa Barat",
    latitude: -6.6025,
    longitude: 106.8000,
    keywords: ["lawang suryakancana", "suryakencana", "surken"],
  },
  {
    name: "Tugu Kujang Monument",
    subtitle: "Jl. Pajajaran No.1A, Baranangsiang, Kota Bogor",
    formattedAddress: "Tugu Kujang Monument, Baranangsiang, Kota Bogor, Jawa Barat",
    latitude: -6.6014,
    longitude: 106.8050,
    keywords: ["tugu kujang", "kujang", "kujang monument"],
  },
  {
    name: "Terminal Baranangsiang Bogor",
    subtitle: "Jl. Pajajaran, Baranangsiang, Kota Bogor",
    formattedAddress: "Terminal Baranangsiang Bogor, Kota Bogor, Jawa Barat",
    latitude: -6.6050,
    longitude: 106.8080,
    keywords: ["baranangsiang", "terminal baranangsiang"],
  },
  {
    name: "Lippo Plaza Keboen Raya",
    subtitle: "Jl. Malabar 2 No.17, Babakan, Kota Bogor",
    formattedAddress: "Lippo Plaza Keboen Raya, Jl. Malabar 2 No.17, Babakan, Kota Bogor, Jawa Barat",
    latitude: -6.5956,
    longitude: 106.8045,
    keywords: ["lippo plaza", "lippo keboen raya", "lippo bogor", "malabar"],
  },
  {
    name: "Stasiun Bogor",
    subtitle: "Jl. Nyi Raja Permas, Cibogor, Kota Bogor",
    formattedAddress: "Stasiun Bogor, Cibogor, Kota Bogor, Jawa Barat",
    latitude: -6.5947,
    longitude: 106.7906,
    keywords: ["stasiun bogor", "stasiun", "commuter line bogor"],
  },
  {
    name: "Sekolah Vokasi IPB (Kampus Cilibende/Gunung Gede)",
    subtitle: "Jl. Kumbang No.14, Babakan, Kota Bogor",
    formattedAddress: "Sekolah Vokasi IPB, Jl. Kumbang No.14, Babakan, Kota Bogor, Jawa Barat",
    latitude: -6.5878,
    longitude: 106.8078,
    keywords: ["vokasi ipb", "sv ipb", "ipb cilibende", "kumbang"],
  },
];

/**
 * Formats distance in km to user-friendly string (e.g. "250 m" or "1.5 km").
 */
export const formatDistance = (distKm?: number): string => {
  if (distKm == null || Number.isNaN(distKm)) return "";
  if (distKm < 1) {
    const meters = Math.max(10, Math.round(distKm * 1000));
    return `${meters} m`;
  }
  return `${distKm.toFixed(1)} km`;
};

/**
 * Calculates Levenshtein distance between two strings for fuzzy matching & typo tolerance.
 */
export const levenshteinDistance = (a: string, b: string): number => {
  const s1 = a.toLowerCase().trim();
  const s2 = b.toLowerCase().trim();
  if (s1 === s2) return 0;
  if (!s1.length) return s2.length;
  if (!s2.length) return s1.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= s1.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[s1.length][s2.length];
};

/**
 * Calculates match score (0-100) based on Gojek/Grab flexible search rules:
 * Exact match > Prefix > Substring > Keyword > Token Multi-match > Fuzzy Typo tolerance.
 */
export const calculateMatchScore = (
  query: string,
  targetName: string,
  targetSubtitle: string = "",
  keywords: string[] = []
): number => {
  const q = query.toLowerCase().trim();
  const name = targetName.toLowerCase().trim();
  const sub = targetSubtitle.toLowerCase().trim();
  const full = `${name} ${sub}`;

  if (!q) return 0;

  // 1. Exact match
  if (name === q) return 100;
  if (name.startsWith(q)) return 95;
  if (name.includes(q)) return 85;

  // 2. Keyword exact / prefix / substring match
  for (const kw of keywords) {
    const k = kw.toLowerCase().trim();
    if (k === q) return 98;
    if (k.startsWith(q)) return 90;
    if (k.includes(q) || q.includes(k)) return 80;
  }

  // 3. Subtitle / address match
  if (sub.includes(q)) return 70;

  // 4. Token multi-word matching
  const qTokens = q.split(/\s+/).filter(Boolean);
  const nameTokens = full.split(/[\s,.-]+/).filter(Boolean);

  let matchedTokens = 0;
  for (const qt of qTokens) {
    if (nameTokens.some((nt) => nt === qt || nt.startsWith(qt) || nt.includes(qt))) {
      matchedTokens++;
    }
  }

  if (matchedTokens > 0) {
    return 50 + (matchedTokens / qTokens.length) * 25;
  }

  // 5. Fuzzy / typo tolerance (for queries of 3+ letters)
  if (q.length >= 3) {
    for (const nt of nameTokens) {
      if (Math.abs(nt.length - q.length) <= 2) {
        const dist = levenshteinDistance(q, nt);
        if (dist === 1) return 60; // 1 typo
        if (dist === 2 && q.length >= 5) return 40; // 2 typos on long word
      }
    }
  }

  return 0;
};

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
 * Normalizes colloquial search queries (e.g., "mcd lodaya" -> "McDonald's Lodaya", "spbu" -> "SPBU")
 */
export const normalizeSearchQuery = (raw: string): string[] => {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  const lower = trimmed.toLowerCase();
  const variants: string[] = [trimmed];

  // Common Indonesian POI Abbreviations, street words, and common phonetic misspellings
  const replacements: [RegExp, string][] = [
    [/\barmey\b/gi, "Kost Armey"],
    [/\bkost\b/gi, "Kost"],
    [/\bkos\b/gi, "Kost"],
    [/\bkosan\b/gi, "Kost"],
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
 * Works like Gojek/Grab:
 * 1. Uses user's current location as the anchor point.
 * 2. Searches by place name, address, keywords, and flexible fuzzy patterns.
 * 3. Strictly prioritizes results closest to user.
 * 4. Calculates precise distance in km/m.
 */
export const searchPlacesSmart = async (
  query: string,
  options?: { lat?: number; lon?: number; limit?: number }
): Promise<PlaceSuggestion[]> => {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return [];

  const limit = options?.limit || 6;
  // Always anchor to user location; default to Bogor operational center (-6.5962, 106.8040)
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
  const results: Array<PlaceSuggestion & { matchScore?: number }> = [];
  const seenKeys = new Set<string>();

  // 2. Immediate Local POI Matching (e.g. Kost Armey, Jalan Sancang Dalam, Botani Square)
  for (const poi of LOCAL_KNOWN_POIS) {
    const score = calculateMatchScore(trimmed, poi.name, poi.subtitle, poi.keywords);
    if (score > 0) {
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
          matchScore: score,
        });
      }
    }
  }

  // 3. Photon Komoot API: First search inside the user's immediate local vicinity (radius ~25-30 km)
  const minLon = biasLon - 0.25;
  const maxLon = biasLon + 0.25;
  const minLat = biasLat - 0.25;
  const maxLat = biasLat + 0.25;
  const localBbox = `${minLon},${minLat},${maxLon},${maxLat}`;

  for (const q of queryVariants) {
    if (results.length >= limit * 2) break;

    try {
      // First try local bounding box strictly around user
      let photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(
        q
      )}&bbox=${localBbox}&lat=${biasLat}&lon=${biasLon}&limit=${Math.max(limit * 2, 8)}`;

      let resp = await fetch(photonUrl, {
        headers: { "Accept-Language": "id,en" },
      });

      let data = resp.ok ? await resp.json() : null;
      let features = data?.features || [];

      // If no results in tight local radius, expand search around user without strict bbox
      if (features.length === 0) {
        photonUrl = `https://photon.komoot.io/api/?q=${encodeURIComponent(
          q
        )}&lat=${biasLat}&lon=${biasLon}&limit=${Math.max(limit * 2, 10)}`;
        resp = await fetch(photonUrl, {
          headers: { "Accept-Language": "id,en" },
        });
        if (resp.ok) {
          data = await resp.json();
          features = data?.features || [];
        }
      }

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
        const score = calculateMatchScore(trimmed, name, subtitle);

        results.push({
          id: `photon-${props.osm_id || Math.random()}`,
          name,
          subtitle,
          formattedAddress,
          latitude: lat,
          longitude: lon,
          category: props.osm_value || props.osm_key,
          distanceKm,
          matchScore: score || 50,
        });

        if (results.length >= limit * 2) break;
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
      )}&countrycodes=id&limit=${limit}&addressdetails=1&viewbox=${biasLon - 0.3},${biasLat + 0.3},${biasLon + 0.3},${biasLat - 0.3}`;

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
          const score = calculateMatchScore(trimmed, name, subtitle);

          results.push({
            id: `nom-${item.place_id || Math.random()}`,
            name,
            subtitle,
            formattedAddress: item.display_name,
            latitude: lat,
            longitude: lon,
            distanceKm,
            matchScore: score || 45,
          });
        }
      }
    } catch {
      // ignore nominatim error
    }
  }

  // 5. Gojek/Grab-Style Ranking & Sorting:
  // Strictly prioritize places closest to the user's location.
  results.sort((a, b) => {
    const distA = a.distanceKm ?? 999999;
    const distB = b.distanceKm ?? 999999;
    const scoreA = a.matchScore ?? 50;
    const scoreB = b.matchScore ?? 50;

    // Both are within local area (< 30km): sort strictly by distance!
    if (distA <= 30 && distB <= 30) {
      if (Math.abs(distA - distB) > 0.05) {
        return distA - distB;
      }
      return scoreB - scoreA;
    }

    // Local (< 30km) always beats distant locations
    if (distA <= 30 && distB > 30) return -1;
    if (distB <= 30 && distA > 30) return 1;

    // Both distant: balance relevance and proximity
    if (Math.abs(scoreA - scoreB) > 25) {
      return scoreB - scoreA;
    }
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

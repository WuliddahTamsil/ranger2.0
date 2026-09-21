export interface RouteCoordinate {
  latitude: number;
  longitude: number;
}

export interface RideRoute {
  coordinates: RouteCoordinate[];
  distanceKm: number;
  durationMinutes: number;
}

const OSRM_DRIVING_URL = "https://router.project-osrm.org/route/v1/driving";
const ROUTING_TIMEOUT_MS = 15_000;

export const fetchDrivingRoute = async (
  pickup: RouteCoordinate,
  destination: RouteCoordinate,
): Promise<RideRoute> => {
  const coordinates: RouteCoordinate[] = [pickup, destination];
  const isValidCoordinate = (point: RouteCoordinate) =>
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    point.latitude >= -90 &&
    point.latitude <= 90 &&
    point.longitude >= -180 &&
    point.longitude <= 180;
  if (coordinates.some((point) => !isValidCoordinate(point))) {
    throw new Error("Koordinat perjalanan belum valid.");
  }
  if (pickup.latitude === destination.latitude && pickup.longitude === destination.longitude) {
    throw new Error("Lokasi pickup dan tujuan tidak boleh sama.");
  }
  const coordinatePath = coordinates.map((point) => `${point.longitude},${point.latitude}`).join(";");
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ROUTING_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(`${OSRM_DRIVING_URL}/${coordinatePath}?overview=full&geometries=geojson&steps=false`, {
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Routing timeout. Silakan coba lagi.");
    }
    throw new Error("Routing gagal. Periksa koneksi internet.");
  } finally {
    clearTimeout(timeoutId);
  }
  if (!response.ok) {
    throw new Error(`Routing gagal (HTTP ${response.status}).`);
  }

  const payload = await response.json();
  const firstRoute = payload?.routes?.[0];
  const geometry = firstRoute?.geometry?.coordinates;
  const distanceMeters = Number(firstRoute?.distance);
  const durationSeconds = Number(firstRoute?.duration);
  if (
    payload?.code !== "Ok" ||
    !firstRoute ||
    !Array.isArray(geometry) ||
    geometry.length < 2 ||
    !Number.isFinite(distanceMeters) ||
    distanceMeters <= 0 ||
    !Number.isFinite(durationSeconds) ||
    durationSeconds <= 0
  ) {
    throw new Error("Rute jalan tidak ditemukan untuk kedua lokasi tersebut.");
  }

  const routeCoordinates = geometry.map((point: unknown) => {
    if (!Array.isArray(point) || point.length < 2) {
      throw new Error("Data geometri rute tidak valid.");
    }
    const longitude = Number(point[0]);
    const latitude = Number(point[1]);
    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      throw new Error("Data geometri rute tidak valid.");
    }
    return { latitude, longitude };
  });

  return {
    coordinates: routeCoordinates,
    distanceKm: Math.round((distanceMeters / 1000) * 10) / 10,
    durationMinutes: Math.max(1, Math.round(durationSeconds / 60)),
  };
};

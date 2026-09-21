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

export const fetchDrivingRoute = async (
  pickup: RouteCoordinate,
  destination: RouteCoordinate,
): Promise<RideRoute> => {
  const coordinates = [pickup, destination];
  if (coordinates.some((point) => !Number.isFinite(point.latitude) || !Number.isFinite(point.longitude))) {
    throw new Error("Koordinat perjalanan belum valid.");
  }

  const coordinatePath = coordinates.map((point) => `${point.longitude},${point.latitude}`).join(";");
  const response = await fetch(`${OSRM_DRIVING_URL}/${coordinatePath}?overview=full&geometries=geojson&steps=false`);
  if (!response.ok) {
    throw new Error(`Routing gagal (HTTP ${response.status}).`);
  }

  const payload = await response.json();
  const firstRoute = payload?.routes?.[0];
  const geometry = firstRoute?.geometry?.coordinates;
  if (payload?.code !== "Ok" || !firstRoute || !Array.isArray(geometry) || geometry.length < 2) {
    throw new Error("Rute jalan tidak ditemukan untuk kedua lokasi tersebut.");
  }

  return {
    coordinates: geometry.map(([longitude, latitude]: [number, number]) => ({ latitude, longitude })),
    distanceKm: Math.round((Number(firstRoute.distance) / 1000) * 10) / 10,
    durationMinutes: Math.max(1, Math.round(Number(firstRoute.duration) / 60)),
  };
};

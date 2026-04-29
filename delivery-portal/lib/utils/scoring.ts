import { haversineMeters } from "./distance";

export interface ProximityScore {
  total: number;
  distanceMeters: number;
}

/**
 * Mock-side proximity scorer. The real workflow lives in the worker and
 * ranks identically — this helper is only used when the frontend is in
 * `mock` API mode.
 */
export function scoreByProximity(
  riderLatLng: { latitude: number; longitude: number },
  pickupLatLng: { latitude: number; longitude: number },
  proximityRadiusMeters: number,
): ProximityScore {
  const distanceMeters = haversineMeters(riderLatLng, pickupLatLng);
  const total = Math.max(0, 1 - distanceMeters / proximityRadiusMeters);
  return { total, distanceMeters };
}

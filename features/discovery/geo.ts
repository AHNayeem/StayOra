/**
 * Deterministic geo layer for map discovery and "near me".
 *
 * Catalogue listings carry a `GeoLocation` label but no coordinates — a real
 * platform would geocode at ingest. Rather than add a paid geocoding/map
 * dependency, this module derives a *stable* coordinate for every listing:
 * a lookup of the destination pool the mock factory draws from, plus a small
 * hash-seeded jitter so co-located listings don't stack on one pin. Same
 * listing id in, same point out — on the server and in the browser, forever.
 *
 * Swap `coordsFor` for the real `listing.location.lat/lng` when the catalogue
 * carries coordinates; nothing else in the map/near-me stack changes.
 */

import type { GeoLocation } from "@/types/booking";
import { hashString } from "@/lib/random";

export interface LatLng {
  lat: number;
  lng: number;
}

/** A resolved search origin — user-provided, geolocated, or the demo fallback. */
export interface GeoOrigin extends LatLng {
  label: string;
}

/** City → [lat, lng] for every destination the catalogue can produce. */
const CITY_COORDS: Record<string, [number, number]> = {
  paris: [48.8566, 2.3522],
  nice: [43.7102, 7.262],
  barcelona: [41.3874, 2.1686],
  madrid: [40.4168, -3.7038],
  ibiza: [38.9067, 1.4206],
  lisbon: [38.7223, -9.1393],
  porto: [41.1579, -8.6291],
  rome: [41.9028, 12.4964],
  florence: [43.7696, 11.2558],
  venice: [45.4408, 12.3155],
  tuscany: [43.4638, 11.8797],
  santorini: [36.3932, 25.4615],
  athens: [37.9838, 23.7275],
  london: [51.5074, -0.1278],
  amsterdam: [52.3676, 4.9041],
  vienna: [48.2082, 16.3738],
  zurich: [47.3769, 8.5417],
  split: [43.5081, 16.4402],
  istanbul: [41.0082, 28.9784],
  cappadocia: [38.6431, 34.8289],
  dubai: [25.2048, 55.2708],
  "abu dhabi": [24.4539, 54.3773],
  doha: [25.2854, 51.531],
  cairo: [30.0444, 31.2357],
  marrakech: [31.6295, -7.9811],
  "cape town": [-33.9249, 18.4241],
  nairobi: [-1.2921, 36.8219],
  dhaka: [23.8103, 90.4125],
  "cox's bazar": [21.4272, 92.0058],
  "new delhi": [28.6139, 77.209],
  jaipur: [26.9124, 75.7873],
  "malé": [4.1755, 73.5093],
  male: [4.1755, 73.5093],
  colombo: [6.9271, 79.8612],
  bangkok: [13.7563, 100.5018],
  phuket: [7.8804, 98.3923],
  bali: [-8.4095, 115.1889],
  ubud: [-8.5069, 115.2625],
  singapore: [1.3521, 103.8198],
  "kuala lumpur": [3.139, 101.6869],
  hanoi: [21.0285, 105.8542],
  tokyo: [35.6762, 139.6503],
  kyoto: [35.0116, 135.7681],
  seoul: [37.5665, 126.978],
  sydney: [-33.8688, 151.2093],
  auckland: [-36.8485, 174.7633],
  "new york": [40.7128, -74.006],
  "san francisco": [37.7749, -122.4194],
  toronto: [43.6532, -79.3832],
  "rio de janeiro": [-22.9068, -43.1729],
  "buenos aires": [-34.6037, -58.3816],
  patagonia: [-50.3379, -72.2647],
};

/** Country → centroid, used when the city is unknown (e.g. "United States"). */
const COUNTRY_COORDS: Record<string, [number, number]> = {
  france: [46.6, 2.2],
  spain: [40.4, -3.7],
  portugal: [39.4, -8.2],
  italy: [41.9, 12.5],
  greece: [39.0, 22.0],
  croatia: [45.1, 15.2],
  "united kingdom": [54.0, -2.0],
  uk: [54.0, -2.0],
  netherlands: [52.1, 5.3],
  austria: [47.5, 14.5],
  switzerland: [46.8, 8.2],
  "türkiye": [39.0, 35.0],
  turkiye: [39.0, 35.0],
  "united arab emirates": [24.0, 54.0],
  uae: [24.0, 54.0],
  qatar: [25.3, 51.2],
  egypt: [26.8, 30.8],
  morocco: [31.8, -7.1],
  "south africa": [-30.6, 22.9],
  kenya: [-0.02, 37.9],
  bangladesh: [23.7, 90.4],
  india: [20.6, 79.0],
  maldives: [3.2, 73.2],
  "sri lanka": [7.9, 80.8],
  thailand: [15.9, 100.99],
  indonesia: [-2.5, 118.0],
  singapore: [1.35, 103.8],
  malaysia: [4.2, 101.98],
  vietnam: [14.06, 108.28],
  japan: [36.2, 138.25],
  "south korea": [35.9, 127.77],
  australia: [-25.3, 133.8],
  "new zealand": [-40.9, 174.9],
  "united states": [39.8, -98.6],
  canada: [56.1, -106.3],
  brazil: [-14.2, -51.9],
  argentina: [-38.4, -63.6],
  chile: [-35.7, -71.5],
  europe: [50.0, 10.0],
};

/** Named origins offered by the "near me" control when geolocation can't be used. */
export const DEMO_ORIGINS: GeoOrigin[] = [
  { label: "Paris, France", lat: 48.8566, lng: 2.3522 },
  { label: "London, United Kingdom", lat: 51.5074, lng: -0.1278 },
  { label: "Dubai, United Arab Emirates", lat: 25.2048, lng: 55.2708 },
  { label: "Bangkok, Thailand", lat: 13.7563, lng: 100.5018 },
  { label: "Dhaka, Bangladesh", lat: 23.8103, lng: 90.4125 },
  { label: "New York, United States", lat: 40.7128, lng: -74.006 },
];

/** Where "near me" lands when the browser can't (or won't) tell us. */
export const DEMO_ORIGIN: GeoOrigin = DEMO_ORIGINS[0];

/** Radius presets for approximate location filtering, in kilometres. */
export const RADIUS_OPTIONS = [10, 25, 50, 150, 500, 2000] as const;
export const DEFAULT_RADIUS_KM = 50;

function lookup(location: GeoLocation): [number, number] | undefined {
  const city = location.city?.trim().toLowerCase();
  if (city && CITY_COORDS[city]) return CITY_COORDS[city];

  // The label is "City, Country" for generated listings and sometimes just a
  // country or region for curated ones — try both halves before giving up.
  const parts = location.label.split(",").map((p) => p.trim().toLowerCase());
  for (const part of parts) {
    if (CITY_COORDS[part]) return CITY_COORDS[part];
  }
  const country = location.country?.trim().toLowerCase();
  if (country && COUNTRY_COORDS[country]) return COUNTRY_COORDS[country];
  for (const part of parts) {
    if (COUNTRY_COORDS[part]) return COUNTRY_COORDS[part];
  }
  return undefined;
}

/** Two stable offsets in roughly ±0.05° (~±5 km), seeded by the listing id. */
function jitter(seed: string): [number, number] {
  const h = hashString(seed);
  const a = ((h & 0xffff) / 0xffff - 0.5) * 0.1;
  const b = (((h >>> 16) & 0xffff) / 0xffff - 0.5) * 0.1;
  return [a, b];
}

/**
 * Cache of resolved points.
 *
 * A map render asks for every visible listing's coordinates three times over —
 * once to project the marker, once for the radius filter, once for the distance
 * label — and the answer can never change for a given id. Caching it turns a
 * few hundred hash + table lookups per interaction into one per listing.
 */
const pointCache = new Map<string, LatLng>();

/**
 * The map point for a catalogue entity. Deterministic: derived only from the
 * location label and the entity id, never from the clock or a random source.
 */
export function coordsFor(entity: { id: string; location: GeoLocation }): LatLng {
  const cached = pointCache.get(entity.id);
  if (cached) return cached;
  const point = computeCoords(entity);
  pointCache.set(entity.id, point);
  return point;
}

function computeCoords(entity: { id: string; location: GeoLocation }): LatLng {
  const base = lookup(entity.location);
  const [dLat, dLng] = jitter(entity.id);
  if (!base) {
    // Unknown place — spread it deterministically over the inhabited band so it
    // still appears on the map rather than vanishing at (0, 0).
    const h = hashString(entity.id);
    return {
      lat: ((h % 12_000) / 100 - 45) + dLat,
      lng: (((h >>> 12) % 34_000) / 100 - 170) + dLng,
    };
  }
  return { lat: base[0] + dLat, lng: base[1] + dLng };
}

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance between two points, in kilometres. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** "820 m" / "12 km" / "1,240 km" — a distance a human reads at a glance. */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km).toLocaleString()} km`;
}

/** Nearest known destination to a point — used to name a geolocated origin. */
export function nearestPlace(point: LatLng): string {
  let best: { label: string; km: number } | null = null;
  for (const [name, [lat, lng]] of Object.entries(CITY_COORDS)) {
    const km = haversineKm(point, { lat, lng });
    if (!best || km < best.km) {
      best = { label: name.replace(/(^|\s|')\w/g, (c) => c.toUpperCase()), km };
    }
  }
  if (!best) return "your location";
  return best.km < 60 ? best.label : "your location";
}

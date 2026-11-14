// Approximate centre of each parish. Used to group reports by parish and to jump the map.
export const PARISHES = [
  { name: "Kingston", latitude: 17.975, longitude: -76.79 },
  { name: "St. Andrew", latitude: 18.07, longitude: -76.77 },
  { name: "St. Thomas", latitude: 17.95, longitude: -76.45 },
  { name: "Portland", latitude: 18.12, longitude: -76.5 },
  { name: "St. Mary", latitude: 18.32, longitude: -76.9 },
  { name: "St. Ann", latitude: 18.35, longitude: -77.25 },
  { name: "Trelawny", latitude: 18.35, longitude: -77.62 },
  { name: "St. James", latitude: 18.43, longitude: -77.85 },
  { name: "Hanover", latitude: 18.4, longitude: -78.13 },
  { name: "Westmoreland", latitude: 18.25, longitude: -78.15 },
  { name: "St. Elizabeth", latitude: 18.05, longitude: -77.75 },
  { name: "Manchester", latitude: 18.05, longitude: -77.5 },
  { name: "Clarendon", latitude: 17.95, longitude: -77.25 },
  { name: "St. Catherine", latitude: 18.03, longitude: -77.0 },
];

export const hasCoords = (p) => typeof p?.latitude === "number" && typeof p?.longitude === "number";

export function distanceKm(a, b) {
  if (!hasCoords(a) || !hasCoords(b)) return Infinity;
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatKm(km) {
  if (!isFinite(km)) return "";
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

// Matches a geocoder region such as "Saint Catherine Parish" to one of our names
export function parishFromText(text) {
  if (!text) return null;
  const t = text.toLowerCase().replace("saint", "st.").replace("st ", "st. ");
  return PARISHES.find((p) => t.includes(p.name.toLowerCase()))?.name || null;
}

// Closest parish centre — approximate, used when a report has no parish stored
export function nearestParish(point) {
  if (!hasCoords(point)) return null;
  let best = null;
  let bestD = Infinity;
  for (const p of PARISHES) {
    const d = distanceKm(point, p);
    if (d < bestD) {
      bestD = d;
      best = p.name;
    }
  }
  return best;
}

export const reportParish = (r) => r.parish || nearestParish(r);
export const parishCentre = (name) => PARISHES.find((p) => p.name === name) || null;

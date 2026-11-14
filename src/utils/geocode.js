import * as Location from "expo-location";

export async function getAddressFromCoords(latitude, longitude) {
  try {
    const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (geocode && geocode.length > 0) {
      const g = geocode[0];
      const street = [g.name, g.street].filter(Boolean).join(" ");
      const areaParts = [g.district, g.city, g.region].filter(Boolean);
      const area = areaParts.join(", ");
      return {
        street: street || area || "Unknown Location",
        area: g.city || g.district || g.region || "My Location",
        community: area || "Unknown Area",
      };
    }
  } catch (e) {
    console.log("Geocode error:", e);
  }
  return { street: "Unknown Street", area: "My Location", community: "Unknown Area" };
}

// Asks for permission and returns { latitude, longitude }, or null if denied
export async function getCurrentCoords() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") return null;
  const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  return { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
}

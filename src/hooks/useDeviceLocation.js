import { useCallback, useEffect, useState } from "react";
import { getAddressFromCoords, getCurrentCoords } from "../utils/geocode";
import { nearestParish, parishFromText } from "../utils/geo";

// The phone's position plus a short place name, e.g. { label: "Portmore", parish: "St. Catherine" }
export function useDeviceLocation() {
  const [state, setState] = useState({ status: "loading", coords: null, label: null, street: null, parish: null });

  const refresh = useCallback(async () => {
    try {
      const coords = await getCurrentCoords();
      if (!coords) {
        setState((s) => ({ ...s, status: "denied" }));
        return null;
      }
      const place = await getAddressFromCoords(coords.latitude, coords.longitude);
      const next = {
        status: "ok",
        coords,
        label: place.area,
        street: place.street,
        parish: parishFromText(place.community) || nearestParish(coords),
      };
      setState(next);
      return next;
    } catch (e) {
      console.log("Location error:", e?.message || e);
      setState((s) => ({ ...s, status: "error" }));
      return null;
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { ...state, refresh };
}

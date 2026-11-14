import { C } from "../theme/colors";
import { isResolvedStatus } from "../hooks/useOutageReports";

export function issueLabel(r) {
  if (r.type === "water") {
    if (r.status === "Resolved") return "Water back";
    return r.status === "Low Pressure" ? "Low pressure" : "No water";
  }
  if (r.status === "Restored") return "Power restored";
  return r.status === "Flickering" ? "Flickering power" : "Power out";
}

// Colours for a report's status: fixed = green, else power orange / water blue
export function toneFor(r) {
  if (isResolvedStatus(r.status)) return { color: C.ok, bg: C.okBg, text: C.okText, block: C.sage };
  if (r.type === "water") return { color: C.water, bg: C.waterBg, text: C.waterText, block: C.slate };
  return { color: C.power, bg: C.powerBg, text: C.powerText, block: C.brown };
}

export const iconFor = (r) => (r.type === "water" ? "water" : "flash");

export const placeName = (r) => r.location && r.location !== r.area ? r.location : r.area || "Unknown place";
